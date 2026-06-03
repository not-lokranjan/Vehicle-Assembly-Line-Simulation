import { createAnalytics } from "./analytics.js";
import { createDigitalTwin, formatValue, SENSOR_DEFINITIONS } from "./digitalTwin.js";
import { createPredictiveMaintenance } from "./predictiveMaintenance.js";
import { createScheduler } from "./scheduler.js";

const stationLabels = {
  overview: "Full process overview",
  press: "Press Shop",
  body: "Body Shop / BIW",
  closures: "Closure Hanging",
  paint: "Paint Shop",
  trim: "Trim Line",
  chassis: "Chassis Marriage",
  final: "Final Assembly",
  inspect: "End-of-Line Inspection",
  global: "Global",
};

export function initIntelligenceConsole({ getSnapshot, ui, onSensorStatus }) {
  const root = document.querySelector("#intelligenceConsole");
  const content = document.querySelector("#consoleContent");
  const toggle = document.querySelector("#consoleToggle");
  const tabButtons = [...document.querySelectorAll(".consoleTabs button")];
  const twin = createDigitalTwin();
  const scheduler = createScheduler();
  const maintenance = createPredictiveMaintenance();
  const analytics = createAnalytics();

  let activeTab = "digitalTwin";
  let showAllSensors = false;
  let selectedSensor = "operator-proximity";
  let selectedRobot = "chassis-marriage";
  let twinState = twin.getState(getSnapshot());
  let schedulerState = scheduler.getState(getSnapshot(), true);
  let maintenanceState = maintenance.getState();
  let analyticsState = analytics.update(getSnapshot(), twinState, schedulerState, maintenanceState);

  toggle.addEventListener("click", () => {
    root.classList.toggle("collapsed");
    root.classList.toggle("open");
    const expanded = !root.classList.contains("collapsed");
    toggle.setAttribute("aria-expanded", String(expanded));
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      tabButtons.forEach((item) => item.classList.toggle("active", item === button));
      render();
    });
  });

  content.addEventListener("change", (event) => {
    if (event.target.id === "showAllSensorsConsole") showAllSensors = event.target.checked;
    if (event.target.id === "sensorSelect") selectedSensor = event.target.value;
    render();
  });

  content.addEventListener("click", (event) => {
    const row = event.target.closest("[data-robot-id]");
    if (!row) return;
    selectedRobot = row.dataset.robotId;
    maintenanceState = maintenance.selectRobot(selectedRobot);
    render();
  });

  const telemetryTimer = setInterval(() => {
    twinState = twin.sample(getSnapshot());
    onSensorStatus?.(twinState.sensors);
    updateLeftState();
    if (activeTab === "digitalTwin" || activeTab === "ros") render();
  }, 250);

  const analyticsTimer = setInterval(() => {
    analyticsState = analytics.update(getSnapshot(), twinState, schedulerState, maintenanceState);
    if (activeTab === "analytics") render();
  }, 750);

  const schedulerTimer = setInterval(() => {
    schedulerState = scheduler.update(getSnapshot(), twinState, ui.enableAi.checked);
    if (activeTab === "scheduler") render();
  }, 1000);

  const maintenanceTimer = setInterval(() => {
    maintenanceState = maintenance.update(getSnapshot(), twinState);
    if (activeTab === "maintenance" || activeTab === "analytics") render();
  }, 1500);

  function reset() {
    const snapshot = getSnapshot();
    twin.reset(snapshot);
    scheduler.reset();
    maintenance.reset();
    analytics.reset();
    twinState = twin.getState(snapshot);
    schedulerState = scheduler.getState(snapshot, ui.enableAi.checked);
    maintenanceState = maintenance.getState();
    analyticsState = analytics.update(snapshot, twinState, schedulerState, maintenanceState);
    updateLeftState();
    render();
  }

  function updateLeftState() {
    ui.twinState.textContent = twinState.twinState;
    ui.schedulerState.textContent = ui.enableAi.checked ? "AI-OPTIMIZED" : "BASELINE";
    const worstMaintenance = maintenanceState.records.some((record) => record.maintenancePriority === "HIGH PRIORITY" || record.maintenancePriority === "SERVICE SOON");
    ui.maintenanceState.textContent = worstMaintenance ? "SERVICE SOON" : "MONITORING";
  }

  function render() {
    if (activeTab === "digitalTwin") content.innerHTML = renderDigitalTwin();
    if (activeTab === "ros") content.innerHTML = renderRosIsaac();
    if (activeTab === "scheduler") content.innerHTML = renderScheduler();
    if (activeTab === "maintenance") content.innerHTML = renderMaintenance();
    if (activeTab === "analytics") content.innerHTML = renderAnalytics();
  }

  render();
  updateLeftState();

  return {
    reset,
    stop: () => [telemetryTimer, analyticsTimer, schedulerTimer, maintenanceTimer].forEach(clearInterval),
    getTwinState: () => twinState,
  };

  function renderDigitalTwin() {
    const snapshot = getSnapshot();
    const visible = visibleSensors(twinState.sensors, snapshot, showAllSensors);
    const selected = twin.getSensor(selectedSensor) ?? visible[0];
    return `
      <section class="consoleSection">
        <h3>Digital Twin State</h3>
        <div class="cardGrid">
          ${card("Digital Twin State", statusBadge(twinState.twinState))}
          ${card("Telemetry Source", "SIMULATED SENSOR STREAM")}
          ${card("Sampling Rate", "4 Hz")}
          ${card("Active Station", escapeHtml(twinState.activeStationLabel))}
        </div>
      </section>
      <section class="consoleSection">
        <h3>Live Telemetry Table</h3>
        <label class="toggle"><input id="showAllSensorsConsole" type="checkbox" ${showAllSensors ? "checked" : ""}/> Show all sensors</label>
        <div class="tableWrap">
          <table class="dataTable">
            <thead><tr><th>Status</th><th>Sensor</th><th>Topic</th><th>Type</th><th>Value</th><th>Station</th></tr></thead>
            <tbody>${visible.map((sensor) => `
              <tr class="${sensor.station === snapshot.activeStation ? "activeRow" : ""}">
                <td>${statusBadge(sensor.status)}</td>
                <td>${escapeHtml(sensor.label)}</td>
                <td><code>${escapeHtml(sensor.topic)}</code></td>
                <td>${escapeHtml(sensor.messageType)}</td>
                <td>${formatValue(sensor.value)} ${escapeHtml(sensor.unit)}</td>
                <td>${stationLabels[sensor.station] ?? sensor.station}<br><span class="muted">${sensor.timestamp}</span></td>
              </tr>`).join("")}</tbody>
          </table>
        </div>
      </section>
      <section class="consoleSection">
        <h3>Sensor-History Chart</h3>
        <label>Sensor
          <select id="sensorSelect">${twinState.sensors.map((sensor) => `<option value="${sensor.id}" ${sensor.id === selectedSensor ? "selected" : ""}>${escapeHtml(sensor.label)}</option>`).join("")}</select>
        </label>
        ${lineChart(twin.getHistory(selected?.id ?? selectedSensor), "#7dd3fc")}
      </section>
      <section class="consoleSection">
        <h3>Event Log</h3>
        <div class="eventLog">${twinState.events.map((event) => `<div><span>${event.time}</span><strong>${event.level}</strong><span>${escapeHtml(event.message)}</span></div>`).join("")}</div>
      </section>
    `;
  }

  function renderRosIsaac() {
    const topicRows = [
      "/factory/safety/operator_proximity",
      "/joint_states",
      "/factory/line/state",
      "/factory/body/weld_temperature",
      "/factory/chassis/load_cell",
      "/factory/inspection/defect_probability",
    ].map((topic) => {
      const sensor = twinState.sensors.find((item) => item.topic === topic) ?? SENSOR_DEFINITIONS.find((item) => item.topic === topic);
      const active = sensor?.station === "global" || sensor?.station === getSnapshot().activeStation;
      return `<tr class="${active ? "activeRow" : ""}"><td>${topic.includes("state") ? "SUB" : "PUB"}</td><td><code>${topic}</code></td><td>${sensor?.messageType ?? "std_msgs/msg/String"}</td><td>${active ? "4 Hz" : "1 Hz"}</td><td>${statusBadge(getSnapshot().isPaused ? "PAUSED" : active ? "ACTIVE" : "IDLE")}</td></tr>`;
    }).join("");
    const cards = [
      ["USD Factory Scene", "Digital representation of stations, robots, tooling, and conveyor assets"],
      ["ROS 2 Bridge", "Conceptual publisher/subscriber interface for sensor and robot-state exchange"],
      ["Synthetic Sensors", "Camera, proximity, temperature, torque, vibration, and load-cell streams"],
      ["Robot Articulation State", "Joint-state representation for animated collaborative robots"],
      ["Digital Twin Analytics", "Model-based scheduling, health monitoring, and optimization indicators"],
    ];
    return `
      <section class="consoleSection">
        <h3>CONCEPTUAL INTEGRATION MAP</h3>
        <div class="diagramFlow">${["Physical / Simulated Sensors", "ROS 2 Topics", "ROS 2 Bridge Layer", "Isaac Sim Digital Twin Environment", "AI Scheduler + Predictive Maintenance", "Operations Dashboard"].map((item, index, list) => `<div class="diagramBox">${item}</div>${index < list.length - 1 ? `<div class="diagramArrow">↓</div>` : ""}`).join("")}</div>
        <p class="consoleDisclaimer">In a deployable architecture, Isaac Sim can exchange robot-state and sensor data through a ROS 2 bridge. This browser demonstrator models the same information flow using synthetic telemetry.</p>
      </section>
      <section class="consoleSection">
        <h3>ROS 2 CONCEPTUAL MODEL Topic Monitor</h3>
        <div class="tableWrap"><table class="dataTable"><thead><tr><th>Mode</th><th>Topic</th><th>Message</th><th>Freq</th><th>Status</th></tr></thead><tbody>${topicRows}</tbody></table></div>
      </section>
      <section class="consoleSection">
        <h3>ISAAC SIM-READY ARCHITECTURE Mapping</h3>
        <div class="cardGrid">${cards.map(([title, text]) => card(title, escapeHtml(text))).join("")}</div>
      </section>
      <section class="consoleSection">
        <h3>Conceptual ROS 2 Nodes</h3>
        <div class="nodeGrid">${["/factory_twin", "/safety_monitor", "/robot_state_publisher", "/vision_inspection", "/dynamic_scheduler", "/maintenance_predictor"].map((node) => `<span class="badge">${node}</span>`).join("")}</div>
      </section>
    `;
  }

  function renderScheduler() {
    return `
      <section class="consoleSection">
        <h3>AI-ASSISTED DYNAMIC TASK SCHEDULER</h3>
        <div class="cardGrid">
          ${card("Scheduler Mode", schedulerState.mode)}
          ${card("Active Task", escapeHtml(schedulerState.activeTask))}
          ${card("Current Bottleneck", escapeHtml(schedulerState.bottleneck))}
          ${card("Estimated Cycle-Time Improvement", `${schedulerState.improvement.toFixed(1)}% <span class="muted">MODEL-BASED ESTIMATE</span>`)}
          ${card("Tasks Rescheduled", String(schedulerState.rescheduled))}
        </div>
      </section>
      <section class="consoleSection">
        <h3>Ordered Task Queue</h3>
        <div class="tableWrap"><table class="dataTable"><thead><tr><th>#</th><th>Station</th><th>Task</th><th>Robot</th><th>Priority</th><th>Status</th><th>Duration</th><th>Reason</th></tr></thead><tbody>
          ${schedulerState.tasks.map((task) => `<tr class="${task.status === "ACTIVE" ? "activeRow" : ""}"><td>${task.queuePosition}</td><td>${stationLabels[task.station]}</td><td>${escapeHtml(task.label)}</td><td>${escapeHtml(task.assignedRobot)}</td><td>${task.priority}</td><td>${statusBadge(task.status)}</td><td>${task.remainingSeconds.toFixed(1)} s</td><td>${escapeHtml(task.reason)}</td></tr>`).join("")}
        </tbody></table></div>
      </section>
      <section class="consoleSection">
        <h3>Decision Explanation</h3>
        <p class="consoleDisclaimer">${escapeHtml(schedulerState.decision)}</p>
      </section>
      <section class="consoleSection">
        <h3>Modeled Baseline Comparison</h3>
        <div class="tableWrap"><table class="dataTable"><thead><tr><th>Metric</th><th>Baseline</th><th>AI-Assisted</th></tr></thead><tbody>${schedulerState.comparison.map(([m, b, a]) => `<tr><td>${m}</td><td>${b}</td><td>${a}</td></tr>`).join("")}</tbody></table></div>
      </section>
    `;
  }

  function renderMaintenance() {
    const selected = maintenanceState.selected;
    return `
      <section class="consoleSection">
        <h3>Predictive Maintenance Scheduling</h3>
        <div class="cardGrid">
          ${card("Fleet Health", `${maintenanceState.fleetHealth.toFixed(0)}/100`)}
          ${card("Robots Monitored", String(maintenanceState.robotCount))}
          ${card("Service-Soon Alerts", String(maintenanceState.serviceSoonAlerts))}
          ${card("Next Recommended Window", maintenanceState.nextRecommendedWindow)}
        </div>
      </section>
      <section class="consoleSection">
        <h3>Robot Maintenance Table</h3>
        <div class="tableWrap"><table class="dataTable"><thead><tr><th>Robot</th><th>Station</th><th>Health</th><th>Risk</th><th>ESTIMATED RUL</th><th>Window</th><th>Priority</th></tr></thead><tbody>
          ${maintenanceState.records.map((record) => `<tr data-robot-id="${record.id}" class="${record.id === selectedRobot ? "activeRow" : ""}"><td><button class="rowButton" type="button">${escapeHtml(record.robotName)}</button></td><td>${record.station}</td><td>${record.healthScore.toFixed(0)}/100<br><span class="muted">MODEL-BASED HEALTH SCORE</span></td><td>${record.failureRisk.toFixed(1)}%</td><td>${record.estimatedRemainingUsefulLifeHours.toFixed(0)} h</td><td>${record.nextRecommendedWindow}</td><td>${statusBadge(record.maintenancePriority)}</td></tr>`).join("")}
        </tbody></table></div>
      </section>
      <section class="consoleSection">
        <h3>Robot Detail Panel</h3>
        <p class="consoleDisclaimer"><strong>${escapeHtml(selected.robotName)}</strong><br>Modeled trend: utilization ${selected.utilization.toFixed(0)}%, vibration ${selected.vibration.toFixed(2)} mm/s, temperature ${selected.temperature.toFixed(1)} °C.</p>
        <p class="consoleDisclaimer">Likely contributing factors: ${selected.reasons.map(escapeHtml).join(" ")}</p>
        <p class="consoleDisclaimer">Recommended action: ${escapeHtml(selected.recommendedAction)}</p>
        <p class="consoleDisclaimer">Reason: Elevated utilization, gradual vibration, or high-load operation increases the model-based service priority.</p>
      </section>
      <section class="consoleSection">
        <h3>RECOMMENDED MAINTENANCE WINDOW</h3>
        <div class="calendarStrip">${maintenanceState.calendar.map((slot) => `<div class="calendarSlot"><strong>${slot.slot}</strong>${slot.items.length ? slot.items.map(escapeHtml).join("<br>") : "<span class='muted'>No planned service</span>"}</div>`).join("")}</div>
      </section>
    `;
  }

  function renderAnalytics() {
    const m = analyticsState.metrics;
    return `
      <section class="consoleSection">
        <h3>Advanced Manufacturing Analytics</h3>
        <div class="cardGrid">
          ${card("OEE Estimate", `${(m.oee * 100).toFixed(1)}% <span class="muted">OEE-STYLE MODEL ESTIMATE</span>`)}
          ${card("Availability", `${(m.availability * 100).toFixed(1)}%`)}
          ${card("Performance", `${(m.performance * 100).toFixed(1)}%`)}
          ${card("Quality Estimate", `${(m.quality * 100).toFixed(1)}%`)}
          ${card("Throughput", `${m.throughput.toFixed(1)} veh/hr`)}
          ${card("Average Cycle Time", `${m.averageCycleTime.toFixed(0)} s`)}
          ${card("Cycle-Time Variance", `${m.cycleTimeVariance.toFixed(1)} s`)}
          ${card("Robot Utilization", `${m.robotUtilization.toFixed(0)}%`)}
          ${card("Energy Estimate per Vehicle", `${m.energyEstimate.toFixed(1)} kWh`)}
          ${card("Modeled Defect Risk", `${m.defectRisk.toFixed(1)}%`)}
          ${card("Safety Stops", String(m.safetyStops))}
          ${card("Protective-Stop Duration", `${m.protectiveStopDuration.toFixed(1)} s`)}
          ${card("Primary Bottleneck", escapeHtml(m.primaryBottleneck))}
        </div>
      </section>
      <section class="consoleSection">
        <h3>Modeled Trends</h3>
        <span class="miniLabel">Throughput trend</span>${lineChart(valuesToPoints(analyticsState.history.throughput), "#86efac")}
        <span class="miniLabel">Cycle-time trend</span>${lineChart(valuesToPoints(analyticsState.history.cycleTime), "#7dd3fc")}
        <span class="miniLabel">Robot-utilization trend</span>${lineChart(valuesToPoints(analyticsState.history.utilization), "#f7b955")}
        <span class="miniLabel">Defect-risk trend</span>${lineChart(valuesToPoints(analyticsState.history.defectRisk), "#f87171")}
        <span class="miniLabel">Energy-estimate trend</span>${lineChart(valuesToPoints(analyticsState.history.energy), "#c4b5fd")}
      </section>
      <section class="consoleSection">
        <h3>Station Performance</h3>
        <div class="tableWrap"><table class="dataTable"><thead><tr><th>Station</th><th>Util</th><th>Cycle</th><th>Delay</th><th>Quality</th><th>Maint</th><th>Status</th></tr></thead><tbody>${analyticsState.stationRows.map((row) => `<tr class="${row.station === stationLabels[getSnapshot().activeStation] ? "activeRow" : ""}"><td>${row.station}</td><td>${row.utilization.toFixed(0)}%</td><td>${row.modeledCycleTime.toFixed(1)} s</td><td>${row.delayRisk.toFixed(0)}%</td><td>${row.qualityRisk.toFixed(1)}%</td><td>${row.maintenanceRisk.toFixed(0)}%</td><td>${statusBadge(row.status)}</td></tr>`).join("")}</tbody></table></div>
      </section>
      <section class="consoleSection">
        <h3>Generated Insights</h3>
        <div class="eventLog">${analyticsState.insights.map((insight) => `<div><span>MODEL</span><strong>INFO</strong><span>${escapeHtml(insight)}</span></div>`).join("")}</div>
      </section>
    `;
  }
}

