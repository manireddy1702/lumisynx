/**
 * MAXTRIX v2.0 / LumiSynx - Decision Engine, Sensors, V2V Network & Traffic Coordination
 * Full simulation core with Explainable AI & Matrix Headlight Segment Computations
 */

// ============================================================================
// 1. DECISION ENGINE (Multi-Stage Autonomous Lighting Controller)
// ============================================================================
class DecisionEngine {
  constructor() {
    this.params = {
      pd_gain: 1.2,
      slew_rate_limit: 5.0,         // Max % change per 100ms
      v2v_gain: 1.5,
      crf_distance_threshold: 80.0, // Meters
      prediction_weight: 0.5,
      
      // Weather Multipliers
      weather_clear_mult: 1.0,
      weather_rain_mult: 0.85,
      weather_heavy_rain_mult: 0.60,
      weather_fog_mult: 0.50,
      weather_dust_mult: 0.75,
      weather_mist_mult: 0.80,
      
      // Road Type Baselines
      road_highway_baseline: 100.0,
      road_urban_baseline: 45.0,
      road_village_baseline: 70.0,
      road_tunnel_baseline: 100.0,
      road_mountain_baseline: 100.0
    };

    // Brightness Safety Limits
    this.min_safe_brightness = 10.0;
    this.preferred_brightness_cfg = 100.0;
    this.max_brightness_cfg = 100.0;

    // Dynamic States
    this.targetDuty = 100.0;
    this.actualDuty = 100.0;
    this.ownSpeed = 50.0; // km/h

    // Matrix LED Segments (8 Left, 8 Right angle sectors)
    this.matrixSegmentsLeft = new Array(8).fill(100.0);
    this.matrixSegmentsRight = new Array(8).fill(100.0);

    // Diagnostics & Explainable AI
    this.primaryReason = "No Traffic Detected";
    this.secondaryReason = "Clear Night";
    this.minBoundary = 10.0;
    this.maxBoundary = 100.0;
    this.preferredBrightness = 100.0;
    this.glareFactor = 0.0;
    this.crf = 0.0;
    this.predCrf = 0.0;
    this.activeMode = "Cooperative V2V";
    this.safetyStatus = "PASS";
    this.regulationStatus = "PASS";
  }

