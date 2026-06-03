const sequence = ["press", "body", "closures", "paint", "trim", "chassis", "final", "inspect"];

const baseTasks = [
  ["press", "Stamp and unload body panels", "Press unload cobot", 7.8, "HIGH"],
  ["body", "BIW spot-weld framing", "BIW spot welding robot", 10.6, "HIGH"],
  ["closures", "Align and hang closure panels", "closure handling cobot", 8.2, "MEDIUM"],
  ["paint", "Apply paint process recipe", "paint spray cobot", 9.4, "MEDIUM"],
  ["trim", "Install glass, harness, and cabin modules", "trim assist cobot", 9.8, "MEDIUM"],
  ["chassis", "Join chassis module to body", "chassis marriage cobot", 11.2, "HIGH"],
  ["final", "Torque wheels and exterior fit", "final fit cobot", 8.8, "MEDIUM"],
  ["inspect", "Scan final vehicle quality", "vision inspection gantry", 7.2, "HIGH"],
];

export function createScheduler() {
  let tasks = buildTasks();
  let rescheduled = 0;
  let lastDecision = "Baseline sequence initialized.";
  let bottleneck = "none";
  let improvement = 0;

  function reset() {
    tasks = buildTasks();
    rescheduled = 0;
    lastDecision = "Scheduler reset to logical manufacturing sequence.";
    bottleneck = "none";
    improvement = 0;
  }

  function update(snapshot, twin, aiEnabled) {
    const sensors = Object.fromEntries((twin?.sensors ?? []).map((sensor) => [sensor.id, sensor]));
    const activeIndex = Math.max(0, sequence.indexOf(snapshot.activeStation));
    const speedFactor = Math.max(0.4, snapshot.lineSpeed / 100);
    const defectRisk = sensors["inspection-defect-risk"]?.value ?? 3;
    const chassisLoad = sensors["chassis-load"]?.value ?? 1100;
    const stopped = snapshot.safetyMode === "Protective stop";
    const highMaintenanceRisk = chassisLoad > 1420 || snapshot.robotUtilization > 82;

    tasks = tasks.map((task, index) => {
      const taskIndex = sequence.indexOf(task.station);
      const completed = taskIndex < activeIndex || (taskIndex === activeIndex && snapshot.cycleProgress > 0.92);
      const active = task.station === snapshot.activeStation && !completed;
      const delay = stopped && task.priority !== "HIGH";
      const maintenanceHold = highMaintenanceRisk && task.station === "chassis" && snapshot.activeStation !== "chassis";
      let status = completed ? "COMPLETED" : active ? "ACTIVE" : "QUEUED";
      if (delay) status = "DEFERRED";
      if (maintenanceHold) status = "MAINTENANCE HOLD";
      const duration = task.baseDuration / speedFactor + (delay ? 2.4 : 0) + (maintenanceHold ? 3 : 0);
      let reason = "Logical sequence dependency preserved.";
      if (active) reason = "Task aligned to current active manufacturing station.";
      if (delay) reason = "A non-critical task was deferred while the line remained in protective-stop mode.";
      if (maintenanceHold) reason = "Maintenance window proposed because chassis load and utilization are elevated.";
      if (task.station === "inspect" && defectRisk > 6.5 && !completed) reason = "Inspection priority increased because modeled defect probability exceeded the watch threshold.";
      return { ...task, queuePosition: index + 1, status, remainingSeconds: duration, reason };
    });

    bottleneck = findBottleneck(tasks, sensors);
    if (aiEnabled) {
      const base = stopped ? 1.8 : 4.5;
      const qualityBoost = defectRisk > 6.5 ? 2.2 : 0;
      const maintenancePenalty = highMaintenanceRisk ? -1.2 : 0;
      improvement = clamp(base + qualityBoost + maintenancePenalty + (snapshot.lineSpeed - 100) * 0.025, 0, 15);
      if (stopped) {
        lastDecision = "A non-critical task was deferred while the line remained in protective-stop mode.";
        rescheduled += 1;
      } else if (defectRisk > 6.5) {
        lastDecision = "Inspection priority increased because the modeled defect probability exceeded the watch threshold.";
        rescheduled += 1;
      } else if (highMaintenanceRisk) {
        lastDecision = "Chassis maintenance window proposed after the current vehicle cycle because load and utilization remain high.";
        rescheduled += 1;
      } else {
        lastDecision = "AI scheduler balances task durations against line speed while preserving upstream dependencies.";
      }
    } else {
      improvement = 0;
      lastDecision = "Baseline sequence mode is active; dynamic optimization is disabled.";
    }

    return getState(snapshot, aiEnabled);
  }

  function getState(snapshot, aiEnabled) {
    const baselineCycle = Number(snapshot.cycleTimeSeconds) || 88;
    const aiCycle = baselineCycle * (1 - improvement / 100);
    return {
      mode: aiEnabled ? "AI-OPTIMIZED" : "BASELINE SEQUENCE",
      activeTask: snapshot.currentTask,
      bottleneck,
      improvement,
      rescheduled,
      tasks,
      decision: lastDecision,
      comparison: [
        ["Projected cycle time", `${baselineCycle.toFixed(0)} s`, `${aiCycle.toFixed(0)} s`],
        ["Queue delay", `${(8.2 + (snapshot.safetyMode === "Protective stop" ? 6 : 0)).toFixed(1)} s`, `${Math.max(1.5, 6.4 - improvement * 0.22).toFixed(1)} s`],
        ["Robot utilization", `${snapshot.robotUtilization.toFixed(0)}%`, `${Math.min(96, snapshot.robotUtilization + improvement * 0.9).toFixed(0)}%`],
        ["Maintenance conflicts", highConflictCount(tasks), `${Math.max(0, highConflictCount(tasks) - (aiEnabled ? 1 : 0))}`],
      ],
    };
  }

  return { update, reset, getState };
}

function buildTasks() {
  return baseTasks.map(([station, label, assignedRobot, baseDuration, priority], index) => ({
    id: `${station}-${index}`,
    station,
    label,
    baseDuration,
    remainingSeconds: baseDuration,
    status: "QUEUED",
    priority,
    dependencies: index === 0 ? [] : [baseTasks[index - 1][0]],
    assignedRobot,
    reason: "Logical sequence dependency preserved.",
    queuePosition: index + 1,
  }));
}

function findBottleneck(tasks, sensors) {
  const active = tasks.filter((task) => task.status !== "COMPLETED");
  const longest = active.reduce((max, task) => task.remainingSeconds > max.remainingSeconds ? task : max, active[0] ?? tasks[0]);
  if (sensors["weld-temperature"]?.status === "WATCH") return "Body Shop / BIW";
  if (sensors["chassis-load"]?.status !== "NORMAL") return "Chassis Marriage";
  return longest?.station ?? "none";
}

function highConflictCount(tasks) {
  return tasks.filter((task) => task.status === "MAINTENANCE HOLD").length;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
