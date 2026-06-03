import { MAX_HISTORY_POINTS } from "./digitalTwin.js";

const stations = [
  ["press", "Press Shop"],
  ["body", "Body Shop / BIW"],
  ["closures", "Closure Hanging"],
  ["paint", "Paint Shop"],
  ["trim", "Trim Line"],
  ["chassis", "Chassis Marriage"],
  ["final", "Final Assembly"],
  ["inspect", "End-of-Line Inspection"],
];

export function createAnalytics() {
  const history = {
    throughput: [],
    cycleTime: [],
    utilization: [],
    defectRisk: [],
    energy: [],
  };
  let protectiveStopDuration = 0;
  let lastElapsed = 0;

  function reset() {
    Object.values(history).forEach((list) => list.splice(0, list.length));
    protectiveStopDuration = 0;
    lastElapsed = 0;
  }

  function update(snapshot, twinState, schedulerState, maintenanceState) {
    const sensors = Object.fromEntries((twinState?.sensors ?? []).map((sensor) => [sensor.id, sensor]));
    const dt = Math.max(0, snapshot.elapsedTime - lastElapsed);
    lastElapsed = snapshot.elapsedTime;
    if (snapshot.safetyMode === "Protective stop" && !snapshot.isPaused) protectiveStopDuration += dt;

    const defectRisk = Number(sensors["inspection-defect-risk"]?.value ?? 3);
    const availability = clamp(1 - protectiveStopDuration / Math.max(60, snapshot.elapsedTime + 60), 0.72, 1);
    const performance = clamp((snapshot.lineSpeed / 100) * (snapshot.safetyMode === "Protective stop" ? 0.42 : 0.94), 0.35, 1.12);
    const quality = clamp(1 - defectRisk / 100, 0.86, 0.997);
    const oee = availability * Math.min(1, performance) * quality;
    const throughput = (snapshot.lineSpeed / 100) * (snapshot.safetyMode === "Protective stop" ? 0 : 42) * availability;
    const cycleTime = Number(snapshot.cycleTimeSeconds) || 88;
    const variance = 2.4 + Math.abs(snapshot.lineSpeed - 100) * 0.06 + snapshot.safetyStops * 0.5;
    const energy = 42 + snapshot.lineSpeed * 0.18 + snapshot.robotUtilization * 0.11 + (snapshot.activeStation === "paint" ? 3 : 0);
    const bottleneck = schedulerState?.bottleneck && schedulerState.bottleneck !== "none" ? schedulerState.bottleneck : primaryBottleneck(sensors);

    push(history.throughput, throughput);
    push(history.cycleTime, cycleTime);
    push(history.utilization, snapshot.robotUtilization);
    push(history.defectRisk, defectRisk);
    push(history.energy, energy);

    const stationRows = stationPerformance(snapshot, sensors, maintenanceState);
    return {
      metrics: {
        oee,
        availability,
        performance,
        quality,
        throughput,
        averageCycleTime: cycleTime,
        cycleTimeVariance: variance,
        robotUtilization: snapshot.robotUtilization,
        energyEstimate: energy,
        defectRisk,
        safetyStops: snapshot.safetyStops,
        protectiveStopDuration,
        primaryBottleneck: bottleneck,
      },
      history,
      stationRows,
      insights: buildInsights(snapshot, sensors, schedulerState, stationRows),
    };
  }

  return { update, reset };
}

function stationPerformance(snapshot, sensors, maintenanceState) {
  const maintenanceByStation = new Map((maintenanceState?.records ?? []).map((record) => [record.station, record]));
  return stations.map(([key, label], index) => {
    const active = snapshot.activeStation === key;
    const utilization = clamp(snapshot.robotUtilization * (active ? 1.05 : 0.58) + index * 1.8, 12, 98);
    const modeledCycleTime = 7.5 + index * 0.45 + (active ? snapshot.cycleProgress * 3.4 : 0) + (snapshot.lineSpeed < 80 ? 1.2 : 0);
    const defectRisk = sensors["inspection-defect-risk"]?.value ?? 3;
    const qualityRisk = key === "paint" ? paintRisk(sensors) : key === "inspect" ? defectRisk : defectRisk * 0.45;
    const maintenanceRecord = maintenanceByStation.get(label);
    const maintenanceRisk = maintenanceRecord ? 100 - maintenanceRecord.healthScore : 8;
    const delayRisk = active && snapshot.safetyMode === "Protective stop" ? 74 : utilization > 82 ? 48 : 18;
    let status = "NORMAL";
    if (maintenanceRisk > 28) status = "MAINTENANCE DUE";
    else if (delayRisk > 55 || modeledCycleTime > 11.5) status = "BOTTLENECK";
    else if (qualityRisk > 6 || utilization > 76) status = "WATCH";
    return { station: label, utilization, modeledCycleTime, delayRisk, qualityRisk, maintenanceRisk, status };
  });
}

function buildInsights(snapshot, sensors, schedulerState, stationRows) {
  const insights = [];
  const bottleneck = stationRows.find((row) => row.status === "BOTTLENECK");
  if (bottleneck) insights.push(`${bottleneck.station} is currently the modeled bottleneck due to station dwell time or safety delay.`);
  if (schedulerState?.improvement > 1.5) insights.push("AI scheduling reduced modeled queue delay while preserving upstream manufacturing dependencies.");
  const paintOk = paintRisk(sensors) < 5;
  if (paintOk) insights.push("Paint quality risk remains low because booth temperature and humidity remain within the modeled nominal range.");
  const chassisRisk = stationRows.find((row) => row.station === "Chassis Marriage")?.maintenanceRisk ?? 0;
  if (chassisRisk > 18) insights.push("Chassis Marriage maintenance risk is trending upward due to sustained lift utilization.");
  if (snapshot.safetyMode === "Protective stop") insights.push("Protective-stop duration is reducing modeled availability until operator proximity returns to the collaborative range.");
  return insights.slice(0, 5);
}

function primaryBottleneck(sensors) {
  if ((sensors["weld-temperature"]?.value ?? 0) > 70) return "Body Shop / BIW";
  if ((sensors["chassis-load"]?.value ?? 0) > 1420) return "Chassis Marriage";
  return "none";
}

function paintRisk(sensors) {
  const temp = sensors["paint-temperature"]?.value ?? 22.5;
  const humidity = sensors["paint-humidity"]?.value ?? 48;
  return Math.abs(temp - 22.8) * 1.2 + Math.abs(humidity - 48) * 0.2;
}

function push(list, value) {
  list.push(value);
  if (list.length > MAX_HISTORY_POINTS) list.shift();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