  update(dt, ambientLux, photodiodeVolts, ownSpeed, ownHeading, ownX, ownY,
         trackedVehicles, predictions, weather, roadType, sensorConfidence, v2vConfidence, regProfile) {
    this.ownSpeed = ownSpeed;

    // 1. Determine Baseline Duty based on Ambient Light & Road Type
    let baseline = 100.0;
    const luxHigh = 1.0;
    const luxLow = 0.1;
    const roadKey = `road_${roadType.toLowerCase().replace(/ /g, '_')}_baseline`;
    const nightBaseline = this.params[roadKey] ?? 100.0;

    if (ambientLux >= luxHigh) {
      baseline = 5.0; // Daytime DRL minimum
    } else if (ambientLux <= luxLow) {
      baseline = nightBaseline;
    } else {
      const frac = (ambientLux - luxLow) / (luxHigh - luxLow);
      baseline = nightBaseline - frac * (nightBaseline - 5.0);
    }

    // 2. Optical Glare Dimming (Sensor-Only)
    let vClosing = ownSpeed;
    let highestPeerSpeed = 0.0;
    let priorityVehicle = null;
    let closestDist = 999.0;

    const trackedList = Object.values(trackedVehicles);
    for (const veh of trackedList) {
      const dx = veh.x - ownX;
      const dy = veh.y - ownY;
      const rad = (ownHeading * Math.PI) / 180.0;
      const dotMeters = (dx * Math.cos(rad) + dy * Math.sin(rad)) / 8.0;

      if (dotMeters > -2.0 && veh.distance < closestDist) {
        closestDist = veh.distance;
        priorityVehicle = veh;
        highestPeerSpeed = veh.speed;
      }
    }

    if (priorityVehicle) {
      vClosing = ownSpeed + highestPeerSpeed;
    }

    const speedFactor = 1.0 + 0.003 * vClosing;
    const rawGlare = (photodiodeVolts * this.params.pd_gain * speedFactor) / 3.3;
    this.glareFactor = Math.min(1.0, Math.max(0.0, rawGlare)) * sensorConfidence;

    // 3. Cooperative V2V Dimming (Cooperative Request Factor - CRF)
    this.crf = 0.0;
    this.predCrf = 0.0;

    if (v2vConfidence > 0.2 && trackedList.length > 0) {
      for (const veh of trackedList) {
        if (!veh.v2vEnabled) continue;

        const dx = veh.x - ownX;
        const dy = veh.y - ownY;
        const rad = (ownHeading * Math.PI) / 180.0;
        const dotMeters = (dx * Math.cos(rad) + dy * Math.sin(rad)) / 8.0;
        if (dotMeters <= -2.0) continue; // Behind own car

        const headingDiff = Math.abs(ownHeading - veh.heading) % 360;
        const headingOpposition = Math.max(0.0, 1.0 - Math.abs(headingDiff - 180.0) / 180.0);

        const dThresh = this.params.crf_distance_threshold;
        const dist = veh.distance;
        let distFactor = 0.0;
        if (dist < dThresh && dist > 0) {
          distFactor = (dThresh - dist) / dThresh;
        }

        const vehCrf = headingOpposition * distFactor * this.params.v2v_gain * (1.0 + 0.003 * (ownSpeed + veh.speed));
        this.crf = Math.max(this.crf, Math.min(1.0, vehCrf));
      }
      this.crf *= v2vConfidence;

      // 4. Predictive Dimming (2.0s Horizon)
      if (predictions && Object.keys(predictions).length > 0) {
        for (const [vehId, pred] of Object.entries(predictions)) {
          const veh = trackedVehicles[vehId];
          if (!veh || !veh.v2vEnabled) continue;

          const dx = pred.x - ownX;
          const dy = pred.y - ownY;
          const rad = (ownHeading * Math.PI) / 180.0;
          const dotMeters = (dx * Math.cos(rad) + dy * Math.sin(rad)) / 8.0;
          if (dotMeters <= -2.0) continue;

          const headingDiff = pred.headingDiff;
          const headingOpposition = Math.max(0.0, 1.0 - Math.abs(headingDiff - 180.0) / 180.0);
          const dThresh = this.params.crf_distance_threshold;
          const predDist = pred.distance;
          let predDistFactor = 0.0;
          if (predDist < dThresh && predDist > 0) {
            predDistFactor = (dThresh - predDist) / dThresh;
          }

          const predVehCrf = headingOpposition * predDistFactor * this.params.v2v_gain * (1.0 + 0.003 * (ownSpeed + veh.speed));
          this.predCrf = Math.max(this.predCrf, Math.min(1.0, predVehCrf));
        }
        this.predCrf *= v2vConfidence;
      }
    }

    // Fused Dimming Calculation
    const currentDimming = Math.max(this.glareFactor, this.crf);
    const predictionEffect = this.predCrf * this.params.prediction_weight;
    const fusedDimming = Math.max(currentDimming, predictionEffect);

    this.preferredBrightness = baseline * (1.0 - fusedDimming);

    // 5. Brightness Boundary System (Safety Envelope)
    if (ambientLux < 0.2) {
      const speedMin = regProfile.minBrightness + (ownSpeed / 120.0) * 25.0;
      this.minBoundary = Math.max(regProfile.minBrightness, speedMin);
    } else {
      this.minBoundary = regProfile.minBrightness;
    }

    const weatherKey = `weather_${weather.toLowerCase().replace(/ /g, '_')}_mult`;
    const weatherMult = this.params[weatherKey] ?? 1.0;

    let regMax = regProfile.maxBrightness;
    if (roadType === "Urban") {
      regMax = Math.min(regMax, regProfile.urbanMax);
    } else if (roadType === "Highway") {
      regMax = Math.min(regMax, regProfile.highwayMax);
    }
    this.maxBoundary = regMax * weatherMult;

    if (this.minBoundary > this.maxBoundary) {
      this.minBoundary = this.maxBoundary;
    }

    this.targetDuty = Math.max(this.minBoundary, Math.min(this.maxBoundary, this.preferredBrightness));

    // 6. Emergency Responder Dimming Override
    let emergencyDetected = false;
    for (const veh of trackedList) {
      if (veh.isEmergency && veh.distance < 120.0) {
        emergencyDetected = true;
        break;
      }
    }
    if (emergencyDetected) {
      this.targetDuty = Math.min(this.targetDuty, regProfile.emergencyMax);
      this.targetDuty = Math.max(this.targetDuty, regProfile.minBrightness);
    }

    // 7. Slew-Rate Limiting
    const limitPerSec = this.params.slew_rate_limit * 10.0;
    const maxChange = limitPerSec * dt;
    const dutyDiff = this.targetDuty - this.actualDuty;

    if (Math.abs(dutyDiff) <= maxChange) {
      this.actualDuty = this.targetDuty;
    } else {
      this.actualDuty += dutyDiff > 0 ? maxChange : -maxChange;
    }

    this.actualDuty = Math.max(this.min_safe_brightness, Math.min(this.max_brightness_cfg, this.actualDuty));

    // 8. Compute Matrix LED 8-Segment Masking
    this.computeMatrixSegments(priorityVehicle, ownX, ownY, ownHeading);

    // 9. Diagnostics & Explainable AI
    this.setDiagnostics(ambientLux, emergencyDetected, priorityVehicle, weather, roadType, v2vConfidence);
  }

