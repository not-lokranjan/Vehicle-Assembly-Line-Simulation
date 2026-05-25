import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const tmp = new THREE.Vector3();

export function makeMaterials() {
  return {
    floor: mat(0x202833, 0.86, 0.15),
    rail: mat(0x394653, 0.62, 0.2),
    steel: mat(0xb9c7d2, 0.34, 0.55),
    darkSteel: mat(0x39434d, 0.42, 0.35),
    black: mat(0x15191f, 0.48, 0.1),
    white: mat(0xe8eef2, 0.3, 0.25),
    yellow: mat(0xf7b955, 0.36, 0.35),
    blue: mat(0x53c7f0, 0.34, 0.35),
    orange: mat(0xf97316, 0.44, 0.25),
    red: mat(0xf06d6d, 0.5, 0.2),
    green: mat(0x85df8a, 0.42, 0.25),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9ad6ff,
      roughness: 0.08,
      transmission: 0.25,
      transparent: true,
      opacity: 0.34,
      metalness: 0,
    }),
    carPaint: mat(0x2f7fbf, 0.25, 0.55),
    primer: mat(0x9aa3a9, 0.62, 0.1),
    tire: mat(0x111418, 0.74, 0.08),
    zone: new THREE.MeshBasicMaterial({
      color: 0x3ddc97,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    }),
    stopZone: new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    }),
    spark: new THREE.MeshBasicMaterial({ color: 0xfff1a8 }),
  };
}

function mat(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function box(group, size, position, material, name = "") {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function cyl(group, radius, depth, position, material, name = "", radial = 32) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, radial), material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function capsule(group, radius, length, position, material, name = "") {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 10, 20), material);
  mesh.position.set(...position);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function makeCobot(materials, options) {
  const robot = new THREE.Group();
  robot.name = options.name;
  robot.position.set(...options.position);
  robot.rotation.y = options.rotationY ?? 0;
  robot.userData.home = robot.position.clone();

  const variant = options.variant ?? "cobot";
  robot.userData.variant = variant;
  if (variant === "inspection") return makeInspectionScanner(robot, materials);
  if (variant === "gantry") return makeChassisGantry(robot, materials);
  if (variant === "paint") return makePaintRailRobot(robot, materials);

  const armMat = options.variant === "paint" ? materials.white : options.color === "yellow" ? materials.yellow : materials.blue;
  const size = variant === "heavy" || variant === "welder" ? 1.18 : variant === "inspection" ? 0.78 : 1;
  robot.scale.setScalar(size);
  const base = cyl(robot, variant === "gantry" ? 0.24 : 0.34, 0.22, [0, 0.12, 0], materials.darkSteel, "anchored base");
  base.scale.x = variant === "heavy" || variant === "welder" ? 1.45 : 1.18;
  box(robot, [0.72, 0.08, 0.72], [0, 0.04, 0], materials.black, "floor mounting plate");
  if (variant === "heavy" || variant === "welder") {
    box(robot, [0.86, 0.24, 0.12], [0, 0.22, 0.42], materials.orange, "heavy payload counterweight");
    box(robot, [0.86, 0.24, 0.12], [0, 0.22, -0.42], materials.orange, "heavy payload counterweight");
  }
  if (variant === "paint") {
    box(robot, [0.5, 0.52, 0.42], [-0.22, 0.38, 0], materials.white, "paint robot sealed shoulder cover");
    cyl(robot, 0.07, 0.8, [-0.55, 0.55, 0], materials.black, "paint supply hose").rotation.z = -0.25;
  }
  if (variant === "gantry") {
    box(robot, [0.42, 1.0, 0.18], [0, 0.55, 0], materials.steel, "vertical inspection mast");
    box(robot, [1.1, 0.12, 0.18], [0.34, 1.03, 0], materials.darkSteel, "camera gantry rail");
  }

  const turntable = new THREE.Group();
  turntable.position.y = 0.24;
  robot.add(turntable);
  cyl(turntable, 0.27, 0.18, [0, 0, 0], armMat, "rotating pedestal");

  const shoulder = new THREE.Group();
  shoulder.position.y = 0.22;
  turntable.add(shoulder);
  cyl(shoulder, 0.18, 0.42, [0, 0, 0], materials.steel, "shoulder motor").rotation.z = Math.PI / 2;
  box(shoulder, [0.18, 0.34, 0.46], [0, 0.08, 0], armMat, "shoulder yoke");

  const upper = new THREE.Group();
  upper.position.set(0.13, 0.32, 0);
  shoulder.add(upper);
  const upperLink = capsule(upper, 0.095, 0.92, [0.42, 0.28, 0], armMat, "upper arm link");
  upperLink.rotation.z = Math.PI / 2.65;
  if (variant === "heavy" || variant === "welder") upperLink.scale.set(1.22, 1.22, 1.22);
  if (variant === "paint") upperLink.scale.set(0.92, 1.08, 0.92);
  box(upper, [0.64, 0.09, 0.17], [0.43, 0.31, 0.12], materials.steel, "upper arm service cover");
  box(upper, [0.64, 0.09, 0.17], [0.43, 0.31, -0.12], materials.steel, "upper arm service cover");

  const elbow = new THREE.Group();
  elbow.position.set(0.82, 0.55, 0);
  shoulder.add(elbow);
  cyl(elbow, 0.17, 0.38, [0, 0, 0], materials.steel, "elbow motor").rotation.z = Math.PI / 2;

  const forearm = new THREE.Group();
  forearm.position.set(0.14, 0.02, 0);
  elbow.add(forearm);
  const foreLink = capsule(forearm, 0.078, 0.78, [0.36, -0.2, 0], armMat, "forearm link");
  foreLink.rotation.z = Math.PI / 2.08;
  if (variant === "inspection") foreLink.scale.set(0.82, 0.82, 0.82);
  if (variant === "paint") foreLink.scale.set(0.88, 1.18, 0.88);
  box(forearm, [0.5, 0.08, 0.14], [0.36, -0.17, 0.11], materials.steel, "forearm service cover");
  box(forearm, [0.5, 0.08, 0.14], [0.36, -0.17, -0.11], materials.steel, "forearm service cover");

  const wrist = new THREE.Group();
  wrist.position.set(0.74, -0.38, 0);
  elbow.add(wrist);
  cyl(wrist, 0.13, 0.26, [0, 0, 0], materials.steel, "wrist roll motor").rotation.x = Math.PI / 2;
  cyl(wrist, 0.09, 0.22, [0.16, 0, 0], armMat, "tool flange").rotation.z = Math.PI / 2;
  if (variant === "welder") box(wrist, [0.1, 0.28, 0.32], [-0.18, 0, 0], materials.black, "weld cable strain relief");
  if (variant === "inspection") box(wrist, [0.16, 0.16, 0.36], [0.18, 0, 0], materials.green, "inspection light cluster");

  addBolts(robot, materials.black);
  const cable = makeCable(materials.black);
  shoulder.add(cable);

  robot.userData.parts = { turntable, shoulder, upper, elbow, forearm, wrist };
  robot.userData.rest = { upper: upper.position.clone(), wrist: wrist.position.clone() };
  robot.userData.toolMount = wrist;
  robot.userData.tool = null;
  robot.userData.phase = Math.random() * Math.PI * 2;
  return robot;
}

