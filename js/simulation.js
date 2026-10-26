/**
 * LUMISYNX v2.0 / LumiSynx - Simulation Coordinator
 * 50Hz Loop coordinating physics, optical coupling, dual-vehicle intelligence,
 * V2V communications, security firewall, and scenario management.
 */

class SimulationCoordinator {
  constructor() {
    this.isRunning = true;
    this.simTime = 0.0;
    this.tickCount = 0;
    this.speedMultiplier = 1.0;

    this.ownX = 120.0;
    this.ownY = 110.0;

    // Environmental parameters
    this.roadType = "Highway";
    this.manualAmbientLux = 0.05;
    this.manualPdVolts = 0.0;
    this.simMode = "sim"; // "manual" or "sim"

    // Sub-systems
    this.weatherModel = new WeatherModel("Clear");
    this.regulationManager = new RegulationManager("India");
    this.trafficManager = new TrafficManager(this.ownX, this.ownY);
    this.sensorManager = new SensorManager();
    this.v2vManager = new V2VManager();

    // Control Core
    this.decisionEngine = new DecisionEngine();
    this.decisionEngine.ownSpeed = 50.0;
    this.comfortModel = new ComfortModel();
    this.predictionEngine = new PredictionEngine(2.0);

    // Utilities
    this.analyticsEngine = new AnalyticsEngine();
    this.calibrationManager = new CalibrationManager();
    this.calibrationManager.loadCalibration(this.decisionEngine, this.comfortModel);

    // Dynamic states
    this.comfortIndex = 100.0;
    this.comfortScores = {};
    this.prevMode = "Cooperative V2V";
    this.prevDuty = 100.0;

    // Event hooks for UI callbacks
    this.onUartLog = null;
    this.onModeChange = null;
    this.onSecurityAlert = null;
  }

  update(dt) {
    this.tickCount++;

    // Guard dt
    const effectiveDt = dt * this.speedMultiplier;
    if (this.simMode === "sim" && this.isRunning) {
      this.simTime += effectiveDt;
      this.trafficManager.updatePhysics(effectiveDt, this.decisionEngine.ownSpeed, 900);
      this.currentPdVolts = this.calculateOpticalCoupling();
    } else {
      this.currentPdVolts = this.manualPdVolts;
    }

    const trackedVehicles = this.trafficManager.getTrackedVehiclesDict();

    // 1. Update V2V Network
    const now = Date.now() / 1000;
    this.v2vManager.updateV2V(trackedVehicles, now, effectiveDt);

    // Process simulated V2V packets from active vehicles
    if (this.v2vManager.v2vEnabled && this.simMode === "sim") {
      for (const [vehId, veh] of Object.entries(trackedVehicles)) {
        if (!veh.v2vEnabled) continue;

        const link = this.v2vManager.linkStates[vehId];
        if (link && (now - link.lastRxTime) > 0.08) {
          const packet = this.v2vManager.packetManager.serializePacket(
            vehId, veh.vehicleType, veh.speed, veh.heading,
            veh.x, veh.y, veh.actualDuty, veh.isEmergency, now
          );
          this.v2vManager.receivePacket(packet, now);
        }
      }
    }

    // 2. Update Sensors
    const sensorData = this.sensorManager.updateSensors(
      this.manualAmbientLux,
      this.currentPdVolts,
      this.weatherModel.current,
      effectiveDt
    );

    // 3. Trajectory Prediction (2.0s)
    let predictions = {};
    if (this.simMode === "sim") {
      predictions = this.predictionEngine.predictAllVehicles(
        trackedVehicles,
        this.ownX,
        this.ownY,
        this.decisionEngine.ownSpeed,
        0.0
      );
    }

    // 4. Update Own Vehicle Decision Engine
    this.decisionEngine.update(
      effectiveDt,
      sensorData.ambientLux,
      sensorData.photodiodeVolts,
      this.decisionEngine.ownSpeed,
      0.0,
      this.ownX,
      this.ownY,
      trackedVehicles,
      predictions,
      this.weatherModel.currentWeatherName,
      this.roadType,
      sensorData.confidence,
      this.v2vManager.v2vConfidence,
      this.regulationManager.current
    );

    // 5. Update Oncoming Vehicles (Req #1: Dual Intelligent Vehicles)
    if (this.simMode === "sim" && this.isRunning) {
      this.trafficManager.updateVehicleControllers(
        effectiveDt,
        this.ownX,
        this.ownY,
        this.decisionEngine.actualDuty,
        this.decisionEngine.ownSpeed,
        sensorData.ambientLux,
        this.weatherModel.current,
        this.weatherModel.currentWeatherName,
        this.roadType,
        this.v2vManager.v2vConfidence,
        this.regulationManager.current
      );
    }

    // 6. Calculate Own Driver Human Comfort Index
    const priorityVeh = this.trafficManager.getPriorityVehicle();
    const distance = priorityVeh ? priorityVeh.distance : 80.0;
    const headingDiff = priorityVeh ? Math.abs(0.0 - priorityVeh.heading) % 360 : 180.0;

    const comfortRes = this.comfortModel.calculateComfortIndex(
      this.decisionEngine.actualDuty,
      this.prevDuty,
      effectiveDt,
      sensorData.ambientLux,
      this.decisionEngine.ownSpeed,
      this.decisionEngine.glareFactor,
      distance,
      headingDiff,
      Boolean(priorityVeh),
      priorityVeh
    );

    this.comfortIndex = Math.max(0.0, comfortRes.comfortIndex - this.weatherModel.current.comfortPenalty);
    this.comfortScores = comfortRes.scores;

    // 7. Update Cumulative Analytics Telemetry
    this.analyticsEngine.updateTelemetry(
      this.decisionEngine.actualDuty,
      sensorData.photodiodeVolts,
      this.comfortIndex,
      this.decisionEngine.activeMode !== "Sensor-Only",
      this.v2vManager.v2vEnabled ? (1.0 - this.v2vManager.v2vConfidence) : 1.0,
      predictions,
      trackedVehicles,
      this.decisionEngine.minBoundary,
      this.decisionEngine.maxBoundary
    );

    // 8. Handle Intelligent Event Logging
    this.handleLogging(distance, priorityVeh);

    this.prevDuty = this.decisionEngine.actualDuty;
  }

