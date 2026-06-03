export const MAX_HISTORY_POINTS = 60;

export const SENSOR_DEFINITIONS = [
  { id: "operator-proximity", station: "global", label: "Operator Proximity", topic: "/factory/safety/operator_proximity", messageType: "sensor_msgs/msg/Range", unit: "m" },
  { id: "line-state", station: "global", label: "Production Line State", topic: "/factory/line/state", messageType: "std_msgs/msg/String", unit: "" },
  { id: "robot-joint-state", station: "global", label: "Robot Joint State", topic: "/joint_states", messageType: "sensor_msgs/msg/JointState", unit: "rad" },
  { id: "press-vibration", station: "press", label: "Press Robot Vibration", topic: "/factory/press/vibration_rms", messageType: "std_msgs/msg/Float32", unit: "mm/s" },
  { id: "weld-temperature", station: "body", label: "Weld Tool Temperature", topic: "/factory/body/weld_temperature", messageType: "sensor_msgs/msg/Temperature", unit: "°C" },
  { id: "closure-alignment", station: "closures", label: "Panel Alignment Deviation", topic: "/factory/closures/alignment_error", messageType: "std_msgs/msg/Float32", unit: "mm" },
  { id: "paint-temperature", station: "paint", label: "Paint Booth Temperature", topic: "/factory/paint/booth_temperature", messageType: "sensor_msgs/msg/Temperature", unit: "°C" },
  { id: "paint-humidity", station: "paint", label: "Paint Booth Humidity", topic: "/factory/paint/humidity", messageType: "sensor_msgs/msg/RelativeHumidity", unit: "% RH" },
  { id: "trim-torque", station: "trim", label: "Trim Fastening Torque", topic: "/factory/trim/torque", messageType: "std_msgs/msg/Float32", unit: "N·m" },
  { id: "chassis-load", station: "chassis", label: "Chassis Lift Load", topic: "/factory/chassis/load_cell", messageType: "std_msgs/msg/Float32", unit: "kg" },
  { id: "final-torque", station: "final", label: "Final Assembly Torque", topic: "/factory/final/torque", messageType: "std_msgs/msg/Float32", unit: "N·m" },
  { id: "inspection-defect-risk", station: "inspect", label: "Vision Inspection Defect Risk", topic: "/factory/inspection/defect_probability", messageType: "std_msgs/msg/Float32", unit: "%" },
];

const initialValues = {
  "operator-proximity": 2.4,
  "line-state": "RUNNING",
  "robot-joint-state": 0.18,
  "press-vibration": 1.7,
  "weld-temperature": 54,
  "closure-alignment": 0.42,
  "paint-temperature": 22.5,
  "paint-humidity": 48,
  "trim-torque": 34,
  "chassis-load": 1180,
  "final-torque": 108,
  "inspection-defect-risk": 2.8,
};

const statusRank = { NORMAL: 0, WATCH: 1, WARNING: 2, STOP: 3 };

export function createDigitalTwin() {
  const readings = new Map();
  const history = new Map();
  let events = [];
  let lastStation = "";
  let lastSafetyMode = "";
  let lastStopCount = 0;

  SENSOR_DEFINITIONS.forEach((sensor) => {
    readings.set(sensor.id, {
      ...sensor,
      value: initialValues[sensor.id],
      status: "NORMAL",
      timestamp: "--:--:--",
    });
    history.set(sensor.id, []);
  });

  function reset(snapshot) {
    events = [];
    lastStation = snapshot?.activeStation ?? "";
    lastSafetyMode = snapshot?.safetyMode ?? "";
    lastStopCount = snapshot?.safetyStops ?? 0;
    SENSOR_DEFINITIONS.forEach((sensor) => {
      readings.set(sensor.id, {
        ...sensor,
        value: initialValues[sensor.id],
        status: "NORMAL",
        timestamp: "--:--:--",
      });
      history.set(sensor.id, []);
    });
  }

  function sample(snapshot) {
    const time = new Date();
    const timestamp = time.toLocaleTimeString([], { hour12: false });
    if (snapshot.activeStation !== lastStation) {
      addEvent("INFO", `Vehicle entered ${snapshot.activeStationLabel}`);
      lastStation = snapshot.activeStation;
    }
    if (snapshot.safetyMode !== lastSafetyMode) {
      addEvent(snapshot.safetyMode === "Protective stop" ? "STOP" : "NORMAL", `Safety mode changed to ${snapshot.safetyMode}`);
      lastSafetyMode = snapshot.safetyMode;
    }
    if (snapshot.safetyStops > lastStopCount) {
      addEvent("STOP", "Protective stop triggered by operator proximity");
      lastStopCount = snapshot.safetyStops;
    }

    SENSOR_DEFINITIONS.forEach((sensor) => {
      const previous = readings.get(sensor.id);
      const target = targetForSensor(sensor.id, snapshot, previous.value);
      const value = snapshot.isPaused ? previous.value : smooth(previous.value, target, sensor.id === "line-state" ? 1 : 0.18);
      const status = statusForSensor(sensor.id, value, snapshot);
      const reading = { ...sensor, value, status, timestamp };
      readings.set(sensor.id, reading);
      if (typeof value === "number") pushBounded(history.get(sensor.id), { t: snapshot.elapsedTime, value, status });
    });

    maybeLogTrend(snapshot);
    return getState(snapshot);
  }

  function getState(snapshot) {
    const activeReadings = [...readings.values()];
    const worst = activeReadings.reduce((current, reading) => statusRank[reading.status] > statusRank[current] ? reading.status : current, "NORMAL");
    const twinState = snapshot?.isPaused ? "PAUSED" : snapshot?.safetyMode === "Protective stop" ? "SAFETY STOP" : "SYNCHRONIZED";
    return {
      twinState,
      telemetrySource: "SIMULATED SENSOR STREAM",
      samplingRate: "4 Hz",
      activeStation: snapshot?.activeStation ?? "overview",
      activeStationLabel: snapshot?.activeStationLabel ?? "Full process overview",
      worstStatus: worst,
      sensors: activeReadings,
      events,
    };
  }

  function getSensor(id) {
    return readings.get(id);
  }

  function getHistory(id) {
    return history.get(id) ?? [];
  }

  function addEvent(level, message) {
    events.unshift({ time: new Date().toLocaleTimeString([], { hour12: false }), level, message });
    events = events.slice(0, 30);
  }

  function maybeLogTrend(snapshot) {
    const chassis = readings.get("chassis-load");
    const weld = readings.get("weld-temperature");
    const defect = readings.get("inspection-defect-risk");
    if (snapshot.activeStation === "chassis" && chassis.status === "WATCH" && events[0]?.message !== "Chassis lift load trending upward") {
      addEvent("WATCH", "Chassis lift load trending upward");
    }
    if (snapshot.activeStation === "body" && weld.status === "NORMAL" && Math.floor(snapshot.elapsedTime) % 9 === 0) {
      addEvent("NORMAL", `Weld temperature stable at ${formatValue(weld.value)} °C`);
    }
    if (defect.status !== "NORMAL" && events[0]?.message !== "Inspection defect risk exceeded watch threshold") {
      addEvent("WATCH", "Inspection defect risk exceeded watch threshold");
    }
  }

  return { sample, reset, getState, getSensor, getHistory, addEvent };
}