  computeMatrixSegments(priorityVehicle, ownX, ownY, ownHeading) {
    const baseVal = this.actualDuty;
    // By default all segments match current duty
    for (let i = 0; i < 8; i++) {
      this.matrixSegmentsLeft[i] = baseVal;
      this.matrixSegmentsRight[i] = baseVal;
    }

    if (!priorityVehicle || priorityVehicle.distance > 100.0) return;

    // Angle of priority vehicle relative to heading
    const dx = priorityVehicle.x - ownX;
    const dy = priorityVehicle.y - ownY;
    const angleRad = Math.atan2(dy, dx) - (ownHeading * Math.PI) / 180.0;
    const angleDeg = (angleRad * 180.0) / Math.PI;

    // Map -25° to +25° spread to 8 segments (0 to 7)
    // Positive angle is to the right (oncoming lane)
    const normSector = (angleDeg + 20.0) / 40.0; // 0.0 to 1.0
    const targetIdx = Math.floor(normSector * 8);

    if (targetIdx >= 0 && targetIdx < 8) {
      // Cutout anti-glare window: dim target sector and soften neighbors
      const cutDuty = Math.max(5.0, this.minBoundary);
      this.matrixSegmentsRight[targetIdx] = cutDuty;
      if (targetIdx > 0) this.matrixSegmentsRight[targetIdx - 1] = Math.min(this.matrixSegmentsRight[targetIdx - 1], baseVal * 0.6);
      if (targetIdx < 7) this.matrixSegmentsRight[targetIdx + 1] = Math.min(this.matrixSegmentsRight[targetIdx + 1], baseVal * 0.6);

      this.matrixSegmentsLeft[targetIdx] = cutDuty;
      if (targetIdx > 0) this.matrixSegmentsLeft[targetIdx - 1] = Math.min(this.matrixSegmentsLeft[targetIdx - 1], baseVal * 0.6);
      if (targetIdx < 7) this.matrixSegmentsLeft[targetIdx + 1] = Math.min(this.matrixSegmentsLeft[targetIdx + 1], baseVal * 0.6);
    }
  }

