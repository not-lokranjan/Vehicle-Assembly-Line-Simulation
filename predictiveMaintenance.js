const robotCatalog = [
  ["press-unload", "press unload cobot", "Press Shop"],
  ["biw-welder", "BIW spot welding robot", "Body Shop / BIW"],
  ["closure-handler", "closure handling cobot", "Closure Hanging"],
  ["paint-spray", "paint spray cobot", "Paint Shop"],
  ["trim-assist", "trim assist cobot", "Trim Line"],
  ["chassis-marriage", "chassis marriage cobot", "Chassis Marriage"],
  ["final-fit", "final fit cobot", "Final Assembly"],
  ["vision-gantry", "vision inspection gantry", "End-of-Line Inspection"],
];

const stationKeyByName = {
  "Press Shop": "press",
  "Body Shop / BIW": "body",
  "Closure Hanging": "closures",
  "Paint Shop": "paint",
  "Trim Line": "trim",
  "Chassis Marriage": "chassis",
  "Final Assembly": "final",
  "End-of-Line Inspection": "inspect",
};

export function createPredictiveMaintenance() {
  let selectedRobotId = "chassis-marriage";
  let records = buildRecords();

  function reset() {
    records = buildRecords();
    selectedRobotId = "chassis-marriage";
  }

  function update(snapshot, twinState) {
    const sensors = Object.fromEntries((twinState?.sensors ?? []).map((sensor) => [sensor.id, sensor]));
    records = records.map((record) => updateRecord(record, snapshot, sensors));
    return getState();
  }

  function selectRobot(id) {
    selectedRobotId = id;
    return getState();
  }

  function getState() {
    const average = records.reduce((sum, record) => sum + record.healthScore, 0) / records.length;
    const alerts = records.filter((record) => record.maintenancePriority === "SERVICE SOON" || record.maintenancePriority === "HIGH PRIORITY").length;
    const selected = records.find((record) => record.id === selectedRobotId) ?? records[0];
    const nextWindow = records
      .filter((record) => record.maintenancePriority !== "HEALTHY")
      .sort((a, b) => a.healthScore - b.healthScore)[0]?.nextRecommendedWindow ?? "Cycle +3";
    return {
      fleetHealth: average,
      robotCount: records.length,
      serviceSoonAlerts: alerts,
      nextRecommendedWindow: nextWindow,
      records,
      selected,
      calendar: buildCalendar(records),
    };
  }

  return { update, reset, selectRobot, getState };
}

function buildRecords() {
  return robotCatalog.map(([id, robotName, station], index) => ({
    id,
    robotName,
    station,
    utilization: 24 + index * 3,
    vibration: 1.2,
    temperature: 36,
    cycleCount: 0,
    safetyStops: 0,
    healthScore: 94,
    failureRisk: 3,
    estimatedRemainingUsefulLifeHours: 180,
    recommendedAction: "Continue monitoring during normal production.",
    maintenancePriority: "HEALTHY",
    nextRecommendedWindow: "Cycle +4",
    reasons: ["Modeled baseline health is nominal."],
  }));
}