function makeInspectionScanner(robot, materials) {
  box(robot, [0.75, 0.08, 0.6], [0, 0.04, 0], materials.black, "inspection base skid");
  box(robot, [0.18, 1.1, 0.18], [0, 0.62, 0], materials.darkSteel, "vertical scanner column");
  box(robot, [1.05, 0.12, 0.16], [0.38, 1.15, 0], materials.steel, "horizontal camera boom");
  const slider = new THREE.Group();
  slider.position.set(0.72, 1.08, 0);
  robot.add(slider);
  box(slider, [0.26, 0.18, 0.22], [0, 0, 0], materials.green, "vision sensor carriage");
  cyl(slider, 0.06, 0.08, [0.16, -0.02, 0], materials.glass, "camera lens", 18).rotation.z = Math.PI / 2;
  box(slider, [0.42, 0.025, 0.34], [0.16, -0.16, 0], materials.green, "LED inspection bar");
  const dummy = new THREE.Group();
  robot.add(dummy);
  robot.userData.parts = { turntable: dummy, shoulder: dummy, upper: slider, elbow: dummy, forearm: dummy, wrist: slider };
  robot.userData.rest = { upper: slider.position.clone(), wrist: slider.position.clone() };
  robot.userData.variant = "inspection";
  robot.userData.toolMount = slider;
  robot.userData.tool = null;
  robot.userData.phase = Math.random() * Math.PI * 2;
  return robot;
}