  setDiagnostics(ambientLux, emergencyDetected, priorityVehicle, weather, roadType, v2vConfidence) {
    if (v2vConfidence > 0.7) {
      this.activeMode = "Cooperative V2V";
    } else if (v2vConfidence > 0.2) {
      this.activeMode = "Hybrid V2V-Sensor";
    } else {
      this.activeMode = "Sensor-Only";
    }

    this.safetyStatus = this.actualDuty < this.minBoundary - 0.2 ? "FAIL (UNDER-ILLUM)" : "PASS";
    this.regulationStatus = this.actualDuty > this.maxBoundary + 0.2 ? "FAIL (OVER-BRIGHT)" : "PASS";

    if (ambientLux > 0.5) {
      this.primaryReason = "Daylight Ambient Detected";
      this.secondaryReason = `Daytime DRL baseline: ${this.actualDuty.toFixed(0)}%`;
      return;
    }

    if (emergencyDetected) {
      this.primaryReason = "Emergency Responder Approaching";
      this.secondaryReason = "Safety Protocol dimming active";
      return;
    }

    if (!priorityVehicle) {
      this.primaryReason = "Road Clear (No Obstacles)";
      this.secondaryReason = `Full illumination on ${roadType}${weather !== 'Clear' ? ` (${weather} scattering)` : ''}`;
      return;
    }

    const dist = priorityVehicle.distance;
    const vType = priorityVehicle.vehicleType || "Vehicle";

    if (this.crf > this.glareFactor) {
      this.primaryReason = `Oncoming ${vType} (${this.activeMode})`;
      this.secondaryReason = `Cooperative dimming at ${dist.toFixed(1)}m`;
      if (this.predCrf * this.params.prediction_weight > this.crf) {
        this.secondaryReason = `Pre-emptive projection (2.0s advance)`;
      }
    } else {
      this.primaryReason = `Oncoming ${vType} (Photodiode Glare)`;
      this.secondaryReason = `Optical glare sensed at ${dist.toFixed(1)}m`;
    }
  }

  decisionSnapshot() {
    return {
      brightness: this.actualDuty,
      targetBrightness: this.targetDuty,
      primaryReason: this.primaryReason,
      secondaryReason: this.secondaryReason,
      minBoundary: this.minBoundary,
      maxBoundary: this.maxBoundary,
      glareFactor: this.glareFactor * 100.0,
      crf: this.crf * 100.0,
      predCrf: this.predCrf * 100.0,
      activeMode: this.activeMode,
      safetyStatus: this.safetyStatus,
      regulationStatus: this.regulationStatus,
      preferredBrightness: this.preferredBrightness,
      ownSpeed: this.ownSpeed
    };
  }
}

// ============================================================================
// 2. SENSOR MANAGER
// ============================================================================
class SensorManager {
  constructor() {
    this.ambientLux = 0.05;
    this.photodiodeVolts = 0.0;
    this.confidence = 1.0;
  }

  updateSensors(rawAmbient, rawPd, weatherState, dt) {
    // Apply low pass filter and weather noise
    const noise = (Math.random() - 0.5) * 0.02 * weatherState.scatteringFactor;
    this.ambientLux = Math.max(0.0, rawAmbient + noise);
    this.photodiodeVolts = Math.min(3.3, Math.max(0.0, rawPd));

    // Environmental confidence degrades in heavy fog/mist
    this.confidence = Math.max(0.3, 1.0 - weatherState.scatteringFactor * 0.4);
    return {
      ambientLux: this.ambientLux,
      photodiodeVolts: this.photodiodeVolts,
      confidence: this.confidence
    };
  }
}