function targetForSensor(id, snapshot, previous) {
  const speed = snapshot.lineSpeed / 100;
  const util = snapshot.robotUtilization / 100;
  const work = snapshot.cycleProgress;
  const active = (station) => snapshot.activeStation === station || snapshot.selectedStage === station;
  const wave = Math.sin(snapshot.elapsedTime * 0.55 + work * Math.PI) * 0.5;
  const stopBoost = snapshot.safetyMode === "Protective stop" ? 1 : 0;

  switch (id) {
    case "operator-proximity":
      return Math.max(0.22, snapshot.humanDistance);
    case "line-state":
      return snapshot.isPaused ? "PAUSED" : stopBoost ? "PROTECTIVE_STOP" : "RUNNING";
    case "robot-joint-state":
      return 0.18 + util * 1.7 + work * 0.22 + wave * 0.08;
    case "press-vibration":
      return 1.45 + speed * 0.8 + util * 0.9 + (active("press") ? 0.75 * work : 0) + wave * 0.12;
    case "weld-temperature":
      return 42 + (active("body") ? 24 * work : 5) + util * 14 + speed * 5 - stopBoost * 10 + wave * 1.8;
    case "closure-alignment":
      return 0.28 + speed * 0.18 + (active("closures") ? Math.abs(0.5 - work) * 0.5 : 0.08) + stopBoost * 0.12;
    case "paint-temperature":
      return 21.4 + (active("paint") ? 1.6 : 0.4) + speed * 0.8 + wave * 0.25;
    case "paint-humidity":
      return 46 + (active("paint") ? 2.5 : 0.8) - speed * 1.2 + wave * 0.8;
    case "trim-torque":
      return 31 + (active("trim") ? 7 * work : 2) + speed * 2 + wave * 0.9;
    case "chassis-load":
      return 940 + (active("chassis") ? 420 * (0.35 + work) : 80) + speed * 90 + util * 80 + wave * 25;
    case "final-torque":
      return 92 + (active("final") ? 28 * work : 6) + speed * 4 + wave * 2.4;
    case "inspection-defect-risk":
      return 2.2 + speed * 1.8 + snapshot.safetyStops * 0.45 + (active("inspect") ? 2.4 * work : 0.6) + Math.max(0, util - 0.72) * 7 + wave * 0.35;
    default:
      return previous;
  }
}

function statusForSensor(id, value, snapshot) {
  if (id === "line-state") return snapshot.safetyMode === "Protective stop" ? "STOP" : snapshot.isPaused ? "WATCH" : "NORMAL";
  if (id === "operator-proximity") {
    if (value < 0.86) return "STOP";
    if (value < 1.55) return "WATCH";
    return "NORMAL";
  }
  const thresholds = {
    "press-vibration": [2.6, 3.2],
    "weld-temperature": [70, 84],
    "closure-alignment": [0.72, 0.95],
    "paint-temperature": [24.2, 25.4],
    "paint-humidity": [52, 57],
    "trim-torque": [41, 47],
    "chassis-load": [1420, 1580],
    "final-torque": [118, 128],
    "inspection-defect-risk": [6.5, 9],
    "robot-joint-state": [1.55, 1.95],
  }[id];
  if (!thresholds) return "NORMAL";
  if (value >= thresholds[1]) return "WARNING";
  if (value >= thresholds[0]) return "WATCH";
  return "NORMAL";
}

function smooth(previous, target, alpha) {
  if (typeof target !== "number") return target;
  if (typeof previous !== "number") return target;
  return previous + (target - previous) * alpha;
}

function pushBounded(list, item) {
  list.push(item);
  if (list.length > MAX_HISTORY_POINTS) list.shift();
}

export function formatValue(value) {
  if (typeof value === "string") return value;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}
