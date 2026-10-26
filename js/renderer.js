/**
 * LUMISYNX v2.0 / LumiSynx - High Performance HTML5 Canvas Road Renderer
 * Minimalist Monochrome Edition: Pure Black, White, and Greys
 */

class RoadRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    // Road geometry
    this.roadTop = 75;
    this.roadMid = 145; // Center divider
    this.roadBottom = 215;
    
    this.laneOwn = 110;   // Own car lane (→)
    this.lanePeer = 180;  // Peer car lane (←)
    
    // Monochrome Palette
    this.grassColor = "#000000";
    this.roadColor = "#0e0e0e";
    this.dividerColor = "#ffffff";
    this.ownCarColor = "#1a1a1a";
    this.ownOutline = "#ffffff";
    this.peerCarColor = "#141414";
    this.peerOutline = "#8a8a8a";

    // Animated particles
    this.weatherParticles = [];
    this.initWeatherParticles();
    
    // Resize handling for Retina / High-DPI screens
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
    
    // Dynamic road positioning
    this.roadMid = Math.floor(this.height * 0.5);
    this.roadTop = this.roadMid - 70;
    this.roadBottom = this.roadMid + 70;
    this.laneOwn = this.roadMid - 35;
    this.lanePeer = this.roadMid + 35;
  }

  initWeatherParticles() {
    this.weatherParticles = [];
    for (let i = 0; i < 90; i++) {
      this.weatherParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 320,
        speed: 4 + Math.random() * 6,
        length: 8 + Math.random() * 12,
        size: 1 + Math.random() * 2
      });
    }
  }

  // ==========================================================================
  // MAIN DRAW LOOP
  // ==========================================================================
  draw(sim) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Road & Infrastructure
    this.drawRoad(sim, w, h);

    // 2. Road Type Special Environments
    if (sim.roadType === "Tunnel") {
      this.drawTunnel(sim, w);
    } else if (sim.roadType === "Urban") {
      this.drawUrbanStreetlights(sim, w);
    }

    // 3. Draw Own Vehicle (Own Car V2V-101) & Headlights
    const ox = sim.ownX;
    const oy = this.laneOwn;
    const ownDuty = sim.decisionEngine.actualDuty;
    
    this.drawHeadlightBeam(ox, oy, +1, ownDuty, sim.decisionEngine.matrixSegmentsRight);
    this.drawVehicle(ox, oy, +1, true, `OWN  V2V-101  ${ownDuty.toFixed(0)}%`, false, false);

    // 4. Draw Peer Vehicles (Oncoming Cars V2V-102+)
    const priority = sim.trafficManager.getPriorityVehicle();
    for (const veh of Object.values(sim.trafficManager.vehicles)) {
      const peerDuty = veh.actualDuty;
      const vy = this.lanePeer;

      // Peer Headlight Beams (Shining left -1)
      this.drawHeadlightBeam(veh.x, vy, -1, peerDuty, veh.controller?.matrixSegmentsRight);

      // Trajectory Prediction (2.0-second forecast line)
      if (veh.v2vEnabled && sim.simMode === "sim") {
        const predX = veh.x - (veh.speed / 3.6) * 2.0 * 8.0;
        ctx.save();
        ctx.strokeStyle = "#8a8a8a";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(veh.x, vy);
        ctx.lineTo(predX, vy);
        ctx.stroke();

        ctx.fillStyle = "#8a8a8a";
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText("2.0s PROJ", predX - 10, vy - 12);
        ctx.restore();
      }

      // V2V Communication Link
      if (sim.v2vManager.v2vEnabled && veh.v2vEnabled) {
        const link = sim.v2vManager.linkStates[veh.id];
        if (link && link.quality > 0.15) {
          this.drawV2VLink(ox, oy, veh.x, vy, link.quality, link);
        }
      }

      const isPri = priority && priority.id === veh.id;
      this.drawVehicle(veh.x, vy, -1, false, `PEER  ${veh.id}  ${peerDuty.toFixed(0)}%`, isPri, veh.isEmergency);
    }

    // 5. Weather Effects
    this.drawWeather(sim.weatherModel.currentWeatherName, w, h);
  }

  // ==========================================================================
  // ROAD DRAWING
  // ==========================================================================
  drawRoad(sim, w, h) {
    const ctx = this.ctx;

    // Grass / Verge (black background)
    ctx.fillStyle = this.grassColor;
    ctx.fillRect(0, 0, w, this.roadTop);
    ctx.fillRect(0, this.roadBottom, w, h - this.roadBottom);

    // Asphalt surface (dark monochrome surface)
    ctx.fillStyle = this.roadColor;
    ctx.fillRect(0, this.roadTop, w, this.roadBottom - this.roadTop);

    // Shoulder lines
    ctx.strokeStyle = "#222222";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.roadTop + 5);
    ctx.lineTo(w, this.roadTop + 5);
    ctx.moveTo(0, this.roadBottom - 5);
    ctx.lineTo(w, this.roadBottom - 5);
    ctx.stroke();

    // Solid Edge Kerbs
    ctx.strokeStyle = "#383838";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.roadTop);
    ctx.lineTo(w, this.roadTop);
    ctx.moveTo(0, this.roadBottom);
    ctx.lineTo(w, this.roadBottom);
    ctx.stroke();

    // Center Double White Divider
    ctx.strokeStyle = this.dividerColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, this.roadMid - 2.5);
    ctx.lineTo(w, this.roadMid - 2.5);
    ctx.moveTo(0, this.roadMid + 2.5);
    ctx.lineTo(w, this.roadMid + 2.5);
    ctx.stroke();

    // Dashed Lane Center Markings
    const speedScroll = sim.isRunning && sim.simMode === "sim" ? (Date.now() * 0.05 * (sim.decisionEngine.ownSpeed / 50.0)) % 40 : 0;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([16, 16]);
    ctx.lineDashOffset = -speedScroll;

    ctx.beginPath();
    ctx.moveTo(0, (this.roadTop + this.roadMid) / 2);
    ctx.lineTo(w, (this.roadTop + this.roadMid) / 2);
    ctx.moveTo(0, (this.roadMid + this.roadBottom) / 2);
    ctx.lineTo(w, (this.roadMid + this.roadBottom) / 2);
    ctx.stroke();
    ctx.restore();

    // Distance Km Markers along Roadside
    const markerOffset = sim.isRunning && sim.simMode === "sim" ? (Date.now() * 0.04 * (sim.decisionEngine.ownSpeed / 50.0)) % 160 : 0;
    ctx.fillStyle = "#2a2a2a";
    for (let x = -160; x <= w + 160; x += 160) {
      const px = x - markerOffset;
      if (px >= 0 && px <= w) {
        ctx.fillRect(px - 2, this.roadTop - 12, 4, 10);
        ctx.fillRect(px - 2, this.roadBottom + 2, 4, 10);
      }
    }
  }

  // ==========================================================================
  // URBAN STREETLIGHTS
  // ==========================================================================
  drawUrbanStreetlights(sim, w) {
    const ctx = this.ctx;
    for (let lx = 50; lx < w + 100; lx += 180) {
      // Lamp pole
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(lx - 1.5, this.roadTop - 24, 3, 24);
      ctx.fillStyle = "#666666";
      ctx.fillRect(lx - 6, this.roadTop - 28, 12, 4);

      // Radial monochrome ambient light cone on road
      const grad = ctx.createRadialGradient(lx, this.roadTop + 20, 4, lx, this.roadTop + 20, 60);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      grad.addColorStop(0.6, "rgba(255, 255, 255, 0.04)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, this.roadTop + 20, 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // TUNNEL INFRASTRUCTURE
  // ==========================================================================
  drawTunnel(sim, w) {
    const ctx = this.ctx;
    ctx.fillStyle = "#141414";
    ctx.fillRect(0, this.roadTop - 28, w, 28);
    ctx.fillRect(0, this.roadBottom, w, 28);

    const shift = (Date.now() * 0.08 * (sim.decisionEngine.ownSpeed / 40.0)) % 90;
    ctx.fillStyle = "#262626";
    for (let x = -90; x < w + 90; x += 90) {
      const sx = x - shift;
      ctx.fillRect(sx, this.roadTop - 26, 8, 26);
      ctx.fillRect(sx, this.roadBottom, 8, 26);
    }
  }

  // ==========================================================================
  // HEADLIGHT BEAM (Pure White Monochrome Gradients)
  // ==========================================================================
  drawHeadlightBeam(x, y, dir, duty, matrixSegments = null) {
    if (duty <= 4.0) return;
    const ctx = this.ctx;

    const frac = (duty - 4.0) / 96.0;
    const beamLength = 40 + frac * 280; // Up to 320px throw
    const beamWidth = 10 + frac * 75;   // Up to 85px spread

    const tipX = x + dir * 22; // Front bumper
    const tipY = y;

    ctx.save();

    // 1. Multi-Stage Gradient Cone (Pure Monochrome White)
    for (let i = 7; i >= 1; i--) {
      const s = i / 7.0;
      const bx = tipX + dir * beamLength * s;
      const by1 = tipY - beamWidth * s;
      const by2 = tipY + beamWidth * s;
      const alpha = frac * s * 0.16;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(bx, by1);
      ctx.lineTo(bx, by2);
      ctx.closePath();
      ctx.fill();
    }

    // 2. High-Intensity Hotspot Core
    const hotLen = 20 + frac * 35;
    const hotWid = 6 + frac * 14;
    const hx = tipX + dir * hotLen;

    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * frac})`;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(hx, tipY - hotWid);
    ctx.lineTo(hx, tipY + hotWid);
    ctx.closePath();
    ctx.fill();

    // 3. Radial Halo near Lens
    const haloR = 10 + frac * 20;
    const haloGrad = ctx.createRadialGradient(tipX, tipY, 2, tipX, tipY, haloR);
    haloGrad.addColorStop(0, `rgba(255, 255, 255, ${0.35 * frac})`);
    haloGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(tipX, tipY, haloR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Matrix LED Adaptive Cutout Beam Ray Visualization
    if (matrixSegments && matrixSegments.some(val => val < duty - 10)) {
      ctx.lineWidth = 1;
      for (let seg = 0; seg < 8; seg++) {
        const segDuty = matrixSegments[seg];
        const segFrac = segDuty / 100.0;
        const segAngle = ((seg - 3.5) / 4.0) * 0.28; // Spread angles
        const rayLen = beamLength * (0.4 + segFrac * 0.6);
        const rayX = tipX + dir * rayLen * Math.cos(segAngle);
        const rayY = tipY + rayLen * Math.sin(segAngle);

        ctx.strokeStyle = `rgba(255, 255, 255, ${segFrac * 0.22})`;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(rayX, rayY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ==========================================================================
  // TOP-DOWN VEHICLE SPRITE (Monochrome Styling)
  // ==========================================================================
  drawVehicle(x, y, dir, isOwn, label, isPriority = false, isEmergency = false) {
    const ctx = this.ctx;
    const lp = 44; // Length
    const wp = 20; // Width

    ctx.save();

    // Priority outline targeting box (white dashed)
    if (isPriority) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x - lp / 2 - 6, y - wp / 2 - 6, lp + 12, wp + 12);
      ctx.setLineDash([]);
    }

    // Wheels (4 corners)
    ctx.fillStyle = "#141414";
    const wheelL = 10;
    const wheelW = 4;
    for (const sx of [-0.3, 0.3]) {
      for (const sy of [-1, 1]) {
        const wx = x + sx * lp;
        const wy = sy === -1 ? y - wp / 2 - wheelW : y + wp / 2;
        ctx.fillRect(wx - wheelL / 2, wy, wheelL, wheelW);
      }
    }

    // Main Chassis
    const baseColor = isOwn ? this.ownCarColor : this.peerCarColor;
    const outlineColor = isOwn ? this.ownOutline : this.peerOutline;

    ctx.fillStyle = baseColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.5;
    ctx.fillRect(x - lp / 2, y - wp / 2, lp, wp);
    ctx.strokeRect(x - lp / 2, y - wp / 2, lp, wp);

    // Cabin roof
    const roofL = lp * 0.45;
    const roofW = wp - 6;
    const roofX = x + dir * lp * 0.05;
    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(roofX - roofL / 2, y - roofW / 2, roofL, roofW);

    // Windshield (front)
    const windX = roofX + dir * roofL / 2;
    ctx.fillStyle = isOwn ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(windX - 2, y - roofW / 2 + 1, 4, roofW - 2);

    // Front Headlight Diodes
    const hx = x + dir * lp / 2;
    ctx.fillStyle = "#ffffff";
    for (const dy of [-wp * 0.3, wp * 0.3]) {
      ctx.beginPath();
      ctx.arc(hx, y + dy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rear Taillights (Monochrome subtle grey)
    const tx = x - dir * lp / 2;
    ctx.fillStyle = isOwn ? "#666666" : "#444444";
    for (const dy of [-wp * 0.3, wp * 0.3]) {
      ctx.beginPath();
      ctx.arc(tx, y + dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Emergency Flashing Beacon (Monochrome strobe)
    if (isEmergency) {
      const flash = (Date.now() / 150) % 2 > 1;
      ctx.fillStyle = flash ? "#ffffff" : "#444444";
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label below car
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = outlineColor;
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + wp / 2 + 13);

    ctx.restore();
  }

  // ==========================================================================
  // V2V COMMUNICATION WIRELESS LINK (Monochrome)
  // ==========================================================================
  drawV2VLink(x1, y1, x2, y2, quality, linkState) {
    const ctx = this.ctx;

    let status = "STRONG";
    if (quality < 0.35) {
      status = "POOR";
    } else if (quality < 0.6) {
      status = "WEAK";
    } else if (quality < 0.8) {
      status = "GOOD";
    }

    ctx.save();

    // Dashed Wireless Line
    const offset = (Date.now() * 0.03) % 12;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -offset;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Flowing Data Packets (White Dots)
    const t1 = (Date.now() * 0.0012) % 1.0;
    const px1 = x1 + (x2 - x1) * t1;
    const py1 = y1 + (y2 - y1) * t1;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px1, py1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const t2 = (t1 + 0.5) % 1.0;
    const px2 = x1 + (x2 - x1) * t2;
    const py2 = y1 + (y2 - y1) * t2;
    ctx.fillStyle = "#8a8a8a";
    ctx.beginPath();
    ctx.arc(px2, py2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Midpoint Quality Badge
    const mx = (x1 + x2) / 2;
    const my = Math.min(y1, y2) - 18;

    ctx.fillStyle = "#000000";
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.fillRect(mx - 38, my - 11, 76, 22);
    ctx.strokeRect(mx - 38, my - 11, 76, 22);

    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(`V2V ${status}`, mx, my - 2);

    ctx.font = "7px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#8a8a8a";
    ctx.fillText(`${(quality * 100).toFixed(0)}% | ${linkState.rssi}dBm`, mx, my + 7);

    ctx.restore();
  }

  // ==========================================================================
  // WEATHER PARTICLE SIMULATION (Monochrome Greys)
  // ==========================================================================
  drawWeather(weather, w, h) {
    if (weather === "Clear") return;
    const ctx = this.ctx;

    if (weather === "Rain" || weather === "Heavy Rain") {
      ctx.strokeStyle = weather === "Rain" ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 1;

      for (const p of this.weatherParticles) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 2, p.y + p.length);
        ctx.stroke();

        p.x -= 1.5;
        p.y += p.speed;
        if (p.y > h) {
          p.y = -10;
          p.x = Math.random() * w;
        }
      }
    } else if (weather === "Fog") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(0, this.roadTop, w, this.roadBottom - this.roadTop);
    } else if (weather === "Dust") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(0, 0, w, h);
    } else if (weather === "Mist") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(0, 0, w, h);
    }
  }
}