// ============================================================================
// 3. V2V MANAGER
// ============================================================================
class V2VManager {
  constructor() {
    this.v2vEnabled = true;
    this.simulatedPacketLoss = 0.0; // User slider override
    this.packetManager = new PacketManager();
    this.linkStates = {};
    this.v2vConfidence = 1.0;
    this.activeMode = "Cooperative V2V";
    this.securityViolations = 0;
    this.lastViolationReason = "None";
    this.totalPacketsReceived = 0;
    this.totalPacketsLost = 0;
    this.totalPacketsRejected = 0;
  }

  updateV2V(trackedVehicles, currentTime, dt) {
    if (!this.v2vEnabled) {
      this.v2vConfidence = 0.0;
      this.activeMode = "Sensor-Only";
      return;
    }

    const activeIds = new Set(Object.keys(trackedVehicles));
    for (const sid of Object.keys(this.linkStates)) {
      if (!activeIds.has(sid)) delete this.linkStates[sid];
    }

    let avgQuality = 1.0;
    let count = 0;

    for (const [vehId, veh] of Object.entries(trackedVehicles)) {
      if (!veh.v2vEnabled) continue;

      if (!this.linkStates[vehId]) {
        this.linkStates[vehId] = {
          latency: 12.0,
          packetLoss: 0.0,
          rssi: -45,
          quality: 1.0,
          lastRxTime: currentTime,
          lastValidState: null
        };
      }

      const state = this.linkStates[vehId];
      const dist = veh.distance;

      // Realistic RSSI decay model
      const baseRssi = dist <= 1.0 ? -30 : -30 - 20 * (dist / 40.0);
      state.rssi = Math.max(-95, Math.min(-30, Math.round(baseRssi + (Math.random() * 4 - 2))));

      let targetLoss = 0.01;
      let targetLatency = 10 + Math.random() * 10;

      if (state.rssi < -70 && state.rssi >= -85) {
        targetLoss = 0.12;
        targetLatency = 30 + Math.random() * 40;
      } else if (state.rssi < -85) {
        targetLoss = 0.40;
        targetLatency = 90 + Math.random() * 120;
      }

      // Add user simulated packet loss
      targetLoss = Math.max(targetLoss, this.simulatedPacketLoss);

      state.packetLoss = state.packetLoss * 0.9 + targetLoss * 0.1;
      state.latency = state.latency * 0.9 + targetLatency * 0.1;

      // Quality score based on RSSI & loss
      const rssiNorm = Math.max(0.0, Math.min(1.0, (state.rssi - (-95)) / 30.0));
      state.quality = Math.max(0.0, Math.min(1.0, rssiNorm * (1.0 - state.packetLoss)));

      avgQuality += state.quality;
      count++;
    }

    this.v2vConfidence = count > 0 ? avgQuality / (count + 1) : 1.0;
    if (this.v2vConfidence > 0.7) {
      this.activeMode = "Cooperative V2V";
    } else if (this.v2vConfidence > 0.2) {
      this.activeMode = "Hybrid V2V-Sensor";
    } else {
      this.activeMode = "Sensor-Only";
    }
  }

  receivePacket(packet, currentTime) {
    if (!this.v2vEnabled) return { accepted: false, reason: "V2V disabled" };

    const vehId = packet.id;
    const link = this.linkStates[vehId];
    const validation = this.packetManager.validatePacket(packet, link?.lastValidState);

    if (validation.valid) {
      this.totalPacketsReceived++;
      if (link) {
        link.lastRxTime = currentTime;
        link.lastValidState = { x: packet.x, y: packet.y, ts: packet.ts };
      }
      return { accepted: true, reason: "OK" };
    } else {
      this.totalPacketsRejected++;
      this.securityViolations++;
      this.lastViolationReason = validation.reason;
      return { accepted: false, reason: validation.reason };
    }
  }
}

