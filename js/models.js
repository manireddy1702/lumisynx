/**
 * LUMISYNX v2.0 / LumiSynx - Core Data Models & Mathematical Subsystems
 * Weather Model, Regulatory Profiles, Human Comfort Index, Prediction & NVS
 */

// ============================================================================
// 1. WEATHER MODEL
// ============================================================================
class WeatherState {
  constructor(name, visibilityFactor, scatteringFactor, comfortPenalty, predictionConfidenceMult) {
    this.name = name;
    this.visibilityFactor = visibilityFactor;             // 0.0 - 1.0
    this.scatteringFactor = scatteringFactor;             // 0.0 - 1.0 (creates glare back-scatter)
    this.comfortPenalty = comfortPenalty;                 // 0 - 100
    this.predictionConfidenceMult = predictionConfidenceMult; // 0.0 - 1.0
  }
}

class WeatherModel {
  constructor(initialWeather = "Clear") {
    this.states = {
      "Clear": new WeatherState("Clear", 1.0, 0.0, 0.0, 1.0),
      "Rain": new WeatherState("Rain", 0.85, 0.15, 5.0, 0.9),
      "Heavy Rain": new WeatherState("Heavy Rain", 0.60, 0.35, 15.0, 0.7),
      "Fog": new WeatherState("Fog", 0.50, 0.55, 20.0, 0.6),
      "Dust": new WeatherState("Dust", 0.75, 0.25, 10.0, 0.8),
      "Mist": new WeatherState("Mist", 0.80, 0.20, 5.0, 0.85)
    };
    this.currentWeatherName = initialWeather;
  }

  get current() {
    return this.states[this.currentWeatherName] || this.states["Clear"];
  }

  setWeather(name) {
    if (this.states[name]) {
      this.currentWeatherName = name;
      return true;
    }
    return false;
  }

  getAllWeatherNames() {
    return Object.keys(this.states);
  }
}

// ============================================================================
// 2. REGULATION MANAGER
// ============================================================================
class RegulatoryProfile {
  constructor(name, maxBrightness, minBrightness, urbanMax, highwayMax, emergencyMax, comfortThreshold, glareThreshold) {
    this.name = name;
    this.maxBrightness = maxBrightness;       // % (0 - 100)
    this.minBrightness = minBrightness;       // % (0 - 100)
    this.urbanMax = urbanMax;                 // % (0 - 100)
    this.highwayMax = highwayMax;             // % (0 - 100)
    this.emergencyMax = emergencyMax;         // % (0 - 100)
    this.comfortThreshold = comfortThreshold; // (0 - 100)
    this.glareThreshold = glareThreshold;     // V (0 - 3.3)
  }
}

class RegulationManager {
  constructor(initialProfile = "India") {
    this.profiles = {
      "India": new RegulatoryProfile("India (AIS-008)", 100.0, 10.0, 60.0, 100.0, 20.0, 70.0, 1.5),
      "Europe": new RegulatoryProfile("Europe (ECE R123)", 85.0, 12.0, 40.0, 85.0, 15.0, 85.0, 0.8),
      "United States": new RegulatoryProfile("USA (FMVSS 108)", 90.0, 15.0, 50.0, 90.0, 15.0, 80.0, 1.0),
      "Experimental": new RegulatoryProfile("Experimental (Max Range)", 100.0, 5.0, 100.0, 100.0, 10.0, 90.0, 0.5)
    };
    this.currentProfileName = initialProfile;
  }

  get current() {
    return this.profiles[this.currentProfileName] || this.profiles["India"];
  }

  setProfile(name) {
    if (this.profiles[name]) {
      this.currentProfileName = name;
      return true;
    }
    return false;
  }

  getAllProfileNames() {
    return Object.keys(this.profiles);
  }
}

// ============================================================================
// 3. HUMAN COMFORT MODEL
// ============================================================================
class ComfortModel {
  constructor() {
    // Default Weights
    this.w_vis = 0.4;
    this.w_glare = 0.4;
    this.w_stab = 0.2;
  }