function updateRecord(record, snapshot, sensors) {
  const stationKey = stationKeyByName[record.station];
  const active = snapshot.activeStation === stationKey;
  const utilTarget = Math.min(98, snapshot.robotUtilization * (active ? 1.08 : 0.62) + (active ? 14 : 0));
  const vibrationSource = stationKey === "press" ? sensors["press-vibration"]?.value : stationKey === "chassis" ? (sensors["chassis-load"]?.value ?? 1100) / 520 : 1.4;
  const temperatureSource = stationKey === "body" ? sensors["weld-temperature"]?.value : stationKey === "paint" ? sensors["paint-temperature"]?.value + 14 : 38 + snapshot.lineSpeed * 0.05;
  const highLoad = stationKey === "chassis" ? Math.max(0, ((sensors["chassis-load"]?.value ?? 1100) - 1260) / 280) : 0;
  const utilization = smooth(record.utilization, utilTarget, 0.14);
  const vibration = smooth(record.vibration, vibrationSource, 0.12);
  const temperature = smooth(record.temperature, temperatureSource, 0.1);
  const runtimeWear = Math.min(12, snapshot.elapsedTime / 260);
  const stopWear = snapshot.safetyStops * 1.8;
  const speedWear = Math.max(0, snapshot.lineSpeed - 100) * 0.07;
  const loadWear = highLoad * 8;
  const healthScore = clamp(100 - runtimeWear - stopWear - speedWear - loadWear - utilization * 0.16 - vibration * 2.2 - Math.max(0, temperature - 55) * 0.22, 38, 99);
  const failureRisk = clamp((100 - healthScore) * 0.72 + highLoad * 6, 1, 62);
  const estimatedRemainingUsefulLifeHours = clamp(healthScore * 2.1 - failureRisk * 0.8, 12, 210);
  const maintenancePriority = priorityForHealth(healthScore, failureRisk);
  const cycleCount = Math.floor(snapshot.completedCars) + (active && snapshot.cycleProgress > 0.85 ? 1 : 0);
  return {
    ...record,
    utilization,
    vibration,
    temperature,
    cycleCount,
    safetyStops: snapshot.safetyStops,
    healthScore,
    failureRisk,
    estimatedRemainingUsefulLifeHours,
    recommendedAction: actionFor(record.station, maintenancePriority),
    maintenancePriority,
    nextRecommendedWindow: windowFor(maintenancePriority),
    reasons: reasonsFor(record.station, utilization, vibration, temperature, highLoad, snapshot.safetyStops),
  };
}

function buildCalendar(records) {
  const slots = ["Current Cycle", "Cycle +1", "Cycle +2", "Cycle +3", "Cycle +4"];
  return slots.map((slot) => ({
    slot,
    items: records
      .filter((record) => record.nextRecommendedWindow === slot)
      .map((record) => `${record.robotName}: ${record.maintenancePriority}`),
  }));
}

function priorityForHealth(score, risk) {
  if (score < 62 || risk > 34) return "HIGH PRIORITY";
  if (score < 75 || risk > 22) return "SERVICE SOON";
  if (score < 86 || risk > 12) return "MONITOR";
  return "HEALTHY";
}

function actionFor(station, priority) {
  if (priority === "HEALTHY") return "Continue monitoring during normal production.";
  if (station === "Chassis Marriage") return "Inspect the chassis-lift actuator and verify load-cell calibration after the current vehicle cycle.";
  if (station === "Body Shop / BIW") return "Inspect weld-gun cooling and verify cable strain relief before extended high-speed operation.";
  if (station === "Paint Shop") return "Check spray-head filter condition and booth temperature calibration during the next production gap.";
  return "Schedule a short inspection window between production cycles and verify tooling calibration.";
}

function windowFor(priority) {
  if (priority === "HIGH PRIORITY") return "Cycle +1";
  if (priority === "SERVICE SOON") return "Cycle +2";
  if (priority === "MONITOR") return "Cycle +3";
  return "Cycle +4";
}

function reasonsFor(station, utilization, vibration, temperature, highLoad, stops) {
  const reasons = [];
  if (utilization > 74) reasons.push("Elevated modeled utilization.");
  if (vibration > 2.4) reasons.push("Gradual vibration increase detected.");
  if (temperature > 58) reasons.push("Modeled tool temperature remains above nominal.");
  if (highLoad > 0.2) reasons.push("Repeated high-load operation at chassis lift.");
  if (stops > 0) reasons.push("Protective-stop count contributes to wear model.");
  if (!reasons.length) reasons.push(`${station} remains within modeled nominal range.`);
  return reasons;
}

function smooth(previous, target, alpha) {
  return previous + (target - previous) * alpha;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
