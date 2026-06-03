# Collaborative Robots in Car Manufacturing

Browser-based simulation for a paper/demo on collaborative robots managing a car manufacturing process from stamped parts through final quality inspection.

## Run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## What It Shows

- Full car line with press-shop stamping, body-in-white welding, closure fit, paint shop, trim, chassis marriage, final fit, and inspection.
- The conveyor now stops at each station. During dwell time only the station robots move, process effects run at the car, and the correct subassembly appears on the vehicle.
- There is no separate completed car model and no end-of-line vehicle spawn; the build animation happens on the same in-progress car.
- The car is progressively built down the line: stamped underbody, BIW pillars/roof rails, closure panels, e-coat/base/clear paint, wiring/glass/interior, powertrain/battery/suspension, wheels/lights/bumpers, and QA markers.
- Detailed cobot arms with visible base plates, turntables, shoulder/elbow/wrist motors, arm covers, bolts, cable harnesses, and station-specific end effectors.
- Different robot bodies by task: heavy panel handler, dedicated spot-weld robot, sealed paint rail robot, camera inspection scanner, and gantry-style chassis lift.
- Tooling changes by process stage:
  - grippers for body panels and chassis modules
  - spot-weld guns with sparks
  - paint heads with spray mist
  - torque drivers
  - vision inspection cameras
- Human operator moving into and out of shared workspace.
- Speed-and-separation monitoring:
  - normal collaborative mode
  - reduced speed mode
  - protective stop mode
- Live metrics for cycle time, completed cars, robot utilization, and safety stops.
- Right-click and drag on the 3D view to pan around. Use the mouse wheel to zoom.

## Paper Use

Use browser screenshots for figures. Suggested views:

1. `Full process overview`: whole production line.
2. `Press Shop`: loose stamped panels entering the process.
3. `Body Shop / BIW`: welding plus human fixture check.
4. `Paint Shop`: spray process and booth.
5. `Trim Line`: glass, wiring, cockpit, and seats.
6. `Chassis Marriage`: powertrain, battery, suspension, and axles.
7. `Final Assembly`: wheels, exterior parts, fluids, and torque checks.
8. `End-of-Line Inspection`: final scan gate.

## Notes

This is an illustrative browser simulation, not a validated physics model. For a paper, describe it as a visualization/prototype unless you add calibrated robot kinematics, cycle-time data, and empirical validation.

## Smart Manufacturing Digital Twin Features

- ROS 2-style topic mapping for simulated factory telemetry, including `/joint_states`, operator proximity, line state, weld temperature, chassis load, and inspection defect probability.
- Isaac Sim-ready conceptual architecture showing how a deployable digital twin could exchange robot-state and sensor data through a ROS 2 bridge.
- Simulated real-time sensor telemetry with bounded history buffers, status thresholds, event logging, and a Digital Twin demo-mode interface.
- AI-assisted dynamic task scheduling that preserves the logical manufacturing sequence while modeling safety-stop recovery, bottlenecks, quality prioritization, and maintenance windows.
- Predictive-maintenance indicators with model-based health score, estimated remaining useful life, service priority, likely contributing factors, and recommended maintenance windows.
- OEE-style analytics for availability, performance, quality estimate, throughput, cycle time, utilization, energy estimate, defect risk, safety stops, and bottleneck status.
- 3D sensor nodes for vibration, weld temperature, paint environment, chassis load, inspection vision, and operator proximity. Sensor beacons can be shown or hidden from the sidebar.
- Digital Twin demo disclaimer and clear labels for `DIGITAL TWIN DEMO MODE`, `SIMULATED TELEMETRY`, `ROS 2 CONCEPTUAL MODEL`, `ISAAC SIM-READY ARCHITECTURE`, and `MODEL-BASED ESTIMATE`.

This remains an illustrative browser-based prototype. Telemetry values, AI scheduling outputs, predictive-maintenance indicators, and analytics are simulated model outputs for demonstration and research communication. They are not measurements from a deployed factory and are not a substitute for calibrated industrial validation.
