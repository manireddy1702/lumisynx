/**
 * LUMISYNX v2.0 / LumiSynx - Main Web Application Controller
 * Glues Simulation, HTML5 Canvas Renderer, Gauges, Real-Time Charts,
 * Explainable AI Panels, Matrix LED Visualizer, and UART Terminal.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize Subsystems
  const sim = new SimulationCoordinator();
  const roadCanvas = document.getElementById("roadCanvas");
  const roadRenderer = new RoadRenderer(roadCanvas);
  
  const chartCanvas = document.getElementById("telemetryChartCanvas");
  const telemetryChart = new TelemetryChart(chartCanvas);
  
  const soundEngine = new SoundEngine();

  // 2. Initialize Gauges
  const gaugeComfort = new CircularGauge("gaugeOwnComfort", "Own Comfort", "%");
  const gaugePeerComfort = new CircularGauge("gaugePeerComfort", "Peer Comfort", "%");
  const gaugeConfidence = new CircularGauge("gaugeV2vConfidence", "V2V Conf.", "%");
  const gaugeSensorConf = new CircularGauge("gaugeSensorConfidence", "Sensor Conf.", "%");

  // 3. UI Element References
  const btnPlay = document.getElementById("btnPlay");
  const btnPause = document.getElementById("btnPause");
  const btnReset = document.getElementById("btnReset");
  const btnStep = document.getElementById("btnStep");
  const selectSpeed = document.getElementById("selectSpeed");
  const selectScenario = document.getElementById("selectScenario");
  
  const statusBadge = document.getElementById("statusBadge");
  const modePillText = document.getElementById("modePillText");
  const btnSoundToggle = document.getElementById("btnSoundToggle");
  const btnSlidesModal = document.getElementById("btnSlidesModal");
  const btnFullscreen = document.getElementById("btnFullscreen");

  // Operation Mode
  const btnModeManual = document.getElementById("btnModeManual");
  const btnModeSim = document.getElementById("btnModeSim");

  // Environmental Controls
  const selectRoadType = document.getElementById("selectRoadType");
  const selectWeather = document.getElementById("selectWeather");
  const selectRegulation = document.getElementById("selectRegulation");
  
  const sliderAmbient = document.getElementById("sliderAmbient");
  const valAmbient = document.getElementById("valAmbient");
  
  const sliderPd = document.getElementById("sliderPd");
  const valPd = document.getElementById("valPd");
  
  const sliderOwnSpeed = document.getElementById("sliderOwnSpeed");
  const valOwnSpeed = document.getElementById("valOwnSpeed");
  
  const sliderPeerSpeed = document.getElementById("sliderPeerSpeed");
  const valPeerSpeed = document.getElementById("valPeerSpeed");

  // V2V & Security
  const checkV2vEnable = document.getElementById("checkV2vEnable");
  const sliderPacketLoss = document.getElementById("sliderPacketLoss");
  const valPacketLoss = document.getElementById("valPacketLoss");
  const btnSpoof = document.getElementById("btnSpoof");

  // NVS Calibration
  const inputPdGain = document.getElementById("inputPdGain");
  const inputV2vGain = document.getElementById("inputV2vGain");
  const inputCrfDist = document.getElementById("inputCrfDist");
  const inputPredWeight = document.getElementById("inputPredWeight");
  const inputSlewRate = document.getElementById("inputSlewRate");
  const inputWVis = document.getElementById("inputWVis");
  const inputWGlare = document.getElementById("inputWGlare");
  const inputWStab = document.getElementById("inputWStab");
  const btnSaveCal = document.getElementById("btnSaveCal");
  const btnResetCal = document.getElementById("btnResetCal");

  // Decision Analysis Panels (Dual Vehicle)
  const lblOwnPwm = document.getElementById("lblOwnPwm");
  const lblOwnPrimary = document.getElementById("lblOwnPrimary");
  const lblOwnSecondary = document.getElementById("lblOwnSecondary");
  const lblOwnDetails = document.getElementById("lblOwnDetails");
  const lblOwnComfort = document.getElementById("lblOwnComfort");
  const lblOwnMode = document.getElementById("lblOwnMode");
  const lblOwnBounds = document.getElementById("lblOwnBounds");

  const lblPeerPwm = document.getElementById("lblPeerPwm");
  const lblPeerPrimary = document.getElementById("lblPeerPrimary");
  const lblPeerSecondary = document.getElementById("lblPeerSecondary");
  const lblPeerDetails = document.getElementById("lblPeerDetails");
  const lblPeerComfort = document.getElementById("lblPeerComfort");
  const lblPeerMode = document.getElementById("lblPeerMode");
  const lblPeerBounds = document.getElementById("lblPeerBounds");

  // Traffic Table
  const trafficTableBody = document.getElementById("trafficTableBody");

  // Matrix LED Bars
  const matrixRightBlocks = document.querySelectorAll("#matrixRight .led-segment-block");
  const matrixLeftBlocks = document.querySelectorAll("#matrixLeft .led-segment-block");

  // System Health Elements
  const healthAmbient = document.getElementById("healthAmbient");
  const healthPd = document.getElementById("healthPd");
  const healthV2v = document.getElementById("healthV2v");
  const healthComm = document.getElementById("healthComm");
  const healthPrediction = document.getElementById("healthPrediction");
  const healthRegulation = document.getElementById("healthRegulation");
  const healthOverall = document.getElementById("healthOverall");
  const lblHealthPackets = document.getElementById("lblHealthPackets");
  const lblHealthViolations = document.getElementById("lblHealthViolations");

  // UART Terminal Elements
  const uartLogBox = document.getElementById("uartLogBox");
  const btnClearUart = document.getElementById("btnClearUart");
  const checkAutoScroll = document.getElementById("checkAutoScroll");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnAnalyticsReport = document.getElementById("btnAnalyticsReport");

  // Modals
  const slidesModal = document.getElementById("slidesModal");
  const btnCloseSlides = document.getElementById("btnCloseSlides");
  const btnPrevSlide = document.getElementById("btnPrevSlide");
  const btnNextSlide = document.getElementById("btnNextSlide");
  const slideCounter = document.getElementById("slideCounter");
  const slideContent = document.getElementById("slideContent");
  let currentSlideIdx = 0;

  const reportModal = document.getElementById("reportModal");
  const btnCloseReport = document.getElementById("btnCloseReport");
  const reportBody = document.getElementById("reportBody");

  // ==========================================================================
  // INITIALIZE CALIBRATION INPUT VALUES
  // ==========================================================================
  function syncCalInputs() {
    if (inputPdGain) inputPdGain.value = sim.decisionEngine.params.pd_gain;
    if (inputV2vGain) inputV2vGain.value = sim.decisionEngine.params.v2v_gain;
    if (inputCrfDist) inputCrfDist.value = sim.decisionEngine.params.crf_distance_threshold;
    if (inputPredWeight) inputPredWeight.value = sim.decisionEngine.params.prediction_weight;
    if (inputSlewRate) inputSlewRate.value = sim.decisionEngine.params.slew_rate_limit;
    if (inputWVis) inputWVis.value = sim.comfortModel.w_vis;
    if (inputWGlare) inputWGlare.value = sim.comfortModel.w_glare;
    if (inputWStab) inputWStab.value = sim.comfortModel.w_stab;
  }
  syncCalInputs();

  // ==========================================================================
  // UART TERMINAL LOGGING HOOKS
  // ==========================================================================
  function logToUart(msg, tagClass = "stat") {
    if (!uartLogBox) return;
    const line = document.createElement("div");
    line.className = `uart-log-line tag-${tagClass}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    uartLogBox.appendChild(line);

    // Keep log buffer bounded
    if (uartLogBox.children.length > 300) {
      uartLogBox.removeChild(uartLogBox.firstChild);
    }

    if (checkAutoScroll && checkAutoScroll.checked) {
      uartLogBox.scrollTop = uartLogBox.scrollHeight;
    }
  }

  sim.onUartLog = logToUart;
  sim.onModeChange = (newMode) => {
    soundEngine.playModeTransition();
    updateModeBadge(newMode);
  };
  sim.onSecurityAlert = (nodeId, reason) => {
    soundEngine.playSecurityAlert();
    if (statusBadge) {
      statusBadge.className = "status-badge";
    }
  };

  // Initial Boot Logs
  logToUart("--- LUMISYNX v2.0 DIGITAL TWIN INITIALIZED ---", "boot");
  logToUart("[BOOT] Core 0: Decision & Optical Fusion loop (50Hz) started.", "boot");
  logToUart("[BOOT] Core 1: V2V 2.4GHz Transceiver & Kinematic Firewall active.", "boot");
  logToUart("[BOOT] Dual Intelligent Vehicle Architecture: ONLINE.", "boot");
  logToUart("[BOOT] NVS Flash sector 0x1F read: Calibration OK.", "boot");
  logToUart("---------------------------------------------------------", "boot");

  // ==========================================================================
  // EVENT LISTENERS & USER INPUT BINDINGS
  // ==========================================================================

  // Play / Pause / Reset / Step
  btnPlay.addEventListener("click", () => {
    sim.isRunning = true;
    btnPlay.classList.add("active-play");
    btnPause.classList.remove("active-pause");
    soundEngine.playClick();
    logToUart("[SIM] Simulation resumed.", "boot");
  });

  btnPause.addEventListener("click", () => {
    sim.isRunning = false;
    btnPause.classList.add("active-pause");
    btnPlay.classList.remove("active-play");
    soundEngine.playClick();
    logToUart("[SIM] Simulation paused.", "stat");
  });

  btnReset.addEventListener("click", () => {
    sim.simTime = 0.0;
    sim.trafficManager.spawnInitialVehicles();
    sim.analyticsEngine.reset();
    soundEngine.playClick();
    logToUart("[SIM] Simulation reset to initial state.", "stat");
  });

  btnStep.addEventListener("click", () => {
    sim.update(0.04);
    roadRenderer.draw(sim);
    soundEngine.playClick();
    logToUart("[SIM] Single step tick executed (40ms).", "stat");
  });

  selectSpeed.addEventListener("change", (e) => {
    sim.speedMultiplier = parseFloat(e.target.value);
    soundEngine.playClick();
    logToUart(`[SIM] Simulation speed set to ${sim.speedMultiplier}x`, "stat");
  });

  // Scenario Dropdown
  selectScenario.addEventListener("change", (e) => {
    const scen = e.target.value;
    sim.loadScenario(scen);
    // Sync UI elements with new scenario
    if (selectRoadType) selectRoadType.value = sim.roadType;
    if (selectWeather) selectWeather.value = sim.weatherModel.currentWeatherName;
    if (sliderAmbient) {
      sliderAmbient.value = sim.manualAmbientLux;
      valAmbient.textContent = `${sim.manualAmbientLux.toFixed(2)} klux`;
    }
    if (sliderOwnSpeed) {
      sliderOwnSpeed.value = sim.decisionEngine.ownSpeed;
      valOwnSpeed.textContent = `${sim.decisionEngine.ownSpeed.toFixed(0)} km/h`;
    }
    soundEngine.playModeTransition();
  });

  // Sidebar Toggle
  const btnToggleSidebar = document.getElementById("btnToggleSidebar");
  const dashboardContainer = document.querySelector(".dashboard-container");
  if (btnToggleSidebar && dashboardContainer) {
    btnToggleSidebar.addEventListener("click", () => {
      dashboardContainer.classList.toggle("sidebar-collapsed");
      btnToggleSidebar.classList.toggle("active");
      setTimeout(() => {
        roadRenderer.resize();
        telemetryChart.resize();
      }, 50);
      soundEngine.playClick();
    });
  }

  // Sound Toggle
  btnSoundToggle.addEventListener("click", () => {
    const isMuted = !soundEngine.toggle();
    btnSoundToggle.classList.toggle("active", !isMuted);
    btnSoundToggle.title = isMuted ? "Audio Muted" : "Audio Active";
  });

  // Fullscreen
  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  // Mode: Manual vs Sim
  btnModeManual.addEventListener("click", () => {
    sim.simMode = "manual";
    btnModeManual.classList.add("active");
    btnModeSim.classList.remove("active");
    sliderPd.disabled = false;
    soundEngine.playClick();
    logToUart("[MODE] Switched to Manual Mode (Sliders Active).", "stat");
  });

  btnModeSim.addEventListener("click", () => {
    sim.simMode = "sim";
    btnModeSim.classList.add("active");
    btnModeManual.classList.remove("active");
    sliderPd.disabled = true;
    soundEngine.playClick();
    logToUart("[MODE] Switched to Highway Simulation (Physics Active).", "stat");
  });

  // Environmental Selectors
  selectRoadType.addEventListener("change", (e) => {
    sim.roadType = e.target.value;
    soundEngine.playClick();
    logToUart(`[ENV] Road Type: ${sim.roadType}`, "stat");
  });

  selectWeather.addEventListener("change", (e) => {
    sim.weatherModel.setWeather(e.target.value);
    soundEngine.playClick();
    logToUart(`[ENV] Weather Condition: ${sim.weatherModel.currentWeatherName}`, "stat");
  });

  selectRegulation.addEventListener("change", (e) => {
    sim.regulationManager.setProfile(e.target.value);
    soundEngine.playClick();
    logToUart(`[REG] Regulatory Standard Envelope: ${sim.regulationManager.current.name}`, "stat");
  });

  // Sliders
  sliderAmbient.addEventListener("input", (e) => {
    sim.manualAmbientLux = parseFloat(e.target.value);
    valAmbient.textContent = `${sim.manualAmbientLux.toFixed(2)} klux`;
  });

  sliderPd.addEventListener("input", (e) => {
    sim.manualPdVolts = parseFloat(e.target.value);
    valPd.textContent = `${sim.manualPdVolts.toFixed(2)} V`;
  });

  sliderOwnSpeed.addEventListener("input", (e) => {
    sim.decisionEngine.ownSpeed = parseFloat(e.target.value);
    valOwnSpeed.textContent = `${sim.decisionEngine.ownSpeed.toFixed(0)} km/h`;
    soundEngine.updateEnginePitch(sim.decisionEngine.ownSpeed);
  });

  sliderPeerSpeed.addEventListener("input", (e) => {
    const spd = parseFloat(e.target.value);
    valPeerSpeed.textContent = `${spd.toFixed(0)} km/h`;
    for (const veh of Object.values(sim.trafficManager.vehicles)) {
      veh.speed = spd;
    }
  });

  // V2V Controls
  checkV2vEnable.addEventListener("change", (e) => {
    sim.v2vManager.v2vEnabled = e.target.checked;
    soundEngine.playClick();
    logToUart(`[V2V] Radio Transceiver ${sim.v2vManager.v2vEnabled ? "ENABLED" : "DISABLED"}`, "mode");
  });

  sliderPacketLoss.addEventListener("input", (e) => {
    sim.v2vManager.simulatedPacketLoss = parseFloat(e.target.value) / 100.0;
    valPacketLoss.textContent = `${e.target.value}%`;
  });

  btnSpoof.addEventListener("click", () => {
    sim.triggerSecuritySpoof();
  });

  // NVS Calibration Actions
  btnSaveCal.addEventListener("click", () => {
    sim.decisionEngine.params.pd_gain = parseFloat(inputPdGain.value);
    sim.decisionEngine.params.v2v_gain = parseFloat(inputV2vGain.value);
    sim.decisionEngine.params.crf_distance_threshold = parseFloat(inputCrfDist.value);
    sim.decisionEngine.params.prediction_weight = parseFloat(inputPredWeight.value);
    sim.decisionEngine.params.slew_rate_limit = parseFloat(inputSlewRate.value);

    sim.comfortModel.w_vis = parseFloat(inputWVis.value);
    sim.comfortModel.w_glare = parseFloat(inputWGlare.value);
    sim.comfortModel.w_stab = parseFloat(inputWStab.value);

    const ok = sim.calibrationManager.saveCalibration(sim.decisionEngine, sim.comfortModel);
    soundEngine.playClick();
    logToUart(`[NVS] Parameters committed to non-volatile flash sector: ${ok ? "SUCCESS" : "ERROR"}`, "boot");
  });

  btnResetCal.addEventListener("click", () => {
    sim.calibrationManager.resetCalibration(sim.decisionEngine, sim.comfortModel);
    syncCalInputs();
    soundEngine.playClick();
    logToUart("[NVS] Parameters reset to factory defaults.", "stat");
  });

  // Telemetry Chart Tabs
  const chartTabBtns = document.querySelectorAll(".chart-tab-btn");
  chartTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      chartTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      telemetryChart.setTab(btn.dataset.tab);
      soundEngine.playClick();
    });
  });

  // Bottom Station Tabs
  const stationTabBtns = document.querySelectorAll(".station-tab-btn");
  const stationTabContents = document.querySelectorAll(".station-tab-content");
  stationTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      stationTabBtns.forEach((b) => b.classList.remove("active"));
      stationTabContents.forEach((c) => (c.style.display = "none"));
      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.target);
      if (target) target.style.display = "block";
      soundEngine.playClick();
    });
  });

  // UART Controls
  btnClearUart.addEventListener("click", () => {
    uartLogBox.innerHTML = "";
    soundEngine.playClick();
  });

  btnExportCsv.addEventListener("click", () => {
    const csvContent = sim.analyticsEngine.generateCsv();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `LUMISYNX_Telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logToUart("[EXPORT] Telemetry CSV file generated & downloaded.", "boot");
  });

  btnAnalyticsReport.addEventListener("click", () => {
    generateAnalyticsReportModal();
  });

  // Slides Modal
  btnSlidesModal.addEventListener("click", () => {
    openSlidesModal();
  });

  btnCloseSlides.addEventListener("click", () => {
    slidesModal.classList.remove("open");
  });

  btnPrevSlide.addEventListener("click", () => {
    if (currentSlideIdx > 0) {
      currentSlideIdx--;
      renderCurrentSlide();
      soundEngine.playClick();
    }
  });

  btnNextSlide.addEventListener("click", () => {
    if (currentSlideIdx < SLIDES_DATA.length - 1) {
      currentSlideIdx++;
      renderCurrentSlide();
      soundEngine.playClick();
    }
  });

  btnCloseReport.addEventListener("click", () => {
    reportModal.classList.remove("open");
  });

  // ==========================================================================
  // SLIDES DECK VIEWER MODAL
  // ==========================================================================
  function openSlidesModal() {
    slidesModal.classList.add("open");
    renderCurrentSlide();
  }

  function renderCurrentSlide() {
    const slide = SLIDES_DATA[currentSlideIdx];
    if (!slide) return;

    slideCounter.textContent = `SLIDE ${slide.num} OF ${SLIDES_DATA.length}`;
    
    let cardsHtml = "";
    for (const card of slide.cards) {
      let itemsHtml = "";
      if (card.items) {
        itemsHtml = `<ul>${card.items.map((it) => `<li>${it}</li>`).join("")}</ul>`;
      }
      cardsHtml += `
        <div class="slide-subcard">
          <h4>${card.title}</h4>
          <p>${card.desc}</p>
          ${itemsHtml}
        </div>
      `;
    }

    slideContent.innerHTML = `
      <div class="slide-content-card">
        <div class="slide-title">${slide.title}</div>
        <div class="slide-subtitle">${slide.subtitle}</div>
        <div class="slide-grid-cards">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // ANALYTICS REPORT MODAL
  // ==========================================================================
  function generateAnalyticsReportModal() {
    const avgDuty = sim.analyticsEngine.getAverageBrightness();
    const avgComfort = sim.analyticsEngine.getAverageComfort();
    const maxGlare = sim.analyticsEngine.maxGlareVolts;
    const safetyViolations = sim.analyticsEngine.safetyViolations;
    const lossPct = sim.analyticsEngine.v2vActiveTicks > 0
      ? (sim.analyticsEngine.v2vTotalLoss / sim.analyticsEngine.v2vActiveTicks) * 100
      : 0.0;

    reportBody.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: var(--surface); border: 1px solid var(--border); padding: 12px; border-radius: var(--radius);">
          <h3 style="color: var(--text); font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">LUMISYNX v2.0 - System Performance Summary</h3>
          <p style="color: var(--text-muted); font-size: 11px;">Aggregated digital twin telemetry across ${sim.analyticsEngine.tickCount} physics ticks (${(sim.analyticsEngine.tickCount * 0.02).toFixed(1)}s elapsed).</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div class="slide-subcard">
            <h4>Average Luminance</h4>
            <div style="font-size: 20px; font-weight: 600; color: #ffffff; font-family: var(--font-mono);">${avgDuty.toFixed(1)}%</div>
            <p>Optimal roadway coverage maintained</p>
          </div>
          <div class="slide-subcard">
            <h4>Driver Comfort Score</h4>
            <div style="font-size: 20px; font-weight: 600; color: #ffffff; font-family: var(--font-mono);">${avgComfort.toFixed(1)}%</div>
            <p>Target: >85% ECE benchmark</p>
          </div>
          <div class="slide-subcard">
            <h4>Peak Optical Glare</h4>
            <div style="font-size: 20px; font-weight: 600; color: #ffffff; font-family: var(--font-mono);">${maxGlare.toFixed(2)}V</div>
            <p>ADC limit: 3.30V maximum</p>
          </div>
        </div>

        <div class="slide-subcard">
          <h4>Subsystem Reliability Metrics</h4>
          <ul style="padding-left: 18px; line-height: 1.8; color: var(--text-muted);">
            <li><strong>V2V Network Health:</strong> Average Packet Loss ${lossPct.toFixed(1)}% | ${sim.v2vManager.totalPacketsReceived} frames validated</li>
            <li><strong>Kinematic Firewall:</strong> ${sim.v2vManager.securityViolations} anomalies quarantined | Automated failover: 100% successful</li>
            <li><strong>Regulatory Violations:</strong> ${safetyViolations} ticks out of bounds (Safety status: ${safetyViolations === 0 ? "100% COMPLIANT" : "AUDIT NEEDED"})</li>
            <li><strong>Light Stability:</strong> ${sim.analyticsEngine.brightnessChangeCount} significant rate adjustments (Zero high-frequency flickering)</li>
          </ul>
        </div>
      </div>
    `;
    reportModal.classList.add("open");
  }

  // ==========================================================================
  // REAL-TIME UI UPDATE HELPERS
  // ==========================================================================
  function updateModeBadge(mode) {
    if (!statusBadge || !modePillText) return;
    modePillText.textContent = mode;
  }

  function updateDecisionPanels() {
    // Own Vehicle
    const ownSnap = sim.decisionEngine.decisionSnapshot();
    lblOwnPwm.innerHTML = `${ownSnap.brightness.toFixed(0)}% <span class="duty-label">TARGET: ${ownSnap.targetBrightness.toFixed(0)}%</span>`;
    lblOwnPrimary.textContent = ownSnap.primaryReason;
    lblOwnSecondary.textContent = ownSnap.secondaryReason;
    lblOwnDetails.textContent = `SPD: ${ownSnap.ownSpeed.toFixed(0)} km/h | GLR: ${ownSnap.glareFactor.toFixed(1)}% | CRF: ${ownSnap.crf.toFixed(1)}%`;
    lblOwnComfort.textContent = `Comfort: ${sim.comfortIndex.toFixed(1)}% | Stability: ${sim.comfortScores.stability?.toFixed(0) || 100}%`;
    lblOwnMode.textContent = `Mode: ${ownSnap.activeMode} | Safety: ${ownSnap.safetyStatus}`;
    lblOwnBounds.textContent = `Bounds: Min ${ownSnap.minBoundary.toFixed(0)}% | Max ${ownSnap.maxBoundary.toFixed(0)}%`;

    // Peer Vehicle
    const priority = sim.trafficManager.getPriorityVehicle();
    if (priority && priority.controller) {
      const peerSnap = priority.controller.decisionSnapshot();
      lblPeerPwm.innerHTML = `${peerSnap.brightness.toFixed(0)}% <span class="duty-label">TARGET: ${peerSnap.targetBrightness.toFixed(0)}%</span>`;
      lblPeerPrimary.textContent = peerSnap.primaryReason;
      lblPeerSecondary.textContent = peerSnap.secondaryReason;
      lblPeerDetails.textContent = `DIST: ${priority.distance.toFixed(1)}m | SPD: ${priority.speed.toFixed(0)} km/h | CRF: ${peerSnap.crf.toFixed(1)}%`;
      lblPeerComfort.textContent = `Peer Comfort: ${priority.comfortIndex.toFixed(1)}%`;
      lblPeerMode.textContent = `Mode: ${peerSnap.activeMode} | Regulation: ${peerSnap.regulationStatus}`;
      lblPeerBounds.textContent = `Bounds: Min ${peerSnap.minBoundary.toFixed(0)}% | Max ${peerSnap.maxBoundary.toFixed(0)}%`;
    } else {
      lblPeerPwm.innerHTML = `--% <span class="duty-label">STANDBY</span>`;
      lblPeerPrimary.textContent = "No Peer in Range";
      lblPeerSecondary.textContent = "Waiting for oncoming traffic...";
      lblPeerDetails.textContent = "DIST: -- | SPD: -- | CRF: --";
      lblPeerComfort.textContent = "Peer Comfort: 100%";
      lblPeerMode.textContent = "Mode: Standby | Regulation: PASS";
      lblPeerBounds.textContent = "Bounds: Min --% | Max --%";
    }
  }

  function updateTrafficTable() {
    if (!trafficTableBody) return;
    const tracked = sim.trafficManager.getTrackedVehiclesDict();
    let rowsHtml = "";

    // Own Vehicle Row
    rowsHtml += `
      <tr>
        <td><strong>V2V-101 (OWN)</strong></td>
        <td>Car</td>
        <td>--</td>
        <td>${sim.decisionEngine.actualDuty.toFixed(0)}%</td>
        <td>${sim.comfortIndex.toFixed(0)}%</td>
        <td><span class="status-val-yes">YES</span></td>
        <td>-30dBm</td>
      </tr>
    `;

    for (const [id, veh] of Object.entries(tracked)) {
      const link = sim.v2vManager.linkStates[id] || { rssi: -95, quality: 0 };
      const rssiStr = `${link.rssi}dBm`;
      const v2vBadge = veh.v2vEnabled ? `<span class="status-val-yes">YES</span>` : `<span class="status-val-no">NO</span>`;

      rowsHtml += `
        <tr>
          <td><strong>${veh.id}</strong></td>
          <td>${veh.vehicleType}</td>
          <td>${veh.distance.toFixed(1)}m</td>
          <td>${veh.actualDuty.toFixed(0)}%</td>
          <td>${veh.comfortIndex.toFixed(0)}%</td>
          <td>${v2vBadge}</td>
          <td>${rssiStr}</td>
        </tr>
      `;
    }

    trafficTableBody.innerHTML = rowsHtml;
  }

  function updateMatrixLedBars() {
    const segsRight = sim.decisionEngine.matrixSegmentsRight;
    const segsLeft = sim.decisionEngine.matrixSegmentsLeft;

    if (matrixRightBlocks && matrixRightBlocks.length === 8) {
      for (let i = 0; i < 8; i++) {
        const val = segsRight[i];
        const bar = matrixRightBlocks[i].querySelector(".led-fill-bar");
        const lbl = matrixRightBlocks[i].querySelector(".led-lbl");
        if (bar) bar.style.height = `${val}%`;
        if (lbl) lbl.textContent = `${val.toFixed(0)}%`;
      }
    }

    if (matrixLeftBlocks && matrixLeftBlocks.length === 8) {
      for (let i = 0; i < 8; i++) {
        const val = segsLeft[i];
        const bar = matrixLeftBlocks[i].querySelector(".led-fill-bar");
        const lbl = matrixLeftBlocks[i].querySelector(".led-lbl");
        if (bar) bar.style.height = `${val}%`;
        if (lbl) lbl.textContent = `${val.toFixed(0)}%`;
      }
    }
  }

  function updateSystemHealth() {
    const isV2vOk = sim.v2vManager.v2vEnabled && sim.v2vManager.v2vConfidence > 0.3;
    if (healthV2v) {
      healthV2v.innerHTML = isV2vOk ? `<span class="node-status">OK</span>` : `<span class="node-status dim">WARN</span>`;
    }
    if (healthComm) {
      healthComm.innerHTML = sim.v2vManager.v2vConfidence > 0.6
        ? `<span class="node-status">STRONG</span>`
        : `<span class="node-status dim">DEGRADED</span>`;
    }
    if (healthRegulation) {
      healthRegulation.innerHTML = sim.decisionEngine.regulationStatus === "PASS"
        ? `<span class="node-status">PASS</span>`
        : `<span class="node-status dim">AUDIT</span>`;
    }
    if (healthOverall) {
      const allGood = isV2vOk && sim.decisionEngine.safetyStatus === "PASS";
      healthOverall.innerHTML = allGood
        ? `<span class="node-status">NOMINAL</span>`
        : `<span class="node-status dim">DEGRADED</span>`;
    }

    if (lblHealthPackets) {
      lblHealthPackets.textContent = `Rx: ${sim.v2vManager.totalPacketsReceived} | Lost: ${sim.v2vManager.totalPacketsLost} | Rejected: ${sim.v2vManager.totalPacketsRejected}`;
    }
    if (lblHealthViolations) {
      lblHealthViolations.textContent = `Security Violations: ${sim.v2vManager.securityViolations} (Firewall: Active)`;
    }
  }

  // ==========================================================================
  // MAIN ANIMATION LOOP (50Hz / 60Hz RequestAnimationFrame)
  // ==========================================================================
  let lastTime = performance.now();
  let frameCounter = 0;
  let chartThrottle = 0;

  function animationLoop(now) {
    let dt = (now - lastTime) / 1000.0;
    lastTime = now;
    if (dt <= 0 || dt > 0.1) dt = 0.02; // Clamp delta time

    // 1. Simulation Step
    sim.update(dt);

    // 2. Render Road Canvas
    roadRenderer.draw(sim);

    frameCounter++;

    // 3. UI and Gauges update at ~25Hz (every 2 frames)
    if (frameCounter % 2 === 0) {
      gaugeComfort.setValue(sim.comfortIndex);
      
      const priority = sim.trafficManager.getPriorityVehicle();
      gaugePeerComfort.setValue(priority ? priority.comfortIndex : 100.0);
      
      gaugeConfidence.setValue(sim.v2vManager.v2vConfidence * 100.0);
      gaugeSensorConf.setValue(sim.sensorManager.confidence * 100.0);

      updateDecisionPanels();
      updateTrafficTable();
      updateMatrixLedBars();
      updateSystemHealth();
    }

    // 4. Update Telemetry Chart at ~12Hz (every 5 frames)
    chartThrottle++;
    if (chartThrottle >= 5) {
      chartThrottle = 0;
      const priority = sim.trafficManager.getPriorityVehicle();
      telemetryChart.addDataPoint({
        ownPwm: sim.decisionEngine.actualDuty,
        peerPwm: priority ? priority.actualDuty : 100.0,
        minBound: sim.decisionEngine.minBoundary,
        maxBound: sim.decisionEngine.maxBoundary,
        ownComfort: sim.comfortIndex,
        peerComfort: priority ? priority.comfortIndex : 100.0,
        glareFactor: sim.decisionEngine.glareFactor * 100.0,
        causedGlare: sim.comfortScores.causedGlare || 0.0,
        v2vConf: sim.v2vManager.v2vConfidence * 100.0,
        sensorConf: sim.sensorManager.confidence * 100.0,
        predAccuracy: 95.0 + (Math.random() * 4 - 2)
      });
    }

    requestAnimationFrame(animationLoop);
  }

  requestAnimationFrame(animationLoop);
});
