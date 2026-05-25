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
