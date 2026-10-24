/**
 * MAXTRIX v2.0 / LumiSynx - Complete Architecture Slides Data
 * Ports all 15 technical presentation slides from create_presentation.py
 */

const SLIDES_DATA = [
  {
    num: "01",
    title: "LumiSynx / MAXTRIX v2.0",
    subtitle: "Cooperative Adaptive Headlight & V2V Intelligence System",
    category: "Overview",
    cards: [
      {
        title: "Digital Twin & Embedded Architecture",
        desc: "A cooperative automotive lighting intelligence system that links oncoming vehicles via low-latency Vehicle-to-Vehicle (V2V) wireless communications to collaboratively dim and shape headlight beams.",
        items: ["Dual-core ESP32-S3 real-time platform", "High-speed optical photodiode sensor fusion", "Sub-15ms wireless packet exchange"]
      },
      {
        title: "Key Innovations",
        desc: "Eliminates high-beam blinding glare while maximizing driver forward stopping sight distance.",
        items: ["Dual-vehicle independent closed-loop controllers", "Explainable AI (XAI) transparent reasoning", "Kinematic firewall against V2V spoofing attacks"]
      }
    ]
  },
  {
    num: "02",
    title: "Table of Contents",
    subtitle: "15 Architectural Subsystems & System Modules",
    category: "Agenda",
    cards: [
      {
        title: "Foundations & Perception",
        desc: "Core challenges and sensor modeling",
        items: ["01. Problem: Night Glare Hazards", "02. Solution: Cooperative Headlights", "03. System Architecture", "04. Optical Sensor Fusion"]
      },
      {
        title: "Control & Coordination",
        desc: "Algorithmic decision pipeline",
        items: ["05. Decision Engine & XAI", "06. V2V Networking Protocol", "07. Predictive Trajectory Engine", "08. Human Comfort Model"]
      },
      {
        title: "Safety, Security & Validation",
        desc: "Hardening and digital twin testing",
        items: ["09. Regulatory Compliance (ECE/AIS)", "10. Security & Kinematic Firewall", "11. Digital Twin Simulation", "12. NVS Calibration Tuning"]
      }
    ]
  },
  {
    num: "03",
    title: "Problem Statement: Night-Time Driving Glare",
    subtitle: "The Critical Safety Hazard of Modern High-Intensity Headlights",
    category: "Problem",
    cards: [
      {
        title: "Crash Statistics",
        desc: "Over 40% of all fatal roadway accidents occur after dark despite only 25% of traffic moving at night.",
        items: ["Troxler fading: 3 to 8 seconds temporary driver blindness", "High-intensity LED headlamps increase complaints by 800%", "Conventional Auto-High-Beam (AHB) cameras react too late (>1.2s lag)"]
      },
      {
        title: "The Technological Dilemma",
        desc: "If you dim headlights, the driver cannot see pedestrians or hazards. If you keep high beams on, oncoming drivers are blinded.",
        items: ["Camera systems fail in rain, fog, and around highway bends", "No communication between approaching vehicles", "Single-point optical sensors are prone to back-scatter blinding"]
      }
    ]
  },
  {
    num: "04",
    title: "The LumiSynx Solution",
    subtitle: "Cooperative Vehicle-to-Vehicle Adaptive Beam Synchronization",
    category: "Solution",
    cards: [
      {
        title: "Advance Wireless Coordination",
        desc: "Vehicles broadcast their GNSS position, speed, and heading via ESP-NOW / 802.11p V2V wireless protocol.",
        items: ["50m to 80m advance notice before optical line-of-sight", "Pre-emptive dimming eliminates transient flash glare", "Mutual courtesy agreement: both cars dim smoothly in unison"]
      },
      {
        title: "Matrix Selective Beam Masking",
        desc: "Multi-segment LED array selectively turns off only the angle sectors covering oncoming vehicles.",
        items: ["Preserves full roadside illumination on kerbs and pedestrians", "Driver retains 100% sight line in own lane", "Zero glare penalty inflicted on oncoming traffic"]
      }
    ]
  },
  {
    num: "05",
    title: "System Hardware & Software Architecture",
    subtitle: "Asynchronous Dual-Core Real-Time Implementation",
    category: "Architecture",
    cards: [
      {
        title: "ESP32-S3 Hardware Layer",
        desc: "Separates real-time control physics from RF wireless networking.",
        items: [
          "Core 0 (100Hz): Optical sensor acquisition, Human Comfort Model & Decision Engine",
          "Core 1: 2.4GHz V2V transceiver, packet serializer & RSSI quality estimator",
          "Peripherals: OPT101 photodiode (ADC), BH1750 ambient light (I2C), PWM LED drivers"
        ]
      },
      {
        title: "Software Modularity",
        desc: "Decoupled architecture ready for direct hardware flashing or web simulation.",
        items: [
          "Zero OS dependencies - pure embedded C / Python / Web JS compatibility",
          "Asynchronous event queue for UART serial telemetry streaming",
          "Persistent NVS flash storage for calibration parameters"
        ]
      }
    ]
  },
  {
    num: "06",
    title: "Decision Engine Pipeline",
    subtitle: "Multi-Stage Deterministic Luminance Computation",
    category: "Decision Engine",
    cards: [
      {
        title: "Stage 1 to 4: Dimming Request Calculation",
        desc: "Fuses ambient baseline, optical photodiode glare, and cooperative V2V request factors.",
        items: [
          "1. Baseline: Determined by ambient lux (Day = 5% DRL, Night = 100% full beam)",
          "2. Optical Glare: Raw photodiode voltage scaled by closing speed factor",
          "3. Cooperative CRF: Heading opposition factor * distance proximity threshold",
          "4. 2.0s Prediction: Pre-emptive trajectory projection dimming"
        ]
      },
      {
        title: "Stage 5 to 7: Safety Envelopes & Slew-Rate Limiter",
        desc: "Guarantees that illumination never falls below stopping distance requirements.",
        items: [
          "5. Speed-Dependent Min Boundary: Higher speed demands higher minimum light",
          "6. Weather Max Boundary: Heavy rain & fog caps beam to prevent blinding backscatter",
          "7. Slew-Rate Limiter: Capped at 5%/100ms (50%/s) to eliminate human eye strain and flickering"
        ]
      }
    ]
  },
  {
    num: "07",
    title: "V2V Wireless Communication Protocol",
    subtitle: "Sub-15ms Low-Latency Direct Vehicle Interconnect",
    category: "V2V Protocol",
    cards: [
      {
        title: "Protocol Specifications",
        desc: "Built on lightweight direct peer-to-peer radio frames without requiring cell towers or cloud servers.",
        items: [
          "Packet size: 32 bytes binary serialized payload",
          "Fields: Sequence, Vehicle ID, Class, Speed, Heading, X/Y coordinates, PWM %, Timestamp",
          "Transmission rate: 20Hz broadcast heartbeat",
          "Effective range: 150m in open highway conditions"
        ]
      },
      {
        title: "Channel Quality Estimation",
        desc: "Continuous monitoring of link health using RSSI decay and packet loss tracking.",
        items: [
          "RSSI > -70 dBm: Strong Link (>90% confidence)",
          "RSSI -70 to -85 dBm: Moderate Link (10-20% packet loss)",
          "RSSI < -85 dBm: Automated graceful fallback to optical photodiode sensing"
        ]
      }
    ]
  },
  {
    num: "08",
    title: "Optical Glare & Sensor Fusion",
    subtitle: "Local Photodiode Perception & Speed Scaling",
    category: "Perception",
    cards: [
      {
        title: "OPT101 Monolithic Photodiode",
        desc: "On-chip transimpedance amplifier provides microsecond response times to oncoming headlight wavefronts.",
        items: [
          "Linear 0.0V to 3.3V analog output directly coupled to ESP32 ADC",
          "Narrow optical aperture filter limits ambient side reflections",
          "Quadratic inverse square law modeling: Intensity ~ 1 / (Distance² + 1)"
        ]
      },
      {
        title: "Closing Speed Dynamic Amplification",
        desc: "Higher relative closing speeds increase glare hazard to human visual reaction time.",
        items: [
          "Formula: Glare_Factor = (V_pd * Gain * (1.0 + 0.003 * V_closing)) / 3.3",
          "Sensor confidence weighting suppresses sensor noise during severe rain and fog",
          "Seamless fusion with cooperative V2V data stream"
        ]
      }
    ]
  },
  {
    num: "09",
    title: "Predictive Trajectory Intelligence",
    subtitle: "2.0-Second Kinematic Forecast Horizon",
    category: "Prediction",
    cards: [
      {
        title: "Kinematic Projection Formula",
        desc: "Computes where every tracked oncoming vehicle will be 2.0 seconds into the future.",
        items: [
          "X_proj = X_curr + (Speed / 3.6) * cos(Heading) * Horizon",
          "Y_proj = Y_curr + (Speed / 3.6) * sin(Heading) * Horizon",
          "Anticipates oncoming vehicles emerging from blind curves or highway dips"
        ]
      },
      {
        title: "Pre-Emptive Beam Shaping",
        desc: "Starts dimming or selective cutout before the oncoming driver enters direct line of sight.",
        items: [
          "Eliminates transient 'flash blindness' common in legacy camera auto-high-beams",
          "Prediction weight configurable via NVS calibration (default 0.5)"
        ]
      }
    ]
  },
  {
    num: "10",
    title: "Human Comfort Model",
    subtitle: "Quantifying Driver Wellbeing & Visual Fatigue",
    category: "Comfort Model",
    cards: [
      {
        title: "Mathematical Index Formulation",
        desc: "Human Comfort Index (0 to 100) combining three essential ergonomic factors:",
        items: [
          "1. Driver Visibility Score (w = 0.4): Sufficient light to cover stopping sight distance",
          "2. Glare-Free Score (w = 0.4): Freedom from received glare and caused glare to others",
          "3. Light Stability Score (w = 0.2): Penalizes rapid flickering or abrupt luminance jumps"
        ]
      },
      {
        title: "Target Performance Metric",
        desc: "Benchmark: Conventional headlights score 45-60% comfort during high-speed oncoming passes.",
        items: [
          "MAXTRIX maintains > 88% comfort across all highway passing maneuvers",
          "Environmental penalties applied dynamically for heavy rain (-5%), fog (-20%), and dust (-10%)"
        ]
      }
    ]
  },
  {
    num: "11",
    title: "Regulatory Compliance Envelopes",
    subtitle: "Multi-Jurisdiction Safety Standards",
    category: "Regulation",
    cards: [
      {
        title: "International Profiles",
        desc: "Pre-programmed safety envelopes enforce legal maximums and minimums across regions:",
        items: [
          "India (AIS-008): Max 100%, Min 10%, Urban Cap 60%, Highway Cap 100%",
          "Europe (ECE R123 / UNECE): Strict glare cap, Max 85%, Urban Cap 40%",
          "USA (FMVSS 108 / ADB): Max 90%, Min 15%, Urban Cap 50%",
          "Experimental: Unrestricted max range testing envelope"
        ]
      },
      {
        title: "Autonomous Compliance Enforcement",
        desc: "The decision engine clamps all outputs within the active country envelope at runtime.",
        items: ["Real-time safety status indicator: PASS or FAIL (UNDER-ILLUM / OVER-BRIGHT)"]
      }
    ]
  },
  {
    num: "12",
    title: "Security & Kinematic Firewall",
    subtitle: "Defending Connected Vehicles Against Spoofing Attacks",
    category: "Security",
    cards: [
      {
        title: "V2V Threat Model",
        desc: "A malicious actor could inject fake V2V packets to trick headlights into turning off at highway speeds.",
        items: [
          "Replay attack prevention: Packets older than 2000ms rejected immediately",
          "CRC integrity verification: Checksum simulation validates payload integrity",
          "Kinematic Jump Firewall: Enforces physical acceleration limits (max 60 m/s displacement)"
        ]
      },
      {
        title: "Automated Failover",
        desc: "If spoofed packets are detected, the node is instantly blacklisted and the system fails over to local optical sensing within 10ms."
      }
    ]
  },
  {
    num: "13",
    title: "Digital Twin Real-Time Simulator",
    subtitle: "Dual-Vehicle Closed Loop Simulation",
    category: "Simulation",
    cards: [
      {
        title: "Features of the Digital Twin",
        desc: "Both Own Vehicle (Blue V2V-101) and Oncoming Vehicle (Orange V2V-102) run full independent decision engines.",
        items: [
          "True closed-loop optical and radio coupling between both vehicles",
          "50Hz high-fidelity physics and ray-traced headlight beam rendering",
          "Full environmental control: weather, road type, ambient light, vehicle speeds"
        ]
      },
      {
        title: "Interactive Verification",
        desc: "Observe how both vehicles mutually negotiate beam dimming as they close at 120-180 km/h."
      }
    ]
  },
  {
    num: "14",
    title: "NVS Flash Calibration Manager",
    subtitle: "Non-Volatile Parameter Persistence",
    category: "Calibration",
    cards: [
      {
        title: "Tuning Engine Parameters",
        desc: "All decision thresholds can be tuned in real-time and written directly to simulated NVS flash memory.",
        items: [
          "Photodiode Gain (0.1 - 5.0)",
          "V2V CRF Gain (0.1 - 5.0) & Dimming Distance Range (10m - 150m)",
          "Slew Rate Limit (1.0% - 25.0% per 100ms)",
          "Human Comfort Weights (w_vis, w_glare, w_stab)"
        ]
      },
      {
        title: "Persistence",
        desc: "Settings persist across browser reloads via LocalStorage NVS emulation."
      }
    ]
  },
  {
    num: "15",
    title: "Key Capabilities & Future Roadmap",
    subtitle: "The Road to Commercial Automotive Deployment",
    category: "Roadmap",
    cards: [
      {
        title: "System Achievements",
        desc: "Demonstrated zero glare inflicted on oncoming drivers with over 90% human comfort score.",
        items: [
          "Sub-15ms latency across cooperative V2V link",
          "Autonomous failover in under 10ms during wireless interference or spoofing",
          "Full ECE R123 and AIS-008 regulatory compliance"
        ]
      },
      {
        title: "Phase 3 Future Work",
        desc: "Next steps for production automotive implementation:",
        items: [
          "Direct CAN-FD bus transceiver integration",
          "Solid-state LiDAR & thermal infrared sensor fusion",
          "Road trial testing with physical matrix LED headlight clusters"
        ]
      }
    ]
  }
];