function makeChassisGantry(robot, materials) {
  box(robot, [1.7, 0.08, 0.62], [0, 0.04, 0], materials.black, "chassis gantry floor rail");
  box(robot, [0.1, 1.35, 0.1], [-0.72, 0.7, -0.24], materials.steel, "left gantry upright");
  box(robot, [0.1, 1.35, 0.1], [-0.72, 0.7, 0.24], materials.steel, "left gantry upright");
  box(robot, [0.1, 1.35, 0.1], [0.72, 0.7, -0.24], materials.steel, "right gantry upright");
  box(robot, [0.1, 1.35, 0.1], [0.72, 0.7, 0.24], materials.steel, "right gantry upright");
  box(robot, [1.55, 0.12, 0.12], [0, 1.34, -0.24], materials.darkSteel, "front bridge beam");
  box(robot, [1.55, 0.12, 0.12], [0, 1.34, 0.24], materials.darkSteel, "rear bridge beam");
  const carriage = new THREE.Group();
  carriage.position.set(0.15, 1.2, 0);
  robot.add(carriage);
  box(carriage, [0.34, 0.18, 0.34], [0, 0, 0], materials.yellow, "gantry lift carriage");
  box(carriage, [0.08, 0.65, 0.08], [0, -0.38, 0], materials.steel, "vertical lift slide");
  box(carriage, [0.64, 0.08, 0.34], [0, -0.74, 0], materials.darkSteel, "vacuum spreader bar");
  [-0.24, 0.24].forEach((x) => [-0.12, 0.12].forEach((z) => cyl(carriage, 0.06, 0.035, [x, -0.8, z], materials.black, "vacuum cup", 18)));
  const dummy = new THREE.Group();
  robot.add(dummy);
  robot.userData.parts = { turntable: dummy, shoulder: dummy, upper: carriage, elbow: dummy, forearm: dummy, wrist: carriage };
  robot.userData.rest = { upper: carriage.position.clone(), wrist: carriage.position.clone() };
  robot.userData.variant = "gantry";
  robot.userData.toolMount = carriage;
  robot.userData.tool = null;
  robot.userData.phase = Math.random() * Math.PI * 2;
  return robot;
}

function makePaintRailRobot(robot, materials) {
  box(robot, [1.25, 0.08, 0.54], [0, 0.04, 0], materials.black, "paint robot rail base");
  box(robot, [0.18, 1.05, 0.18], [-0.36, 0.58, 0], materials.white, "sealed paint lift column");
  box(robot, [0.78, 0.14, 0.18], [0.02, 1.03, 0], materials.white, "sealed horizontal slide");
  cyl(robot, 0.055, 1.1, [-0.5, 0.8, 0.25], materials.black, "paint hose bundle", 16).rotation.z = -0.4;
  const wrist = new THREE.Group();
  wrist.position.set(0.42, 0.94, 0);
  robot.add(wrist);
  box(wrist, [0.22, 0.18, 0.18], [0, 0, 0], materials.white, "sealed wrist block");
  cyl(wrist, 0.055, 0.42, [0.26, 0, 0], materials.orange, "spray lance").rotation.z = Math.PI / 2;
  cyl(wrist, 0.12, 0.035, [0.52, 0, 0], materials.steel, "rotary atomizer bell").rotation.z = Math.PI / 2;
  const dummy = new THREE.Group();
  robot.add(dummy);
  robot.userData.parts = { turntable: dummy, shoulder: dummy, upper: wrist, elbow: dummy, forearm: dummy, wrist };
  robot.userData.rest = { upper: wrist.position.clone(), wrist: wrist.position.clone() };
  robot.userData.variant = "paint";
  robot.userData.toolMount = wrist;
  robot.userData.tool = null;
  robot.userData.phase = Math.random() * Math.PI * 2;
  return robot;
}

function addBolts(robot, material) {
  const boltGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12);
  const positions = [
    [-0.25, 0.09, -0.25],
    [0.25, 0.09, -0.25],
    [-0.25, 0.09, 0.25],
    [0.25, 0.09, 0.25],
  ];
  positions.forEach((p) => {
    const bolt = new THREE.Mesh(boltGeo, material);
    bolt.position.set(...p);
    bolt.castShadow = true;
    robot.add(bolt);
  });
}

function makeCable(material) {
  const points = [
    new THREE.Vector3(-0.08, 0.12, -0.22),
    new THREE.Vector3(0.24, 0.44, -0.3),
    new THREE.Vector3(0.62, 0.62, -0.28),
    new THREE.Vector3(0.9, 0.28, -0.22),
  ];
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.025, 8, false), material);
  tube.name = "external cable harness";
  tube.castShadow = true;
  return tube;
}

export function setRobotTool(robot, toolName, materials) {
  if (robot.userData.tool) robot.userData.toolMount.remove(robot.userData.tool);
  const tool = new THREE.Group();
  tool.name = `${toolName} end effector`;
  if (toolName === "weld") makeWeldGun(tool, materials);
  if (toolName === "grip") makeGripper(tool, materials);
  if (toolName === "paint") makePaintHead(tool, materials);
  if (toolName === "driver") makeDriver(tool, materials);
  if (toolName === "vision") makeVisionHead(tool, materials);
  if (toolName === "suction") makeSuctionHead(tool, materials);
  robot.userData.toolMount.add(tool);
  robot.userData.tool = tool;
}