  calculateOpticalCoupling() {
    let totalPd = 0.0;
    for (const veh of Object.values(this.trafficManager.vehicles)) {
      if (veh.heading === 180.0 && veh.x >= this.ownX) {
        const distPx = Math.hypot(veh.x - this.ownX, veh.y - this.ownY);
        const distM = distPx / 8.0;

        if (distPx > 0) {
          const cosPhi = (veh.x - this.ownX) / distPx;
          const peerDuty = veh.actualDuty;
          let intensity = (1500.0 * (peerDuty / 100.0) / (distM * distM + 1.0)) * (cosPhi * cosPhi);
          intensity *= (1.0 - this.weatherModel.current.scatteringFactor * 0.7);
          totalPd += intensity;
        }
      }
    }
    return Math.min(3.3, Math.max(0.0, totalPd));
  }

  handleLogging(distance, priorityVeh) {
    const currMode = this.decisionEngine.activeMode;
    if (currMode !== this.prevMode) {
      if (this.onUartLog) {
        this.onUartLog(`[MODE] Transition: Switched from ${this.prevMode} -> ${currMode}`, "mode");
      }
      if (this.onModeChange) this.onModeChange(currMode);
      this.prevMode = currMode;
    }

    // Periodic telemetry log at 2Hz (every 25 ticks)
    if (this.isRunning && this.tickCount % 25 === 0) {
      if (this.onUartLog) {
        const duty = this.decisionEngine.actualDuty;
        const target = priorityVeh ? `${priorityVeh.id} (${distance.toFixed(1)}m)` : "Road Clear";
        this.onUartLog(
          `[STAT] Mode: ${currMode} | Own PWM: ${duty.toFixed(1)}% | Comfort: ${this.comfortIndex.toFixed(1)}% | PD Glare: ${this.currentPdVolts.toFixed(2)}V | Target: ${target}`,
          "stat"
        );
      }
    }
  }