function visibleSensors(sensors, snapshot, showAllSensors) {
  const filtered = showGlobalFirst(sensors.filter((sensor) => sensor.station === "global" || sensor.station === snapshot.activeStation || sensor.station === snapshot.selectedStage));
  return filtered.length && !showAllSensors ? filtered : showGlobalFirst(sensors);
}

function showGlobalFirst(sensors) {
  return [...sensors].sort((a, b) => (a.station === "global" ? -1 : 0) - (b.station === "global" ? -1 : 0));
}

function card(label, value) {
  return `<div class="intelCard"><span>${label}</span><strong>${value}</strong></div>`;
}

function statusBadge(status) {
  const normalized = String(status).replace(/\s+/g, "-").toLowerCase();
  const cls = normalized.includes("stop") ? "status-stop" : normalized.includes("watch") || normalized.includes("monitor") || normalized.includes("paused") ? "status-watch" : normalized.includes("warning") || normalized.includes("soon") || normalized.includes("bottleneck") || normalized.includes("hold") ? "status-warning" : "status-normal";
  return `<span class="badge ${cls}"><i class="statusDot"></i>${escapeHtml(status)}</span>`;
}

function lineChart(points, color) {
  const values = points.map((point) => typeof point === "number" ? point : point.value).filter((value) => Number.isFinite(value));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = Math.max(0.001, max - min);
  const coords = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 100;
    const y = 86 - ((value - min) / range) * 72;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  return `<svg class="chartSvg" viewBox="0 0 100 94" role="img" aria-label="Modeled trend chart">
    <path d="M0 86 H100 M0 50 H100 M0 14 H100" stroke="#26313a" stroke-width="0.8"/>
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function valuesToPoints(values) {
  return values.map((value) => ({ value }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
