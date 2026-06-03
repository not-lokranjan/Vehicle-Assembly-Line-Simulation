import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import {
  animateCobot,
  makeCobot,
  makeHuman,
  makeMaterials,
  setRobotTool,
  trackWorldPosition,
} from "./robotFactory.js";
import { makeFactory, makeSafetyZone, makeSparks, stationData, updateBodyTypeLabel } from "./factoryScene.js";
import { initIntelligenceConsole } from "./intelligenceConsole.js";

const canvas = document.querySelector("#scene");
const ui = {
  station: document.querySelector("#station"),
  proximity: document.querySelector("#proximity"),
  speed: document.querySelector("#speed"),
  showZones: document.querySelector("#showZones"),
  showSensors: document.querySelector("#showSensors"),
  enableAi: document.querySelector("#enableAi"),
  openConsole: document.querySelector("#openConsoleBtn"),
  pause: document.querySelector("#pauseBtn"),
  reset: document.querySelector("#resetBtn"),
  mode: document.querySelector("#mode"),
  task: document.querySelector("#task"),
  cycle: document.querySelector("#cycle"),
  completed: document.querySelector("#completed"),
  util: document.querySelector("#util"),
  stops: document.querySelector("#stops"),
  title: document.querySelector("#stationTitle"),
  detailBox: document.querySelector("#detailBox"),
  detailsBtn: document.querySelector("#detailsBtn"),
  detailsText: document.querySelector("#detailsText"),
  twinState: document.querySelector("#twinState"),
  schedulerState: document.querySelector("#schedulerState"),
  maintenanceState: document.querySelector("#maintenanceState"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e11);
scene.fog = new THREE.Fog(0x0c0e11, 10, 22);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const materials = makeMaterials();
const factory = makeFactory(materials);
scene.add(factory.root);

scene.add(new THREE.HemisphereLight(0xdff7ff, 0x1a1f28, 1.7));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
keyLight.position.set(1.5, 8, 3.8);
keyLight.castShadow = true;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 22;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9ad6ff, 1.2);
fillLight.position.set(-6, 4, -5);
scene.add(fillLight);