// ============================================================================
// 4. VEHICLE INSTANCE (Supports N Independent Vehicles)
// ============================================================================
class Vehicle {
  constructor(vehicleId, vehicleType, speed, heading, x, y, v2vEnabled = true, isEmergency = false) {
    this.id = vehicleId;
    this.vehicleType = vehicleType; // "Car", "Truck", "Ambulance"
    this.speed = speed;             // km/h
    this.heading = heading;         // degrees (180 for oncoming)
    this.x = x;
    this.y = y;
    this.v2vEnabled = v2vEnabled;
    this.isEmergency = isEmergency;
    this.actualDuty = 100.0;
    this.comfortIndex = 100.0;
    this.distance = 0.0;
    this.controller = new DecisionEngine();
    this.comfortModel = new ComfortModel();
  }

  updateController(dt, ownX, ownY, ownDuty, ownSpeed, ambientLux, weatherState, weatherName, roadType, v2vConfidence, regProfile) {
    const distPx = Math.hypot(this.x - ownX, this.y - ownY);
    const distMeters = distPx / 8.0;
    this.distance = distMeters;

    // Simulate optical photodiode voltage for the peer vehicle
    let pdVoltage = 0.0;
    if (distMeters > 0) {
      const cosPhi = Math.abs(this.x - ownX) / distPx;
      pdVoltage = (1500.0 * (ownDuty / 100.0) / (distMeters * distMeters + 1.0)) * (cosPhi * cosPhi);
      pdVoltage *= (1.0 - weatherState.scatteringFactor * 0.7);
      pdVoltage = Math.min(3.3, Math.max(0.0, pdVoltage));
    }

    // Wrap own vehicle as a tracked target for this peer
    const trackedOwn = {
      "V2V-101": {
        id: "V2V-101",
        vehicleType: "Car",
        speed: ownSpeed,
        heading: 0.0,
        x: ownX,
        y: ownY,
        distance: distMeters,
        actualDuty: ownDuty,
        v2vEnabled: true,
        isEmergency: false
      }
    };

    this.controller.update(
      dt, ambientLux, pdVoltage, this.speed, this.heading, this.x, this.y,
      trackedOwn, {}, weatherName, roadType, 1.0, v2vConfidence, regProfile
    );
    this.actualDuty = this.controller.actualDuty;

    // Calculate comfort for the peer driver
    const headingDiff = Math.abs(this.heading - 0.0) % 360;
    const comfortRes = this.comfortModel.calculateComfortIndex(
      this.actualDuty, this.actualDuty, dt, ambientLux, this.speed,
      this.controller.glareFactor, distMeters, headingDiff, true, trackedOwn["V2V-101"]
    );
    this.comfortIndex = Math.max(0.0, comfortRes.comfortIndex - weatherState.comfortPenalty);
  }
}

// ============================================================================
// 5. TRAFFIC MANAGER
// ============================================================================
class TrafficManager {
  constructor(ownX = 120.0, ownY = 150.0) {
    this.ownX = ownX;
    this.ownY = ownY;
    this.vehicles = {};
    this.spawnInitialVehicles();
  }

  spawnInitialVehicles() {
    this.vehicles = {};
    this.addVehicle("V2V-102", "Car", 60.0, 180.0, 800.0, 235.0, true, false);
  }

  addVehicle(id, type, speed, heading, x, y, v2v = true, emergency = false) {
    const veh = new Vehicle(id, type, speed, heading, x, y, v2v, emergency);
    this.vehicles[id] = veh;
    return veh;
  }

  updatePhysics(dt, ownSpeed, canvasWidth = 900) {
    for (const veh of Object.values(this.vehicles)) {
      const vMs = veh.speed / 3.6;
      const rad = (veh.heading * Math.PI) / 180.0;
      veh.x += vMs * Math.cos(rad) * dt * 8.0;

      // Wrap around left to right for continuous looping simulation
      if (veh.x < -120) {
        veh.x = canvasWidth + 100;
      }
    }
  }

  updateVehicleControllers(dt, ownX, ownY, ownDuty, ownSpeed, ambientLux, weatherState, weatherName, roadType, v2vConfidence, regProfile) {
    for (const veh of Object.values(this.vehicles)) {
      veh.updateController(dt, ownX, ownY, ownDuty, ownSpeed, ambientLux, weatherState, weatherName, roadType, v2vConfidence, regProfile);
    }
  }

