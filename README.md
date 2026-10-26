# LUMISYNX v2.0 / LumiSynx
### Cooperative Adaptive Headlight & V2V Intelligence Digital Twin

[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](https://opensource.org/licenses/MIT)
[![Platform: Web / ESP32-S3](https://img.shields.io/badge/Platform-Web%20%7C%20ESP32--S3-000000.svg)](https://espressif.com/)
[![Standards: ECE R123 | AIS-008](https://img.shields.io/badge/Standards-ECE%20R123%20%7C%20AIS--008-black.svg)](https://unece.org/)

LUMISYNX v2.0 (LumiSynx) is an automotive digital twin and embedded simulation platform for **Cooperative Vehicle-to-Vehicle (V2V) Adaptive Driving Beam (ADB)** lighting. Approaching vehicles exchange kinematic telemetry over low-latency RF wireless before visual line-of-sight to collaboratively negotiate beam shaping, eliminating oncoming blinding glare while maximizing driver forward stopping sight distance.

---

## Live Web Digital Twin

The web application runs entirely client-side with zero external build dependencies:
- **60 FPS Bird's-Eye Road Simulation Canvas** with real-time beam ray-tracing and weather simulation (Rain, Fog, Dust, Urban, Tunnel).
- **Explainable AI (XAI) Decision Panels** providing transparent real-time reasoning for both host and peer vehicles.
- **8-Sector Matrix LED Power Distribution Graphic** showing selective azimuth beam masking.
- **Multi-Series Telemetry Line Charts & SVG Dial Gauges** with monochrome dash-pattern series differentiation.
- **Virtual UART Serial Console & Telemetry CSV Exporter**.
- **Interactive 15-Slide Architecture Deck** embedded in-app.

---

## Repository Structure

```
├── index.html                   # Main web application entry point
├── css/
│   └── style.css                # Strict minimalist monochrome design system
├── js/
│   ├── app.js                   # Application coordinator & event wiring
│   ├── renderer.js              # HTML5 2D bird's-eye canvas graphics engine
│   ├── charts.js                # Telemetry line plots & circular SVG gauges
│   ├── simulation.js            # Dual-vehicle kinematic physics coordinator
│   ├── engine.js                # Decision engine & Explainable AI logic
│   ├── models.js                # Optical sensor, V2V transceiver & comfort models
│   ├── audio.js                 # Web Audio API synthesized sonic feedback
│   └── slides.js                # Embedded 15-slide technical architecture deck
│
├── *.py                         # Python embedded logic & validation modules
│   ├── LUMISYNX.py               # Python CLI simulation entry point
│   ├── decision_engine.py       # Algorithmic decision pipeline
│   ├── v2v_manager.py           # V2V packet transceiver & kinematic firewall
│   ├── sensor_manager.py        # Optical photodiode & ambient fusion
│   ├── comfort_model.py         # Human comfort index calculator
│   ├── regulation_manager.py    # ECE R123 & AIS-008 regulatory envelopes
│   ├── traffic_manager.py       # Autonomous multi-vehicle traffic coordinator
│   └── calibration_manager.py   # Non-volatile flash (NVS) parameter persistence
└── README.md
```

---

## How to Host on GitHub Pages

1. **Push or upload** the files to your GitHub repository.
2. In your repository on GitHub, navigate to **Settings** &rarr; **Pages** (under the "Code and automation" sidebar section).
3. Under **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: Select `main` (or `master`) and folder `/ (root)`
   - Click **Save**.
4. GitHub Pages will build and deploy the site in approximately 30–60 seconds.
5. Your live simulation URL will be:
   ```
   https://<your-username>.github.io/<your-repository-name>/
   ```

---

## Core System Architecture

```
[ Ambient Sensor (BH1750) ] ────┐
                                ├──► [ Optical Sensor Fusion ] ──┐
[ Photodiode ADC (OPT101) ] ────┘                                │
                                                                 ├──► [ Explainable AI ] ──► [ 8-Segment Matrix LED ]
[ 2.4GHz V2V (ESP-NOW) ] ──► [ Kinematic Firewall ] ─────────────┘    (Slew-Rate Clamped)
                               (Anti-Spoofing & Failover)
```

- **ESP32-S3 Dual-Core Implementation**: Core 0 runs real-time sensor acquisition and decision logic at 100 Hz; Core 1 manages 2.4 GHz RF V2V transceiver buffers (<15ms latency).
- **Matrix LED Beam Shaping**: Selectively cuts out only the spatial angular sectors covering approaching drivers, preserving 100% illumination on own lane and curbside.
- **Kinematic Firewall**: Quarantines anomalous acceleration or GPS spoofing with <10ms autonomous fallback to optical-only mode.
- **Regulatory Standards**: Conforms to ECE R123 (Class C/E/V/W adaptive cutoffs) and AIS-008.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