const robots = [
  makeCobot(materials, { name: "press unload cobot", color: "blue", variant: "heavy", position: [-6.1, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "BIW spot welding robot", color: "yellow", variant: "welder", position: [-3.95, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "closure handling cobot", color: "blue", variant: "heavy", position: [-1.95, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "paint spray cobot", color: "blue", variant: "paint", position: [-0.15, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "trim assist cobot", color: "yellow", variant: "heavy", position: [2.55, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "chassis marriage cobot", color: "blue", variant: "gantry", position: [4.15, 0.35, -3.0], rotationY: 2.6 }),
  makeCobot(materials, { name: "final fit cobot", color: "yellow", variant: "cobot", position: [6.25, 0.35, 0.6], rotationY: -0.45 }),
  makeCobot(materials, { name: "vision inspection gantry", color: "blue", variant: "inspection", position: [7.65, 0.35, 0.6], rotationY: -0.45 }),
];
robots.forEach((robot) => scene.add(robot));

const stationRobots = {
  press: [robots[0], robots[2]],
  body: [robots[1], robots[5]],
  closures: [robots[2], robots[6]],
  paint: [robots[3], robots[1]],
  trim: [robots[4], robots[6]],
  chassis: [robots[5], robots[4]],
  final: [robots[6], robots[5]],
  inspect: [robots[7], robots[6]],
};

const human = makeHuman(materials);
human.position.set(-1.4, 0.05, 1.35);
scene.add(human);

const safetyZones = {
  press: makeSafetyZone(materials, -5.7),
  body: makeSafetyZone(materials, -3.7),
  closures: makeSafetyZone(materials, -1.7),
  paint: makeSafetyZone(materials, 0.3),
  trim: makeSafetyZone(materials, 2.2),
  chassis: makeSafetyZone(materials, 4.1),
  final: makeSafetyZone(materials, 6.0),
  inspect: makeSafetyZone(materials, 7.8),
};
Object.values(safetyZones).forEach((zone) => scene.add(zone));

const sensorBeacons = makeSensorBeacons();
scene.add(sensorBeacons.root);

const sparks = makeSparks(materials);
sparks.position.set(-3.7, 1.22, -1.38);
scene.add(sparks);

const paintMist = makeParticleCloud(0x72b7ff, 16, 0.035);
paintMist.position.set(0.3, 1.1, -1.45);
scene.add(paintMist);

const scanBeams = makeScanBeams();
scanBeams.position.set(7.8, 1.15, -1.72);
scene.add(scanBeams);

let paused = false;
let elapsed = 0;
let stops = 0;
let lastStop = false;
let completedCars = 0;
let activeUtil = 0;
let displayedStation = "overview";
let cameraTarget = new THREE.Vector3();
let desiredCamera = new THREE.Vector3();
let desiredTarget = new THREE.Vector3();
let userCameraOffset = new THREE.Vector3();
let rightDrag = null;
let vehicleType = "sedan";
let manualStationWork = 0;
let manualStationKey = "overview";
let overviewIndex = 0;
let overviewPhase = "dwell";
let overviewPhaseTime = 0;
let overviewMoveFrom = 0;
let overviewMoveTo = 1;
let vehicleSequence = 0;
let latestMode = { label: "Collaborative", scale: 1, stop: false };
let latestCycle = { key: "press", index: 0, work: 0, x: -5.7, stopped: true };
let latestDistance = 2.4;
let latestLoad = 0;
let latestCycleTimeSeconds = 88;
let latestSensorStatuses = new Map();
const carRideHeight = 0.38;
const carPaintPalette = [0x2f7fbf, 0x1f9d72, 0xd14f45, 0xf2c14e, 0x8b5cf6, 0xe8eef2, 0x2f343c];
let currentPaintColor = carPaintPalette[0];

const lineStations = [
  { key: "press", x: -5.7 },
  { key: "body", x: -3.7 },
  { key: "closures", x: -1.7 },
  { key: "paint", x: 0.3 },
  { key: "trim", x: 2.2 },
  { key: "chassis", x: 4.1 },
  { key: "final", x: 6.0 },
  { key: "inspect", x: 7.8 },
];
const moveSeconds = 3.1;
const dwellSeconds = 4.2;
const resetSeconds = 0.9;

const clock = new THREE.Clock();

ui.pause.addEventListener("click", () => {
  paused = !paused;
  ui.pause.textContent = paused ? "Run" : "Pause";
});

ui.reset.addEventListener("click", resetStats);
ui.station.addEventListener("change", () => setStation(ui.station.value));
ui.showZones.addEventListener("change", updateZoneVisibility);
ui.showSensors.addEventListener("change", updateSensorVisibility);
ui.detailsBtn.addEventListener("click", toggleDetails);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("pointerdown", startPointerControl);
window.addEventListener("pointermove", updatePointerControl);
window.addEventListener("pointerup", () => {
  rightDrag = null;
});
canvas.addEventListener("wheel", zoomCamera, { passive: true });

setStation("overview");
camera.position.copy(desiredCamera);
cameraTarget.copy(desiredTarget);
camera.lookAt(cameraTarget);
const intelligenceConsole = initIntelligenceConsole({
  getSnapshot: getSimulationSnapshot,
  ui,
  onSensorStatus: (sensors) => {
    latestSensorStatuses = new Map(sensors.map((sensor) => [sensor.id, sensor.status]));
  },
});
resetStats();
render();

function setStation(station) {
  displayedStation = station;
  if (station !== manualStationKey) {
    manualStationKey = station;
    manualStationWork = 0;
  }
  const data = stationData[station];
  desiredCamera.set(...data.camera);
  desiredTarget.set(...data.target);
  ui.title.textContent = data.title;
  ui.task.textContent = data.task;
  updateDetails(station);

  robots.forEach((robot) => setRobotTool(robot, "vision", materials));
  if (station === "overview") {
    setRobotTool(robots[0], "grip", materials);
    setRobotTool(robots[1], "weld", materials);
    setRobotTool(robots[2], "grip", materials);
    setRobotTool(robots[3], "paint", materials);
    setRobotTool(robots[4], "driver", materials);
    setRobotTool(robots[5], "grip", materials);
    setRobotTool(robots[6], "driver", materials);
    setRobotTool(robots[7], "vision", materials);
  } else {
    const [a, b] = stationRobots[station];
    setRobotTool(a, data.toolA, materials);
    setRobotTool(b, data.toolB, materials);
  }
  updateZoneVisibility();
}

function updateDetails(station) {
  const hasDetails = station !== "overview" && Boolean(stationData[station]?.detail);
  ui.detailBox.hidden = !hasDetails;
  ui.detailsText.hidden = true;
  ui.detailsBtn.setAttribute("aria-expanded", "false");
  ui.detailsText.textContent = hasDetails ? stationData[station].detail : "";
}

function toggleDetails() {
  const expanded = ui.detailsBtn.getAttribute("aria-expanded") === "true";
  ui.detailsBtn.setAttribute("aria-expanded", String(!expanded));
  ui.detailsText.hidden = expanded;
}

function updateZoneVisibility() {
  Object.entries(safetyZones).forEach(([key, zone]) => {
    zone.visible = ui.showZones.checked && (displayedStation === "overview" || displayedStation === key);
  });
}

function updateSensorVisibility() {
  sensorBeacons.root.visible = ui.showSensors.checked;
}

function resetStats() {
  elapsed = 0;
  stops = 0;
  lastStop = false;
  completedCars = 0;
  activeUtil = 0;
  manualStationWork = 0;
  manualStationKey = displayedStation;
  overviewIndex = 0;
  overviewPhase = "dwell";
  overviewPhaseTime = 0;
  overviewMoveFrom = 0;
  overviewMoveTo = 1;
  userCameraOffset.set(0, 0, 0);
  latestMode = { label: "Collaborative", scale: 1, stop: false };
  latestCycle = { key: "press", index: 0, work: 0, x: -5.7, stopped: true };
  latestDistance = 2.4;
  latestLoad = 0;
  latestCycleTimeSeconds = 88;
  intelligenceConsole?.reset();
}

function modeFromHumanDistance(distance) {
  if (distance < 0.86) return { label: "Protective stop", scale: 0, stop: true };
  if (distance < 1.55) return { label: "Reduced speed", scale: 0.36, stop: false };
  return { label: "Collaborative", scale: 1, stop: false };
}

function currentStationX() {
  const map = { press: -5.7, body: -3.7, closures: -1.7, paint: 0.3, trim: 2.2, chassis: 4.1, final: 6.0, inspect: 7.8 };
  if (displayedStation === "overview") return getCycleState(Number(ui.speed.value) / 100).x;
  return map[displayedStation];
}

function updateHuman(dt) {
  const proximity = Number(ui.proximity.value) / 100;
  const x = currentStationX() + 1.15 - proximity * 1.25;
  human.position.x += (x - human.position.x) * Math.min(1, dt * 4);
  human.position.z = 1.65 - proximity * 1.05 + Math.sin(elapsed * 1.4) * 0.05;
  human.rotation.y = -0.45 + Math.sin(elapsed * 0.8) * 0.18;
}

function updateCar(speedScale) {
  const cycle = getCycleState(speedScale);
  updateVehicleType(cycle);
  const buildState = getBuildState(cycle);
  factory.car.visible = !cycle.reset;
  if (cycle.reset) {
    factory.car.position.set(lineStations[0].x, carRideHeight, -1.72);
  } else if (displayedStation === "overview") {
    factory.car.position.x = cycle.x;
    factory.car.position.y = carRideHeight;
    factory.car.position.z = -1.72;
  } else {
    factory.car.position.x += (currentStationX() - factory.car.position.x) * 0.08;
    factory.car.position.y = carRideHeight;
    factory.car.position.z = -1.72;
  }

  applyBuildState(buildState);
  factory.car.rotation.y = Math.sin(elapsed * 0.32) * 0.015;
  return { ...cycle, buildState };
}

function updateVehicleType(cycle) {
  setVehicleType(vehicleType);
}

function setVehicleType(type) {
  if (factory.car.userData.typeLabel) updateBodyTypeLabel(factory.car.userData.typeLabel, type);
}

function getCycleState(speedScale = 1) {
  if (displayedStation !== "overview") {
    const index = Math.max(0, lineStations.findIndex((station) => station.key === displayedStation));
    return { index, key: displayedStation, x: lineStations[index].x, work: manualStationWork, stopped: true };
  }
  if (overviewPhase === "reset") {
    return { index: 0, key: "reset", x: lineStations[0].x, work: 0, stopped: true, reset: true };
  }
  if (overviewPhase === "move") {
    const move = overviewPhaseTime / moveSeconds;
    return {
      index: overviewMoveFrom,
      key: lineStations[overviewMoveFrom].key,
      x: THREE.MathUtils.lerp(lineStations[overviewMoveFrom].x, lineStations[overviewMoveTo].x, move),
      work: 1,
      stopped: false,
    };
  }
  return {
    index: overviewIndex,
    key: lineStations[overviewIndex].key,
    x: lineStations[overviewIndex].x,
    work: overviewPhaseTime / dwellSeconds,
    stopped: true,
  };
}

function advanceOverviewCycle(dt, speedFactor) {
  if (displayedStation !== "overview" || paused) return;
  overviewPhaseTime += dt * Math.max(0.2, speedFactor);
  if (overviewPhase === "dwell" && overviewPhaseTime >= dwellSeconds) {
    if (overviewIndex === lineStations.length - 1) {
      overviewPhase = "reset";
      overviewPhaseTime = 0;
    } else {
      overviewPhase = "move";
      overviewMoveFrom = overviewIndex;
      overviewMoveTo = overviewIndex + 1;
      overviewPhaseTime = 0;
    }
  } else if (overviewPhase === "move" && overviewPhaseTime >= moveSeconds) {
    overviewIndex = overviewMoveTo;
    overviewPhase = "dwell";
    overviewPhaseTime = 0;
  } else if (overviewPhase === "reset" && overviewPhaseTime >= resetSeconds) {
    const types = ["sedan", "suv", "truck"];
    vehicleSequence += 1;
    vehicleType = types[vehicleSequence % types.length];
    currentPaintColor = nextPaintColor();
    overviewIndex = 0;
    overviewPhase = "dwell";
    overviewPhaseTime = 0;
    overviewMoveFrom = 0;
    overviewMoveTo = 1;
  }
}

function getBuildState(cycle) {
  if (cycle.reset) {
    return { activeStage: null, completedStage: -1, work: 0, paintDone: false };
  }
  const completedStage = cycle.work >= 0.94 ? cycle.index : cycle.index - 1;
  return {
    activeStage: cycle.index,
    completedStage,
    work: cycle.work,
    paintDone: cycle.index > 3 || (cycle.index === 3 && cycle.work > 0.58),
  };
}

function applyBuildState(state) {
  materials.carPaint.color.setHex(currentPaintColor);
  Object.entries(factory.car.userData.variantStageGroups).forEach(([type, groups]) => {
    groups.forEach((group, stage) => {
      if (type !== vehicleType) {
        group.visible = false;
        return;
      }
      const isComplete = stage <= state.completedStage;
      const isBeingAdded = stage === state.activeStage && state.work > 0.08;
      group.visible = isComplete || isBeingAdded;
      if (isBeingAdded && !isComplete) {
        const pop = THREE.MathUtils.smoothstep(state.work, 0.08, 0.9);
        group.scale.setScalar(0.18 + pop * 0.82);
        group.position.y = (1 - pop) * 0.45;
        group.position.z = (1 - pop) * 0.52;
      } else {
        group.scale.setScalar(1);
        group.position.y = 0;
        group.position.z = 0;
      }
      const removeSupports = state.completedStage >= 6 || state.activeStage >= 6;
      group.traverse((node) => {
        if (node.userData?.removeBeforeInspection) node.visible = group.visible && !removeSupports;
      });
    });
  });
  factory.car.userData.paintablesByType[vehicleType].forEach((mesh) => {
    mesh.material = state.paintDone ? materials.carPaint : materials.primer;
  });
  if (factory.car.userData.typeLabel) factory.car.userData.typeLabel.visible = state.completedStage >= 0;
}

function nextPaintColor() {
  let next = currentPaintColor;
  while (next === currentPaintColor) {
    next = carPaintPalette[Math.floor(Math.random() * carPaintPalette.length)];
  }
  return next;
}

function updateRobots(t, load, activeKeys, work) {
  robots.forEach((robot, i) => {
    const isActive =
      activeKeys.some((key) => stationRobots[key]?.includes(robot));
    robot.visible = displayedStation === "overview" || isActive || robot.position.distanceTo(factory.car.position) < 2.7;
    animateCobot(robot, t * (0.75 + (i % 3) * 0.1), isActive ? load : 0, i * 0.4);
    if (isActive) poseRobotAtWork(robot, work, load);
  });
}

function poseRobotAtWork(robot, work, load) {
  const reach = Math.sin(Math.min(1, Math.max(0, work)) * Math.PI) * load;
  const p = robot.userData.parts;
  const carWorld = factory.car.position.clone();
  carWorld.y = robot.position.y;
  const localTarget = robot.worldToLocal(carWorld.clone());
  const targetAngle = Math.atan2(-localTarget.z, localTarget.x);

  if (robot.userData.variant === "inspection") {
    p.upper.position.x = robot.userData.rest.upper.x + THREE.MathUtils.clamp(localTarget.x - robot.userData.rest.upper.x, -0.5, 0.5) * reach;
    p.upper.position.y = robot.userData.rest.upper.y - reach * 0.18;
    p.upper.position.z = robot.userData.rest.upper.z + THREE.MathUtils.clamp(localTarget.z, -0.9, 0.9) * 0.55 * reach;
    return;
  }
  if (robot.userData.variant === "gantry") {
    p.upper.position.x = robot.userData.rest.upper.x + THREE.MathUtils.clamp(localTarget.x - robot.userData.rest.upper.x, -0.7, 0.7) * reach;
    p.upper.position.y = robot.userData.rest.upper.y - reach * 0.28;
    p.upper.position.z = robot.userData.rest.upper.z + THREE.MathUtils.clamp(localTarget.z, -0.7, 0.7) * 0.45 * reach;
    return;
  }
  if (robot.userData.variant === "paint") {
    p.upper.position.x = robot.userData.rest.upper.x + THREE.MathUtils.clamp(localTarget.x - robot.userData.rest.upper.x, -0.55, 0.55) * reach;
    p.upper.position.y = robot.userData.rest.upper.y - reach * 0.12;
    p.upper.position.z = robot.userData.rest.upper.z + THREE.MathUtils.clamp(localTarget.z, -0.95, 0.95) * 0.6 * reach;
    p.upper.rotation.z = Math.sin(elapsed * 2.6) * reach * 0.18;
    return;
  }

  p.turntable.rotation.y = THREE.MathUtils.lerp(p.turntable.rotation.y, targetAngle, 0.65);
  p.shoulder.rotation.z += reach * 0.34;
  p.upper.rotation.z += reach * 0.95;
  p.elbow.rotation.z -= reach * 1.05;
  p.forearm.rotation.z += reach * 0.55;
  p.wrist.rotation.y += Math.sin(elapsed * 12) * reach * 0.08;
}

function updateEffects(load) {
  const cycle = getCycleState(Number(ui.speed.value) / 100);
  if (cycle.reset) {
    sparks.visible = false;
    paintMist.visible = false;
    scanBeams.visible = false;
    return;
  }
  const welding = (cycle.key === "body" || cycle.key === "closures") && cycle.work > 0.22 && cycle.work < 0.76;
  const painting = cycle.key === "paint" && cycle.work > 0.18 && cycle.work < 0.72;
  const scanning = cycle.key === "inspect" && cycle.work > 0.2 && cycle.work < 0.84;
  sparks.visible = (displayedStation === "overview" || displayedStation === "body" || displayedStation === "closures") && welding;
  sparks.position.set(factory.car.position.x + 0.1, 1.05, -1.34);
  sparks.children.forEach((spark, i) => {
    spark.visible = load > 0.2 && Math.sin(elapsed * 18 + i) > -0.65;
    spark.position.x = Math.sin(elapsed * 14 + i) * 0.28;
    spark.position.y = Math.abs(Math.sin(elapsed * 9 + i)) * 0.42;
    spark.position.z = Math.cos(elapsed * 11 + i) * 0.2;
  });
  paintMist.visible = (displayedStation === "overview" || displayedStation === "paint") && painting;
  paintMist.position.set(factory.car.position.x + 0.15, 1.15, -1.38);
  paintMist.children.forEach((p, i) => {
    p.position.x = Math.sin(elapsed * 1.4 + i) * 0.28;
    p.position.y = Math.sin(elapsed * 1.1 + i * 0.7) * 0.18;
    p.position.z = Math.cos(elapsed * 1.2 + i) * 0.34;
    p.material.opacity = 0.08 + 0.08 * load;
  });
  scanBeams.visible = (displayedStation === "overview" || displayedStation === "inspect") && scanning;
  scanBeams.position.set(factory.car.position.x, 1.15, -1.72);
  scanBeams.rotation.y = Math.sin(elapsed * 1.2) * 0.26;
}

function updateCamera(dt) {
  camera.position.lerp(desiredCamera.clone().add(userCameraOffset), Math.min(1, dt * 1.8));
  cameraTarget.lerp(desiredTarget.clone().add(userCameraOffset), Math.min(1, dt * 1.8));
  camera.lookAt(cameraTarget);
}

function updateMetrics(mode, speedFactor, dt, load) {
  if (mode.stop && !lastStop && elapsed > 0.5) stops += 1;
  lastStop = mode.stop;
  if (!paused) {
    completedCars += speedFactor * load * dt * 0.045;
    activeUtil += load * dt;
  }
  ui.mode.textContent = displayedStation === "overview" && mode.label === "Collaborative" ? "Conveyor stop-and-build" : mode.label;
  latestCycleTimeSeconds = 88 / Math.max(0.22, speedFactor * Math.max(load, 0.2));
  ui.cycle.textContent = `${latestCycleTimeSeconds.toFixed(0)} s`;
  ui.completed.textContent = `${Math.floor(completedCars)}`;
  ui.util.textContent = `${Math.min(99, Math.round((activeUtil / Math.max(1, elapsed)) * 86))}%`;
  ui.stops.textContent = `${stops}`;
}

function render() {
  requestAnimationFrame(render);
  resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) elapsed += dt;

  const speedFactor = Number(ui.speed.value) / 100;
  advanceOverviewCycle(dt, speedFactor);
  updateHuman(dt);
  const distance = Math.hypot(human.position.x - currentStationX(), human.position.z - 0.25);
  const mode = modeFromHumanDistance(distance);
  const load = paused ? 0 : mode.scale;
  if (displayedStation !== "overview" && !paused) {
    manualStationWork = Math.min(1, manualStationWork + Math.max(0.12, speedFactor * load) * dt / dwellSeconds);
  }
  const cycle = updateCar(speedFactor * load);
  latestMode = mode;
  latestCycle = cycle;
  latestDistance = distance;
  latestLoad = load;
  const activeKeys = displayedStation === "overview" ? [cycle.key] : [displayedStation];
  updateRobots(elapsed * speedFactor, load, activeKeys, cycle.work);
  updateEffects(load);
  updateSensorBeacons(mode);
  updateCamera(dt);
  updateMetrics(mode, speedFactor, dt, load);
  updateZones(distance, mode);

  renderer.render(scene, camera);
}

function getSimulationSnapshot() {
  const activeStation = displayedStation === "overview"
    ? latestCycle.key === "reset" ? "press" : latestCycle.key
    : displayedStation;
  const utilization = Math.min(99, (activeUtil / Math.max(1, elapsed)) * 86);
  return {
    elapsedTime: elapsed,
    isPaused: paused,
    selectedStage: displayedStation,
    selectedStageLabel: stationLabel(displayedStation),
    activeStation,
    activeStationLabel: stationLabel(activeStation),
    lineSpeed: Number(ui.speed.value),
    completedCars: Math.floor(completedCars),
    completedCarsRaw: completedCars,
    robotUtilization: utilization,
    safetyStops: stops,
    humanDistance: latestDistance,
    safetyMode: latestMode.label,
    currentTask: ui.task.textContent,
    cycleProgress: Math.min(1, Math.max(0, latestCycle.work ?? 0)),
    cycleTimeSeconds: latestCycleTimeSeconds,
    vehicleType,
    load: latestLoad,
  };
}

function stationLabel(key) {
  const labels = {
    overview: "Full process overview",
    press: "Press Shop",
    body: "Body Shop / BIW",
    closures: "Closure Hanging",
    paint: "Paint Shop",
    trim: "Trim Line",
    chassis: "Chassis Marriage",
    final: "Final Assembly",
    inspect: "End-of-Line Inspection",
    reset: "Line reset",
  };
  return labels[key] ?? key;
}

function makeSensorBeacons() {
  const root = new THREE.Group();
  root.name = "digital twin sensor beacons";
  const normal = new THREE.MeshBasicMaterial({ color: 0x8bd3ff, transparent: true, opacity: 0.72 });
  const definitions = [
    ["press-vibration", "press", [-5.72, 0.92, 0.38]],
    ["weld-temperature", "body", [-3.65, 1.22, -1.18]],
    ["paint-temperature", "paint", [0.12, 1.38, 0.98]],
    ["paint-humidity", "paint", [0.52, 1.38, 0.98]],
    ["chassis-load", "chassis", [4.12, 0.72, -2.48]],
    ["inspection-defect-risk", "inspect", [7.84, 1.48, -1.15]],
    ["operator-proximity", "global", [-1.05, 0.9, 0.88]],
  ];
  const nodes = {};
  definitions.forEach(([id, station, position]) => {
    const group = new THREE.Group();
    group.name = `${id} sensor node`;
    group.position.set(...position);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 14), normal.clone());
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38, 10), new THREE.MeshBasicMaterial({ color: 0x7b8794 }));
    mast.position.y = -0.22;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.12, 24), normal.clone());
    ring.rotation.x = Math.PI / 2;
    group.add(mast, beacon, ring);
    group.userData = { id, station, beacon, ring, baseScale: group.scale.clone() };
    root.add(group);
    nodes[id] = group;
  });
  return { root, nodes };
}