  getTrackedVehiclesDict() {
    const res = {};
    for (const [id, veh] of Object.entries(this.vehicles)) {
      const distPx = Math.hypot(veh.x - this.ownX, veh.y - this.ownY);
      const distMeters = distPx / 8.0;
      res[id] = {
        id: veh.id,
        vehicleType: veh.vehicleType,
        speed: veh.speed,
        heading: veh.heading,
        x: veh.x,
        y: veh.y,
        distance: distMeters,
        actualDuty: veh.actualDuty,
        v2vEnabled: veh.v2vEnabled,
        isEmergency: veh.isEmergency,
        comfortIndex: veh.comfortIndex
      };
    }
    return res;
  }

  getPriorityVehicle() {
    let closest = null;
    let minD = 9999.0;
    for (const veh of Object.values(this.vehicles)) {
      const distPx = Math.hypot(veh.x - this.ownX, veh.y - this.ownY);
      const distMeters = distPx / 8.0;
      if (distMeters < minD) {
        minD = distMeters;
        closest = { ...veh, distance: distMeters };
      }
    }
    return closest;
  }
}

// ============================================================================
// 6. ANALYTICS ENGINE
// ============================================================================
class AnalyticsEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.tickCount = 0;
    this.totalBrightness = 0.0;
    this.totalComfort = 0.0;
    this.maxGlareVolts = 0.0;
    this.v2vActiveTicks = 0;
    this.v2vTotalLoss = 0.0;
    this.predictionTicks = 0;
    this.totalPredictionError = 0.0;
    this.safetyViolations = 0;
    this.brightnessChangeCount = 0;
    this.prevBrightness = 100.0;
    this.history = [];
  }

  updateTelemetry(actualBrightness, photodiodeVolts, comfortIndex, v2vActive, v2vPacketLoss, predictions, trackedVehicles, minBoundary, maxBoundary) {
    this.tickCount++;
    this.totalBrightness += actualBrightness;
    this.totalComfort += comfortIndex;

    if (photodiodeVolts > this.maxGlareVolts) {
      this.maxGlareVolts = photodiodeVolts;
    }

    if (v2vActive) {
      this.v2vActiveTicks++;
      this.v2vTotalLoss += v2vPacketLoss;
    }

    if (actualBrightness < minBoundary - 0.5 || actualBrightness > maxBoundary + 0.5) {
      this.safetyViolations++;
    }

    if (Math.abs(actualBrightness - this.prevBrightness) > 5.0) {
      this.brightnessChangeCount++;
    }
    this.prevBrightness = actualBrightness;

    // Record sample every 10 ticks for telemetry export
    if (this.tickCount % 10 === 0) {
      this.history.push({
        tick: this.tickCount,
        time: (this.tickCount * 0.02).toFixed(1),
        pwm: actualBrightness.toFixed(1),
        comfort: comfortIndex.toFixed(1),
        pd: photodiodeVolts.toFixed(2),
        minBound: minBoundary.toFixed(1),
        maxBound: maxBoundary.toFixed(1)
      });
      if (this.history.length > 500) this.history.shift();
    }
  }

  getAverageBrightness() {
    return this.tickCount > 0 ? this.totalBrightness / this.tickCount : 100.0;
  }

  getAverageComfort() {
    return this.tickCount > 0 ? this.totalComfort / this.tickCount : 100.0;
  }

  generateCsv() {
    let csv = "Time(s),Luminance_PWM(%),Comfort_Index(%),Photodiode_Glare(V),Min_Bound(%),Max_Bound(%)\n";
    for (const h of this.history) {
      csv += `${h.time},${h.pwm},${h.comfort},${h.pd},${h.minBound},${h.maxBound}\n`;
    }
    return csv;
  }
}