  calculateComfortIndex(actualDuty, prevDuty, dt, ambientLux, ownSpeed, receivedGlare, distance, headingDiff, peerDetected, priorityVehicle = null) {
    // 1. Driver Visibility Score (0 - 100)
    // Optimal duty increases with vehicle speed for safety stopping distance
    const optimalDuty = 30.0 + (ownSpeed / 120.0) * 70.0;
    let visScore = 100.0;
    if (ambientLux > 0.5) {
      visScore = 100.0; // Daytime ambient ensures good visibility
    } else {
      if (actualDuty >= optimalDuty) {
        visScore = 100.0;
      } else {
        const deficit = optimalDuty - actualDuty;
        visScore = Math.max(0.0, 100.0 - deficit * 1.5);
      }
    }

    // 2. Glare Score (0 - 100, 0 = no glare, 100 = extreme blinding glare)
    const receivedGlareScore = receivedGlare * 100.0;
    let causedGlareScore = 0.0;

    if (peerDetected && distance > 0) {
      // Glare caused is proportional to duty cycle, inverse square of distance, and heading opposition
      const oppositionFactor = Math.max(0.0, 1.0 - Math.abs((headingDiff % 360) - 180.0) / 90.0);
      let glareMultiplier = 1.0;
      if (priorityVehicle && priorityVehicle.glare_profile) {
        glareMultiplier = priorityVehicle.glare_profile;
      }
      const rawCaused = (actualDuty / 100.0) * (1500.0 / (distance * distance + 1.0)) * oppositionFactor * glareMultiplier;
      causedGlareScore = Math.min(100.0, rawCaused * 30.0);
    }

    const totalGlareScore = Math.max(receivedGlareScore, causedGlareScore);
    const glareComfortScore = Math.max(0.0, 100.0 - totalGlareScore);

    // 3. Light Stability Score (0 - 100)
    let stabilityScore = 100.0;
    if (dt > 0) {
      const rateOfChange = Math.abs(actualDuty - prevDuty) / dt; // % duty per second
      stabilityScore = Math.max(0.0, 100.0 - rateOfChange * 2.0);
    }

    // Weighted Sum
    const totalWeight = this.w_vis + this.w_glare + this.w_stab || 1.0;
    let comfortIndex = (this.w_vis * visScore + this.w_glare * glareComfortScore + this.w_stab * stabilityScore) / totalWeight;
    comfortIndex = Math.max(0.0, Math.min(100.0, comfortIndex));

    return {
      comfortIndex,
      scores: {
        visibility: visScore,
        glareFree: glareComfortScore,
        stability: stabilityScore,
        causedGlare: causedGlareScore,
        receivedGlare: receivedGlareScore
      }
    };
  }
}

// ============================================================================
// 4. PREDICTION ENGINE (2.0s Trajectory Forecasting)
// ============================================================================
class PredictionEngine {
  constructor(horizonSeconds = 2.0) {
    this.horizon = horizonSeconds;
  }

  predictVehicle(vehicle, ownX, ownY, ownSpeed, ownHeading = 0.0) {
    const vSpeedMs = vehicle.speed / 3.6;
    const rad = (vehicle.heading * Math.PI) / 180.0;
    const dx = vSpeedMs * Math.cos(rad) * this.horizon * 8.0; // 8 px per meter
    const dy = vSpeedMs * Math.sin(rad) * this.horizon * 8.0;

    const predX = vehicle.x + dx;
    const predY = vehicle.y + dy;

    // Own vehicle projected position
    const ownSpeedMs = ownSpeed / 3.6;
    const ownRad = (ownHeading * Math.PI) / 180.0;
    const ownDx = ownSpeedMs * Math.cos(ownRad) * this.horizon * 8.0;
    const ownDy = ownSpeedMs * Math.sin(ownRad) * this.horizon * 8.0;
    const predOwnX = ownX + ownDx;
    const predOwnY = ownY + ownDy;

    const distPx = Math.hypot(predX - predOwnX, predY - predOwnY);
    const distMeters = distPx / 8.0;

    return {
      x: predX,
      y: predY,
      distance: distMeters,
      headingDiff: Math.abs(ownHeading - vehicle.heading) % 360,
      horizon: this.horizon
    };
  }

  predictAllVehicles(vehicles, ownX, ownY, ownSpeed, ownHeading = 0.0) {
    const predictions = {};
    for (const [id, veh] of Object.entries(vehicles)) {
      predictions[id] = this.predictVehicle(veh, ownX, ownY, ownSpeed, ownHeading);
    }
    return predictions;
  }
}