function updateSensorBeacons(mode) {
  const time = elapsed;
  sensorBeacons.root.visible = ui.showSensors.checked;
  Object.values(sensorBeacons.nodes).forEach((node) => {
    const status = latestSensorStatuses.get(node.userData.id) ?? "NORMAL";
    const active = node.userData.station === "global" || displayedStation === "overview" || node.userData.station === displayedStation || node.userData.station === latestCycle.key;
    const color = status === "STOP" ? 0xff6b6b : status === "WARNING" ? 0xf97316 : status === "WATCH" ? 0xf7b955 : 0x8bd3ff;
    const pulse = status === "NORMAL" ? 1 : 1 + Math.sin(time * 8) * 0.18 + 0.22;
    node.visible = active;
    node.scale.setScalar(node.userData.id === "operator-proximity" && mode.stop ? pulse * 1.25 : pulse);
    node.userData.beacon.material.color.setHex(color);
    node.userData.ring.material.color.setHex(color);
    node.userData.beacon.material.opacity = active ? 0.88 : 0.35;
    node.userData.ring.material.opacity = status === "NORMAL" ? 0.45 : 0.78;
  });
}

function updateZones(distance, mode) {
  Object.entries(safetyZones).forEach(([key, zone]) => {
    const near = displayedStation === key || displayedStation === "overview";
    zone.userData.stop.material.opacity = near && mode.stop ? 0.28 : 0.15;
    zone.userData.slow.material.opacity = near && distance < 1.55 ? 0.24 : 0.12;
  });
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.floor(width * renderer.getPixelRatio()) || canvas.height !== Math.floor(height * renderer.getPixelRatio())) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function makeParticleCloud(color, count, radius) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 });
  for (let i = 0; i < count; i += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material.clone());
    particle.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    group.add(particle);
  }
  return group;
}