function makeWeldGun(group, materials) {
  box(group, [0.18, 0.12, 0.14], [0.29, 0, 0], materials.darkSteel, "weld transformer");
  const jawA = box(group, [0.42, 0.045, 0.05], [0.55, 0.08, 0], materials.orange, "upper weld electrode");
  const jawB = box(group, [0.42, 0.045, 0.05], [0.55, -0.08, 0], materials.orange, "lower weld electrode");
  jawA.rotation.z = -0.28;
  jawB.rotation.z = 0.28;
  cyl(group, 0.035, 0.34, [0.78, 0, 0], materials.steel, "electrode tip").rotation.x = Math.PI / 2;
}

function makeGripper(group, materials) {
  box(group, [0.26, 0.1, 0.2], [0.28, 0, 0], materials.darkSteel, "parallel gripper block");
  box(group, [0.07, 0.36, 0.06], [0.48, 0.18, 0.08], materials.steel, "left gripper finger");
  box(group, [0.07, 0.36, 0.06], [0.48, -0.18, 0.08], materials.steel, "right gripper finger");
  box(group, [0.07, 0.36, 0.06], [0.48, 0.18, -0.08], materials.steel, "left gripper finger");
  box(group, [0.07, 0.36, 0.06], [0.48, -0.18, -0.08], materials.steel, "right gripper finger");
}

function makePaintHead(group, materials) {
  cyl(group, 0.08, 0.32, [0.3, 0, 0], materials.darkSteel, "paint valve body").rotation.z = Math.PI / 2;
  cyl(group, 0.04, 0.34, [0.52, 0, 0], materials.orange, "atomizer nozzle").rotation.z = Math.PI / 2;
  cyl(group, 0.12, 0.04, [0.72, 0, 0], materials.steel, "spray bell").rotation.z = Math.PI / 2;
}

function makeDriver(group, materials) {
  box(group, [0.16, 0.16, 0.16], [0.28, 0, 0], materials.darkSteel, "torque driver motor");
  cyl(group, 0.035, 0.5, [0.56, 0, 0], materials.steel, "screwdriver spindle").rotation.z = Math.PI / 2;
  cyl(group, 0.055, 0.08, [0.85, 0, 0], materials.black, "socket bit").rotation.z = Math.PI / 2;
}

function makeVisionHead(group, materials) {
  box(group, [0.22, 0.14, 0.14], [0.3, 0, 0], materials.darkSteel, "vision camera body");
  cyl(group, 0.055, 0.08, [0.45, 0, 0], materials.glass, "camera lens").rotation.z = Math.PI / 2;
  box(group, [0.34, 0.025, 0.24], [0.48, 0.13, 0], materials.green, "inspection light bar");
}

function makeSuctionHead(group, materials) {
  box(group, [0.22, 0.1, 0.16], [0.25, 0, 0], materials.darkSteel, "vacuum manifold");
  [-0.13, 0.13].forEach((z) => {
    cyl(group, 0.045, 0.3, [0.48, 0, z], materials.steel, "vacuum tube").rotation.z = Math.PI / 2;
    cyl(group, 0.075, 0.035, [0.66, 0, z], materials.black, "suction cup").rotation.z = Math.PI / 2;
  });
}

export function animateCobot(robot, t, load, stationOffset = 0) {
  const p = robot.userData.parts;
  const phase = t + robot.userData.phase + stationOffset;
  p.turntable.rotation.y = Math.sin(phase * 0.55) * 0.45 * load;
  p.shoulder.rotation.z = Math.sin(phase * 0.72) * 0.18 * load;
  p.upper.rotation.z = Math.sin(phase * 0.95) * 0.4 * load;
  p.elbow.rotation.z = -0.28 + Math.cos(phase * 1.08) * 0.46 * load;
  p.forearm.rotation.z = Math.sin(phase * 1.3) * 0.22 * load;
  p.wrist.rotation.y = Math.sin(phase * 1.7) * 0.9 * load;
  if (robot.userData.tool) robot.userData.tool.rotation.x = Math.sin(phase * 2.2) * 0.22 * load;
}

export function makeHuman(materials) {
  const human = new THREE.Group();
  capsule(human, 0.18, 0.72, [0, 1.12, 0], materials.red, "operator torso");
  cyl(human, 0.17, 0.1, [0, 1.64, 0], materials.red, "helmet").scale.y = 0.8;
  capsule(human, 0.055, 0.42, [-0.2, 1.25, 0], materials.steel, "left arm").rotation.z = -0.28;
  capsule(human, 0.055, 0.42, [0.2, 1.25, 0], materials.steel, "right arm").rotation.z = 0.28;
  box(human, [0.34, 0.08, 0.22], [0, 1.48, 0.12], materials.glass, "visor");
  human.traverse((node) => {
    if (node.isMesh) node.castShadow = true;
  });
  return human;
}

export function trackWorldPosition(object) {
  object.getWorldPosition(tmp);
  return tmp.clone();
}