// ============================================================================
// 5. PACKET MANAGER (V2V Protocol Serialization & Validation)
// ============================================================================
class PacketManager {
  constructor() {
    this.sequence = 0;
  }

  serializePacket(vehicleId, vehicleType, speed, heading, x, y, actualDuty, isEmergency, timestamp = Date.now() / 1000) {
    this.sequence++;
    const payload = {
      seq: this.sequence,
      id: vehicleId,
      type: vehicleType,
      spd: Number(speed.toFixed(1)),
      hdg: Number(heading.toFixed(1)),
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      pwm: Number(actualDuty.toFixed(1)),
      emg: Boolean(isEmergency),
      ts: timestamp
    };

    // Calculate simple Adler-style checksum simulation
    const jsonStr = JSON.stringify(payload);
    let crc = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      crc = (crc + jsonStr.charCodeAt(i) * (i + 1)) % 65535;
    }
    payload.crc = crc;
    return payload;
  }

  validatePacket(packet, lastKnownState = null) {
    if (!packet || typeof packet !== 'object') {
      return { valid: false, reason: "Malformed frame" };
    }

    // Sequence & Age check
    const now = Date.now() / 1000;
    if (Math.abs(now - packet.ts) > 2.0) {
      return { valid: false, reason: "Packet stale (>2000ms delay)" };
    }

    // Kinematic Sanity Firewall Check (Spoof Defense)
    if (lastKnownState) {
      const dt = packet.ts - lastKnownState.ts;
      if (dt > 0.001) {
        const dx = packet.x - lastKnownState.x;
        const dy = packet.y - lastKnownState.y;
        const distMovedMeters = Math.hypot(dx, dy) / 8.0;
        const maxPossibleSpeedMps = 60.0; // ~216 km/h
        if (distMovedMeters > maxPossibleSpeedMps * dt + 10.0) {
          return {
            valid: false,
            reason: `Kinematic jump detected: moved ${distMovedMeters.toFixed(1)}m in ${dt.toFixed(2)}s!`
          };
        }
      }
    }

    return { valid: true, reason: "OK" };
  }
}

// ============================================================================
// 6. CALIBRATION MANAGER (NVS Flash Simulation with LocalStorage)
// ============================================================================
class CalibrationManager {
  constructor() {
    this.storageKey = "LUMISYNX_v2_calibration_nvs";
    this.defaultCalibration = {
      decision_engine: {
        pd_gain: 1.2,
        slew_rate_limit: 5.0,
        v2v_gain: 1.5,
        crf_distance_threshold: 80.0,
        prediction_weight: 0.5,
        weather_clear_mult: 1.0,
        weather_rain_mult: 0.85,
        weather_heavy_rain_mult: 0.6,
        weather_fog_mult: 0.5,
        weather_dust_mult: 0.75,
        weather_mist_mult: 0.8,
        road_highway_baseline: 100.0,
        road_urban_baseline: 45.0,
        road_village_baseline: 70.0,
        road_tunnel_baseline: 100.0,
        road_mountain_baseline: 100.0
      },
      comfort_model: {
        w_vis: 0.4,
        w_glare: 0.4,
        w_stab: 0.2
      }
    };
  }

  loadCalibration(decisionEngine, comfortModel) {
    let saved = null;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      console.warn("NVS Flash read error, restoring defaults", e);
    }

    const cal = saved || this.defaultCalibration;
    if (decisionEngine && cal.decision_engine) {
      Object.assign(decisionEngine.params, cal.decision_engine);
    }
    if (comfortModel && cal.comfort_model) {
      comfortModel.w_vis = cal.comfort_model.w_vis ?? 0.4;
      comfortModel.w_glare = cal.comfort_model.w_glare ?? 0.4;
      comfortModel.w_stab = cal.comfort_model.w_stab ?? 0.2;
    }
    return cal;
  }

  saveCalibration(decisionEngine, comfortModel) {
    const data = {
      decision_engine: { ...decisionEngine.params },
      comfort_model: {
        w_vis: comfortModel.w_vis,
        w_glare: comfortModel.w_glare,
        w_stab: comfortModel.w_stab
      }
    };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("NVS Write error", e);
      return false;
    }
  }

  resetCalibration(decisionEngine, comfortModel) {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {}
    return this.loadCalibration(decisionEngine, comfortModel);
  }
}