function makeScanBeams() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0x6cff9d, transparent: true, opacity: 0.24, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i += 1) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1.4), material.clone());
    beam.position.set((i - 1.5) * 0.18, 0, 0);
    beam.rotation.x = Math.PI / 2;
    group.add(beam);
  }
  return group;
}

function startPointerControl(event) {
  if (event.button !== 2) return;
  rightDrag = {
    x: event.clientX,
    y: event.clientY,
    offset: userCameraOffset.clone(),
  };
  canvas.setPointerCapture(event.pointerId);
}

function updatePointerControl(event) {
  if (!rightDrag) return;
  const dx = (event.clientX - rightDrag.x) * 0.012;
  const dy = (event.clientY - rightDrag.y) * 0.012;
  userCameraOffset.set(rightDrag.offset.x - dx, rightDrag.offset.y + dy, rightDrag.offset.z);
}

function zoomCamera(event) {
  const direction = desiredCamera.clone().sub(desiredTarget).normalize();
  desiredCamera.addScaledVector(direction, Math.sign(event.deltaY) * 0.42);
}

if (Object.isExtensible(window)) {
  window.__simDebug = {
    scene,
    robots,
    human,
    factory,
    getToolPositions: () => robots.map((robot) => trackWorldPosition(robot.userData.toolMount)),
  };
}