  // ==========================================================================
  // SCENARIO PRESETS
  // ==========================================================================
  loadScenario(scenarioName) {
    switch (scenarioName) {
      case "clear_highway":
        this.roadType = "Highway";
        this.weatherModel.setWeather("Clear");
        this.manualAmbientLux = 0.04;
        this.v2vManager.v2vEnabled = true;
        this.decisionEngine.ownSpeed = 65.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.trafficManager.vehicles["V2V-102"]) {
          this.trafficManager.vehicles["V2V-102"].speed = 60.0;
          this.trafficManager.vehicles["V2V-102"].isEmergency = false;
        }
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Clear Night Highway Cruising", "boot");
        break;

      case "glare_pass":
        this.roadType = "Highway";
        this.weatherModel.setWeather("Clear");
        this.manualAmbientLux = 0.02;
        this.v2vManager.v2vEnabled = true;
        this.decisionEngine.ownSpeed = 90.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.trafficManager.vehicles["V2V-102"]) {
          this.trafficManager.vehicles["V2V-102"].speed = 90.0;
          this.trafficManager.vehicles["V2V-102"].x = 450.0; // Fast oncoming close pass
        }
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: High-Speed Oncoming Glare Pass (Closing 180 km/h)", "alert");
        break;

      case "heavy_rain":
        this.roadType = "Highway";
        this.weatherModel.setWeather("Heavy Rain");
        this.manualAmbientLux = 0.05;
        this.decisionEngine.ownSpeed = 50.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Heavy Rain & Wet Asphalt Back-Scatter", "stat");
        break;

      case "dense_fog":
        this.roadType = "Mountain Roads";
        this.weatherModel.setWeather("Fog");
        this.manualAmbientLux = 0.03;
        this.decisionEngine.ownSpeed = 40.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Dense Mountain Fog (Reduced Safety Envelope)", "alert");
        break;

      case "urban_traffic":
        this.roadType = "Urban";
        this.weatherModel.setWeather("Clear");
        this.manualAmbientLux = 0.15;
        this.decisionEngine.ownSpeed = 35.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.trafficManager.vehicles["V2V-102"]) {
          this.trafficManager.vehicles["V2V-102"].speed = 30.0;
        }
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Urban Streetlit Traffic (45% Baseline DRL)", "stat");
        break;

      case "tunnel":
        this.roadType = "Tunnel";
        this.weatherModel.setWeather("Clear");
        this.manualAmbientLux = 0.01;
        this.decisionEngine.ownSpeed = 60.0;
        this.trafficManager.spawnInitialVehicles();
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Tunnel Entry (Full Illumination Triggered)", "boot");
        break;

      case "emergency":
        this.roadType = "Highway";
        this.weatherModel.setWeather("Clear");
        this.manualAmbientLux = 0.05;
        this.trafficManager.spawnInitialVehicles();
        if (this.trafficManager.vehicles["V2V-102"]) {
          this.trafficManager.vehicles["V2V-102"].vehicleType = "Ambulance";
          this.trafficManager.vehicles["V2V-102"].isEmergency = true;
          this.trafficManager.vehicles["V2V-102"].speed = 85.0;
        }
        if (this.onUartLog) this.onUartLog("[SCENARIO] Loaded: Emergency Vehicle Approaching (Safety Override Active)", "alert");
        break;

      case "spoof_attack":
        this.triggerSecuritySpoof();
        break;
    }
  }

  // ==========================================================================
  // V2V SECURITY SPOOF INJECTION
  // ==========================================================================
  triggerSecuritySpoof() {
    const tracked = Object.values(this.trafficManager.vehicles);
    if (tracked.length === 0) return { accepted: false, reason: "No active vehicles" };

    const veh = tracked[0];
    const now = Date.now() / 1000;

    // Craft an impossible kinematic teleportation packet (jumping 450m ahead instantly)
    const spoofPacket = this.v2vManager.packetManager.serializePacket(
      veh.id, veh.vehicleType, veh.speed, veh.heading,
      veh.x + 3600.0, // 450 meters leap!
      veh.y, veh.actualDuty, veh.isEmergency, now
    );

    const result = this.v2vManager.receivePacket(spoofPacket, now);

    if (this.onUartLog) {
      this.onUartLog(`[SECURITY ALERT] Malicious V2V frame injected for node ${veh.id}!`, "alert");
      this.onUartLog(`[FIREWALL REJECT] Packet dropped: ${result.reason}`, "sec");
      this.onUartLog(`[FAILOVER] Automated failover to local OPT101 photodiode sensing.`, "mode");
    }

    if (this.onSecurityAlert) {
      this.onSecurityAlert(veh.id, result.reason);
    }

    return result;
  }
}
