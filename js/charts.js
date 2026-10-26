/**
 * LUMISYNX v2.0 / LumiSynx - Telemetry Charts & Circular SVG Dial Gauges
 * Strict Minimalist Monochrome Edition: Pure Black, White, and Greys
 * Series distinguished by line style (solid, dashed, dotted), no colors, zero glow.
 */

// ============================================================================
// 1. TELEMETRY LINE CHART (Multi-Series Monochrome Canvas Plot)
// ============================================================================
class TelemetryChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.maxPoints = 90;
    this.activeTab = "brightness"; // "brightness", "comfort", "v2v"

    this.configs = {
      brightness: {
        title: "LUMINANCE PWM (%) & SAFETY BOUNDARIES",
        yMin: 0,
        yMax: 100,
        series: [
          { key: "ownPwm", name: "Own PWM", color: "#ffffff", width: 1.5, dash: [] },
          { key: "peerPwm", name: "Peer PWM", color: "#aaaaaa", width: 1.5, dash: [6, 4] },
          { key: "maxBound", name: "Max Bound", color: "#ffffff", width: 1.5, dash: [2, 3] },
          { key: "minBound", name: "Min Bound", color: "#666666", width: 1.5, dash: [2, 3] }
        ]
      },
      comfort: {
        title: "HUMAN COMFORT INDEX & GLARE INTENSITY (%)",
        yMin: 0,
        yMax: 100,
        series: [
          { key: "ownComfort", name: "Own Comfort", color: "#ffffff", width: 1.5, dash: [] },
          { key: "peerComfort", name: "Peer Comfort", color: "#aaaaaa", width: 1.5, dash: [6, 4] },
          { key: "glareFactor", name: "Received Glare", color: "#ffffff", width: 1.5, dash: [2, 3] },
          { key: "causedGlare", name: "Caused Glare", color: "#666666", width: 1.5, dash: [2, 3] }
        ]
      },
      v2v: {
        title: "V2V NETWORK HEALTH & PREDICTION ACCURACY (%)",
        yMin: 0,
        yMax: 100,
        series: [
          { key: "v2vConf", name: "V2V Conf.", color: "#ffffff", width: 1.5, dash: [] },
          { key: "sensorConf", name: "Sensor Conf.", color: "#aaaaaa", width: 1.5, dash: [6, 4] },
          { key: "predAccuracy", name: "Pred. Accuracy", color: "#666666", width: 1.5, dash: [2, 3] }
        ]
      }
    };

    this.data = {
      ownPwm: [],
      peerPwm: [],
      minBound: [],
      maxBound: [],
      ownComfort: [],
      peerComfort: [],
      glareFactor: [],
      causedGlare: [],
      v2vConf: [],
      sensorConf: [],
      predAccuracy: []
    };

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setTab(tabName) {
    if (this.configs[tabName]) {
      this.activeTab = tabName;
      this.draw();
    }
  }

  addDataPoint(point) {
    for (const [key, val] of Object.entries(point)) {
      if (this.data[key]) {
        this.data[key].push(val);
        if (this.data[key].length > this.maxPoints) {
          this.data[key].shift();
        }
      }
    }
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cfg = this.configs[this.activeTab];

    ctx.clearRect(0, 0, w, h);

    const xStart = 38;
    const xEnd = w - 14;
    const yStart = 26;
    const yEnd = h - 20;

    // Faint grey grid lines & Y-axis labels
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#8a8a8a";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";

    for (let i = 0; i <= 4; i++) {
      const frac = i / 4.0;
      const y = yEnd - frac * (yEnd - yStart);
      const val = cfg.yMin + frac * (cfg.yMax - cfg.yMin);

      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();

      ctx.fillText(`${val.toFixed(0)}%`, xStart - 6, y + 3);
    }

    // Axes (thin monochrome)
    ctx.strokeStyle = "#2a2a2a";
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xStart, yEnd);
    ctx.lineTo(xEnd, yEnd);
    ctx.stroke();

    // Chart Title (uppercase small label)
    ctx.textAlign = "left";
    ctx.font = "600 9px 'Inter', sans-serif";
    ctx.fillStyle = "#8a8a8a";
    ctx.fillText(cfg.title, xStart, 14);

    // Legend items on top-right (showing exact line style swatches)
    let legX = xEnd;
    ctx.textAlign = "right";
    for (let i = cfg.series.length - 1; i >= 0; i--) {
      const s = cfg.series[i];
      const textWidth = ctx.measureText(s.name).width;

      // Draw line style swatch
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      if (s.dash && s.dash.length > 0) {
        ctx.setLineDash(s.dash);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(legX - 16, 10);
      ctx.lineTo(legX, 10);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#8a8a8a";
      ctx.font = "8px 'Inter', sans-serif";
      ctx.fillText(s.name, legX - 22, 13);
      legX -= (textWidth + 34);
    }

    // Draw Series Lines (1.5px lines, no glow)
    const dx = (xEnd - xStart) / (this.maxPoints - 1);
    const dy = (yEnd - yStart) / (cfg.yMax - cfg.yMin);

    for (const s of cfg.series) {
      const pts = this.data[s.key] || [];
      if (pts.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width || 1.5;
      if (s.dash && s.dash.length > 0) {
        ctx.setLineDash(s.dash);
      } else {
        ctx.setLineDash([]);
      }
      ctx.shadowBlur = 0; // Strict zero glow

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const px = xStart + (this.maxPoints - pts.length + i) * dx;
        const clamped = Math.max(cfg.yMin, Math.min(cfg.yMax, pts[i]));
        const py = yEnd - (clamped - cfg.yMin) * dy;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ============================================================================
// 2. CIRCULAR SVG DIAL GAUGE (Monochrome: White Arc on Grey Track)
// ============================================================================
class CircularGauge {
  constructor(elementId, title, unit = "%", defaultColor = "#ffffff") {
    this.container = document.getElementById(elementId);
    this.title = title;
    this.unit = unit;
    this.defaultColor = "#ffffff";
    this.currentValue = 0;
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="gauge-item">
        <svg class="gauge-svg" viewBox="0 0 100 60">
          <!-- Background Track Arc -->
          <path class="bg-arc" d="M 15 50 A 35 35 0 0 1 85 50" />
          <!-- Foreground Value Arc (Monochrome White) -->
          <path class="val-arc" id="${this.container.id}-val-arc"
                d="M 15 50 A 35 35 0 0 1 85 50"
                stroke="#ffffff"
                stroke-dasharray="110"
                stroke-dashoffset="110" />
        </svg>
        <div class="gauge-val-text font-mono" id="${this.container.id}-val-text">0.0${this.unit}</div>
        <div class="gauge-label">${this.title}</div>
      </div>
    `;
    this.arcEl = document.getElementById(`${this.container.id}-val-arc`);
    this.textEl = document.getElementById(`${this.container.id}-val-text`);
  }

  setValue(val) {
    this.currentValue = Math.max(0, Math.min(100, val));
    if (this.arcEl && this.textEl) {
      const offset = 110 - (this.currentValue / 100.0) * 110;
      this.arcEl.style.strokeDashoffset = offset;
      this.arcEl.style.stroke = "#ffffff";
      this.textEl.style.color = "#ffffff";
      this.textEl.textContent = `${this.currentValue.toFixed(1)}${this.unit}`;
    }
  }
}
