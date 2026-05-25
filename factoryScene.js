import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";
import { box, cyl } from "./robotFactory.js";

export const stationData = {
  overview: {
    title: "Full car manufacturing process",
    task: "End-to-end flow",
    camera: [1.4, 8.2, 11.8],
    target: [1.1, 0.55, -1.15],
    toolA: "grip",
    toolB: "vision",
  },
  press: {
    title: "1. Press Shop: sheet metal is stamped into structural and outer body panels",
    task: "Panel stamping",
    detail: "In the press shop, sheet-metal blanks are converted into repeatable structural and closure panels that define downstream dimensional accuracy. Interconnected cobots coordinate panel unloading, part orientation, and fixture handoff through shared cycle-state signals, allowing each stamped component to enter the digital production flow with traceable position, timing, and quality data before body assembly begins.",
    camera: [-6.4, 4.8, 5.2],
    target: [-5.5, 0.72, 0],
    toolA: "grip",
    toolB: "driver",
  },
  body: {
    title: "2. Body Shop / BIW: welded panels form the unpainted vehicle shell",
    task: "BIW framing",
    detail: "The body-in-white stage joins the underbody, side frames, pillars, and roof structure into a rigid vehicle shell before paint or trim is added. Robot interconnectivity is central here because welding arms, positioning cobots, safety scanners, and human operators must share fixture status, weld sequence timing, and proximity information so that geometry is maintained while collaborative motion remains safe and synchronized.",
    camera: [-4.4, 4.5, 4.9],
    target: [-3.8, 0.8, 0],
    toolA: "weld",
    toolB: "weld",
  },
  closures: {
    title: "3. Closure Hanging: doors, hood, decklid, hatch, or tailgate are aligned",
    task: "Closure hanging",
    detail: "Closure fitting attaches doors, hood, trunk lid, hatch, or tailgate to the body shell and establishes the panel gaps that strongly influence perceived build quality. Connected cobots use shared alignment references and task-state feedback to coordinate gripping, hinge positioning, fastening, and operator validation, ensuring each closure is assembled as part of the same controlled production sequence rather than as an isolated manual operation.",
    camera: [-2.3, 4.4, 5.0],
    target: [-1.7, 0.8, 0],
    toolA: "grip",
    toolB: "driver",
  },
  paint: {
    title: "4. Paint Shop: corrosion protection, primer, basecoat, and clearcoat are applied",
    task: "Paint body",
    detail: "The paint shop protects and finishes the body through electrocoat protection, primer preparation, base color application, and clear-coat sealing. Interconnected paint robots rely on synchronized booth state, vehicle identity, path recipes, and environmental feedback to maintain film consistency, reduce overspray, and connect coating quality data back to the same vehicle record used by upstream body and downstream assembly systems.",
    camera: [-0.1, 4.5, 5.6],
    target: [0.2, 0.8, 0],
    toolA: "paint",
    toolB: "paint",
  },
  trim: {
    title: "5. Trim Line: wiring, glass, cockpit, seating, and cabin systems are installed",
    task: "Trim installation",
    detail: "The trim line converts the painted shell into a functional cabin by installing wiring harnesses, glass, dashboard modules, seats, and interior components. Robot interconnectivity supports this high-variation stage by linking cobot assists, torque tools, part availability, and operator guidance to the vehicle build specification, enabling flexible assembly without losing traceability or ergonomic collaboration.",
    camera: [2.0, 4.4, 4.9],
    target: [2.1, 0.8, 0],
    toolA: "grip",
    toolB: "driver",
  },
  chassis: {
    title: "6. Chassis Marriage: powertrain, battery, suspension, and axles join the body",
    task: "Chassis marriage",
    detail: "Chassis marriage is the coordinated joining of the body with powertrain, battery, suspension, axles, and other underbody modules. Connected robots and lift systems must exchange precise pose, load, and sequencing data so heavy modules approach the body in a controlled motion envelope, while collaborative safety systems adjust robot behavior when operators enter shared work zones for guidance or verification.",
    camera: [4.3, 4.3, 4.8],
    target: [4.0, 0.8, 0],
    toolA: "grip",
    toolB: "driver",
  },
  final: {
    title: "7. Final Assembly: exterior parts, wheels, fluids, and functional items are completed",
    task: "Final assembly",
    detail: "Final fit completes the vehicle with wheels, bumpers, lamps, fluids, and verified fastening operations that prepare the product for functional testing. Interconnected cobots, torque devices, and inspection sensors close the loop between assembly action and quality confirmation by recording tool results against the vehicle identity and adapting task flow when a fastening, alignment, or component-fit condition requires correction.",
    camera: [6.2, 4.2, 4.9],
    target: [5.9, 0.78, 0],
    toolA: "driver",
    toolB: "grip",
  },
  inspect: {
    title: "8. End-of-Line Inspection: finished vehicle quality and functions are verified",
    task: "EOL inspection",
    detail: "The inspection stage validates the assembled vehicle through vision scans, gap assessment, paint-surface review, lighting checks, and torque verification. Robot interconnectivity enables inspection data to be compared with upstream process records, linking observed defects to the station, tool, or operation that may have produced them and supporting closed-loop quality control across the complete human-robot manufacturing line.",
    camera: [8.0, 4.2, 4.7],
    target: [7.7, 0.8, 0],
    toolA: "vision",
    toolB: "vision",
  },
};

export function makeFactory(materials) {
  const root = new THREE.Group();
  box(root, [14.5, 0.08, 5.6], [1.3, -0.04, 0], materials.floor, "factory floor");
  box(root, [13.4, 0.12, 0.48], [1.1, 0.16, -1.72], materials.rail, "main conveyor");
  box(root, [13.4, 0.08, 0.14], [1.1, 0.31, -1.35], materials.steel, "front conveyor rail");
  box(root, [13.4, 0.08, 0.14], [1.1, 0.31, -2.09], materials.steel, "rear conveyor rail");

  const positions = [-5.7, -3.7, -1.7, 0.3, 2.2, 4.1, 6.0, 7.8];
  const names = ["Press", "BIW", "Closures", "Paint", "Trim", "Chassis", "Final", "QA"];
  const stations = {};
  positions.forEach((x, i) => {
    const key = ["press", "body", "closures", "paint", "trim", "chassis", "final", "inspect"][i];
    const station = new THREE.Group();
    station.position.x = x;
    box(station, [1.72, 0.05, 4.8], [0, 0.02, 0], i % 2 ? materials.darkSteel : materials.rail, `${names[i]} floor bay`);
    box(station, [0.08, 1.55, 0.08], [-0.86, 0.77, 2.05], materials.steel, "station post");
    box(station, [0.08, 1.55, 0.08], [0.86, 0.77, 2.05], materials.steel, "station post");
    box(station, [1.9, 0.08, 0.08], [0, 1.52, 2.05], materials.steel, "station header");
    makeTextLabel(station, names[i], materials, [0, 1.72, 2.05]);
    root.add(station);
    stations[key] = station;
  });

  const car = makeCarBody(materials);
  root.add(car);
  const paintBooth = makePaintBooth(materials);
  paintBooth.position.set(0.3, 0, 0.24);
  root.add(paintBooth);
  const partsRacks = makePartsRacks(materials);
  root.add(partsRacks);

  return { root, stations, car, partsRacks };
}

function makeCarBody(materials) {
  const car = new THREE.Group();
  car.name = "progressive assembled car";
  car.position.set(-5.7, 0.38, -1.72);
  car.userData.stageGroups = [];
  car.userData.typeLabel = makeBodyTypeLabel("SEDAN");
  car.userData.typeLabel.name = "body type floating label";
  car.userData.typeLabel.position.set(0, 1.55, 0);
  car.add(car.userData.typeLabel);
  car.userData.variantStageGroups = {
    sedan: makeVariantBuildStages(materials, "sedan"),
    suv: makeVariantBuildStages(materials, "suv"),
    truck: makeVariantBuildStages(materials, "truck"),
  };
  Object.values(car.userData.variantStageGroups).forEach((groups) => {
    groups.forEach((group) => {
      group.visible = false;
      car.add(group);
    });
  });
  car.userData.paintablesByType = {
    sedan: collectPaintables(car.userData.variantStageGroups.sedan),
    suv: collectPaintables(car.userData.variantStageGroups.suv),
    truck: collectPaintables(car.userData.variantStageGroups.truck),
  };
  return car;
}

function makeVariantBuildStages(materials, type) {
  const stages = Array.from({ length: 8 }, (_, index) => {
    const group = new THREE.Group();
    group.name = `${type} build stage ${index}`;
    group.userData.stage = index;
    return group;
  });
  addVariantUnderbody(stages[0], materials, type);
  addVariantFrame(stages[1], materials, type);
  addVariantPanels(stages[2], materials, type);
  addPaintWitness(stages[3], materials, type);
  addVariantTrim(stages[4], materials, type);
  addVariantChassis(stages[5], materials, type);
  addVariantFinalFit(stages[6], materials, type);
  addQualityMarkers(stages[7], materials, type);
  return stages;
}

function addVariantUnderbody(group, materials, type) {
  const length = type === "truck" ? 2.45 : type === "suv" ? 2.28 : 2.14;
  const width = type === "sedan" ? 0.76 : 0.9;
  box(group, [length, 0.07, 0.08], [0, 0.13, width / 2], materials.darkSteel, `${type} right rocker rail`).userData.removeBeforeInspection = true;
  box(group, [length, 0.07, 0.08], [0, 0.13, -width / 2], materials.darkSteel, `${type} left rocker rail`).userData.removeBeforeInspection = true;
  [-0.82, -0.36, 0.18, 0.74].forEach((x) => {
    box(group, [0.08, 0.07, width], [x, 0.15, 0], materials.steel, `${type} crossmember`).userData.removeBeforeInspection = true;
  });
  box(group, [length * 0.68, 0.05, width * 0.72], [type === "truck" ? 0.18 : 0, 0.24, 0], materials.primer, `${type} floor pan`);
  if (type === "truck") box(group, [0.82, 0.06, width], [-0.78, 0.28, 0], materials.darkSteel, "pickup boxed bed floor");
}

function addVariantFrame(group, materials, type) {
  if (type === "sedan") {
    addPillars(group, materials, [-0.68, -0.16, 0.38], 0.56, 0.4);
    box(group, [1.14, 0.05, 0.05], [-0.12, 0.78, 0.4], materials.primer, "sedan right roof rail").userData.removeBeforeInspection = true;
    box(group, [1.14, 0.05, 0.05], [-0.12, 0.78, -0.4], materials.primer, "sedan left roof rail").userData.removeBeforeInspection = true;
    box(group, [0.54, 0.04, 0.8], [-0.1, 0.84, 0], materials.primer, "sedan roof bow panel");
  } else if (type === "suv") {
    addPillars(group, materials, [-0.82, -0.28, 0.34, 0.76], 1.0, 0.48);
    box(group, [1.68, 0.06, 0.06], [-0.1, 1.08, 0.48], materials.primer, "SUV right roof rail").userData.removeBeforeInspection = true;
    box(group, [1.68, 0.06, 0.06], [-0.1, 1.08, -0.48], materials.primer, "SUV left roof rail").userData.removeBeforeInspection = true;
    box(group, [1.22, 0.05, 0.96], [-0.08, 1.13, 0], materials.primer, "SUV long roof panel");
  } else {
    addPillars(group, materials, [0.1, 0.52, 0.88], 0.96, 0.46);
    box(group, [0.88, 0.06, 0.06], [0.52, 1.04, 0.46], materials.primer, "pickup right cab roof rail").userData.removeBeforeInspection = true;
    box(group, [0.88, 0.06, 0.06], [0.52, 1.04, -0.46], materials.primer, "pickup left cab roof rail").userData.removeBeforeInspection = true;
    box(group, [0.68, 0.05, 0.92], [0.54, 1.1, 0], materials.primer, "pickup cab roof panel");
    box(group, [0.88, 0.22, 0.055], [-0.72, 0.58, 0.48], materials.primer, "pickup right bed wall");
    box(group, [0.88, 0.22, 0.055], [-0.72, 0.58, -0.48], materials.primer, "pickup left bed wall");
    box(group, [0.055, 0.28, 0.96], [-1.18, 0.56, 0], materials.primer, "pickup tailgate frame");
  }
}

function addVariantPanels(group, materials, type) {
  if (type === "sedan") {
    addOuterSide(group, materials, "sedan", 2.2, 0.9, 0.44, 0.42);
    box(group, [0.36, 0.28, 0.9], [0.94, 0.43, 0], materials.primer, "sedan front fender pair");
    box(group, [0.36, 0.25, 0.9], [-0.98, 0.42, 0], materials.primer, "sedan rear quarter pair");
    box(group, [0.58, 0.22, 0.04], [0.42, 0.54, 0.46], materials.primer, "sedan right front door skin");
    box(group, [0.58, 0.22, 0.04], [0.42, 0.54, -0.46], materials.primer, "sedan left front door skin");
    box(group, [0.44, 0.2, 0.04], [-0.28, 0.53, 0.46], materials.primer, "sedan right rear door skin");
    box(group, [0.44, 0.2, 0.04], [-0.28, 0.53, -0.46], materials.primer, "sedan left rear door skin");
    box(group, [0.5, 0.16, 0.82], [0.86, 0.42, 0], materials.primer, "sedan hood skin");
    box(group, [0.42, 0.16, 0.82], [-1.0, 0.4, 0], materials.primer, "sedan trunk lid");
  } else if (type === "suv") {
    addOuterSide(group, materials, "SUV", 2.34, 1.02, 0.56, 0.52);
    box(group, [0.34, 0.42, 1.02], [-0.92, 0.62, 0], materials.primer, "SUV rear quarter and D-pillar panel");
    box(group, [0.32, 0.3, 1.0], [0.94, 0.52, 0], materials.primer, "SUV front fender pair");
    box(group, [0.78, 0.3, 0.04], [0.2, 0.66, 0.52], materials.primer, "SUV right door assembly");
    box(group, [0.78, 0.3, 0.04], [0.2, 0.66, -0.52], materials.primer, "SUV left door assembly");
    box(group, [0.46, 0.22, 0.92], [0.96, 0.5, 0], materials.primer, "SUV hood skin");
    box(group, [0.06, 0.48, 0.92], [-1.1, 0.62, 0], materials.primer, "SUV liftgate panel");
  } else {
    addOuterSide(group, materials, "pickup", 2.44, 1.0, 0.5, 0.5);
    box(group, [0.9, 0.28, 0.05], [-0.74, 0.62, 0.52], materials.primer, "pickup right bed outer skin");
    box(group, [0.9, 0.28, 0.05], [-0.74, 0.62, -0.52], materials.primer, "pickup left bed outer skin");
    box(group, [0.5, 0.28, 0.04], [0.6, 0.66, 0.5], materials.primer, "pickup right cab door");
    box(group, [0.5, 0.28, 0.04], [0.6, 0.66, -0.5], materials.primer, "pickup left cab door");
    box(group, [0.54, 0.18, 0.9], [1.04, 0.48, 0], materials.primer, "pickup hood skin");
    box(group, [0.82, 0.05, 0.9], [-0.72, 0.7, 0], materials.darkSteel, "pickup open bed insert");
  }
  [-0.38, 0, 0.38].forEach((x) => {
    const spot = cyl(group, 0.022, 0.012, [x, 0.74, 0.5], materials.spark, `${type} right weld nugget`, 14);
    spot.rotation.x = Math.PI / 2;
    const spot2 = cyl(group, 0.022, 0.012, [x, 0.74, -0.5], materials.spark, `${type} left weld nugget`, 14);
    spot2.rotation.x = Math.PI / 2;
  });
}

function addOuterSide(group, materials, name, length, width, y, z) {
  box(group, [length * 0.9, 0.2, 0.05], [0, y, z], materials.primer, `${name} right lower bodyside stamping`);
  box(group, [length * 0.9, 0.2, 0.05], [0, y, -z], materials.primer, `${name} left lower bodyside stamping`);
  box(group, [length * 0.78, 0.08, width], [0, y - 0.16, 0], materials.primer, `${name} rocker cover pair`);
  box(group, [0.1, 0.2, width], [length / 2 - 0.12, y, 0], materials.primer, `${name} front tie panel`);
  box(group, [0.1, 0.2, width], [-length / 2 + 0.12, y, 0], materials.primer, `${name} rear tie panel`);
}

function addVariantAssembly(group, materials, type) {
  const frontX = type === "truck" ? 0.98 : 0.78;
  box(group, [0.44, 0.14, 0.38], [frontX, 0.42, 0], materials.darkSteel, `${type} engine block`);
  [-0.12, 0.02, 0.16].forEach((z) => cyl(group, 0.04, 0.38, [frontX, 0.53, z], materials.steel, `${type} cylinder bank`, 18).rotation.z = Math.PI / 2);
  box(group, [0.44, 0.08, 0.56], [0, 0.34, 0], materials.black, `${type} battery pack`);
  box(group, [0.52, 0.12, 0.5], [type === "truck" ? 0.48 : 0, 0.62, 0], materials.black, `${type} interior module`);
  const wheels = type === "truck" ? [-0.82, 0.82] : type === "suv" ? [-0.74, 0.74] : [-0.72, 0.72];
  const width = type === "sedan" ? 0.88 : 0.98;
  wheels.forEach((x) => [-1, 1].forEach((side) => {
    const wheel = cyl(group, 0.18, 0.11, [x, 0.05, side * width / 2], materials.tire, `${type} wheel`, 28);
    wheel.rotation.x = Math.PI / 2;
    cyl(group, 0.075, 0.12, [x, 0.05, side * width / 2], materials.steel, `${type} wheel hub`, 20).rotation.x = Math.PI / 2;
  }));
}

function addVariantTrim(group, materials, type) {
  if (type === "sedan") {
    addSideGlass(group, materials, [
      [-0.58, 0.59], [-0.36, 0.86], [0.32, 0.86], [0.56, 0.6],
    ], 0.91, "sedan cabin glass");
    addRoofAndEndGlass(group, materials, type);
    addInterior(group, materials, "sedan", 0, 0.88);
  } else if (type === "suv") {
    addSideGlass(group, materials, [
      [-0.92, 0.72], [-0.56, 1.04], [0.52, 1.04], [0.84, 0.72],
    ], 1.01, "SUV greenhouse glass");
    addRoofAndEndGlass(group, materials, type);
    addInterior(group, materials, "SUV", -0.05, 0.98);
  } else {
    addSideGlass(group, materials, [
      [0.14, 0.64], [0.34, 1.0], [0.8, 1.0], [0.98, 0.64],
    ], 1.01, "pickup cab glass");
    addRoofAndEndGlass(group, materials, type);
    addInterior(group, materials, "pickup", 0.48, 0.98);
  }
}

function addRoofAndEndGlass(group, materials, type) {
  const spec = type === "truck"
    ? { roofX: 0.56, roofY: 1.11, roofL: 0.9, width: 1.04, frontX: 0.96, rearX: 0.14, glassY: 0.79, glassH: 0.44, aX: 0.86, bX: 0.55, cX: 0.18 }
    : type === "suv"
      ? { roofX: -0.08, roofY: 1.15, roofL: 1.68, width: 1.04, frontX: 0.84, rearX: -0.98, glassY: 0.78, glassH: 0.5, aX: 0.7, bX: 0.18, cX: -0.52 }
      : { roofX: -0.08, roofY: 0.92, roofL: 1.08, width: 0.94, frontX: 0.56, rearX: -0.64, glassY: 0.64, glassH: 0.42, aX: 0.46, bX: -0.06, cX: -0.48 };
  box(group, [spec.roofL, 0.06, spec.width], [spec.roofX, spec.roofY, 0], materials.carPaint, `${type} aligned painted roof cap`);
  const windshield = box(group, [0.055, spec.glassH, spec.width * 0.86], [spec.frontX, spec.glassY, 0], materials.glass, `${type} front windshield`);
  windshield.rotation.z = type === "truck" ? 0.12 : 0.18;
  const rearGlass = box(group, [0.055, spec.glassH * 0.98, spec.width * 0.84], [spec.rearX, spec.glassY - 0.01, 0], materials.glass, `${type} rear glass`);
  rearGlass.rotation.z = type === "truck" ? -0.08 : -0.16;
  box(group, [spec.roofL * 0.94, 0.045, spec.width + 0.02], [spec.roofX, spec.roofY - 0.1, 0], materials.carPaint, `${type} painted upper window surround`);
  addWindowStructure(group, materials, spec, type);
}

function addWindowStructure(group, materials, spec, type) {
  const sideZ = spec.width / 2 + 0.018;
  const pillarH = type === "truck" ? 0.46 : type === "suv" ? 0.5 : 0.42;
  const pillarY = spec.glassY + 0.01;
  const frameLength = Math.abs(spec.aX - spec.cX) + 0.2;
  const frameCenterX = (spec.aX + spec.cX) / 2;
  const lowerY = spec.glassY - pillarH / 2 + 0.06;
  [1, -1].forEach((side) => {
    const z = side * sideZ;
    const aPillar = box(group, [0.1, pillarH, 0.07], [spec.aX, pillarY, z], materials.carPaint, `${type} ${side > 0 ? "right" : "left"} painted A-pillar`);
    aPillar.rotation.z = type === "truck" ? 0.12 : 0.18;
    box(group, [0.1, pillarH * 0.96, 0.07], [spec.bX, pillarY - 0.02, z], materials.carPaint, `${type} ${side > 0 ? "right" : "left"} painted B-pillar`);
    const cPillar = box(group, [0.12, pillarH, 0.07], [spec.cX, pillarY - 0.02, z], materials.carPaint, `${type} ${side > 0 ? "right" : "left"} painted rear pillar`);
    cPillar.rotation.z = type === "truck" ? -0.08 : -0.16;
    box(group, [frameLength, 0.075, 0.075], [frameCenterX, spec.roofY - 0.1, z], materials.carPaint, `${type} ${side > 0 ? "right" : "left"} painted upper window rail`);
    box(group, [frameLength, 0.08, 0.075], [frameCenterX, lowerY, z], materials.carPaint, `${type} ${side > 0 ? "right" : "left"} painted beltline window panel`);
    box(group, [0.018, pillarH * 0.72, 0.01], [spec.bX, pillarY - 0.02, side * (sideZ + 0.038)], materials.black, `${type} ${side > 0 ? "right" : "left"} thin B-pillar shadow gap`);
  });
  box(group, [0.12, 0.1, spec.width + 0.06], [spec.frontX + 0.02, lowerY, 0], materials.carPaint, `${type} painted windshield cowl panel`);
  box(group, [0.12, 0.1, spec.width + 0.06], [spec.rearX - 0.02, lowerY, 0], materials.carPaint, `${type} painted rear glass surround`);
}

function addPaintWitness(group, materials, type) {
  const length = type === "truck" ? 2.52 : type === "suv" ? 2.38 : 2.24;
  const width = type === "sedan" ? 0.9 : 1.0;
  box(group, [length, 0.012, width], [0, 0.18, 0], materials.carPaint, `${type} painted base coat sheen`);
}

function addInterior(group, materials, type, cabinX, width) {
  box(group, [0.72, 0.035, width * 0.72], [cabinX, 0.5, 0], materials.black, `${type} wiring harness`);
  box(group, [0.42, 0.12, width * 0.58], [cabinX + 0.28, 0.64, 0], materials.black, `${type} dashboard module`);
  box(group, [0.28, 0.22, 0.24], [cabinX - 0.16, 0.55, width * 0.18], materials.black, `${type} right front seat`);
  box(group, [0.28, 0.22, 0.24], [cabinX - 0.16, 0.55, -width * 0.18], materials.black, `${type} left front seat`);
  box(group, [0.38, 0.18, width * 0.52], [cabinX - 0.58, 0.53, 0], materials.black, `${type} rear seat`);
}

function addVariantChassis(group, materials, type) {
  const frontX = type === "truck" ? 0.98 : 0.78;
  const rearX = type === "truck" ? -0.82 : type === "suv" ? -0.74 : -0.72;
  const width = type === "sedan" ? 0.88 : 0.98;
  box(group, [0.48, 0.15, 0.42], [frontX, 0.34, 0], materials.darkSteel, `${type} powertrain module`);
  [-0.14, 0.02, 0.18].forEach((z) => cyl(group, 0.04, 0.38, [frontX, 0.45, z], materials.steel, `${type} motor casing rib`, 18).rotation.z = Math.PI / 2);
  box(group, [0.58, 0.08, 0.58], [0.02, 0.28, 0], materials.black, `${type} battery tray`);
  [rearX, frontX].forEach((x) => {
    box(group, [0.08, 0.08, width], [x, 0.2, 0], materials.steel, `${type} axle beam`);
    [-1, 1].forEach((side) => box(group, [0.18, 0.16, 0.08], [x, 0.24, side * width / 2], materials.darkSteel, `${type} suspension knuckle`));
  });
}

function addVariantFinalFit(group, materials, type) {
  const spec = type === "truck"
    ? { length: 2.55, width: 0.98, front: 1.3, rear: -1.24, wheels: [-0.82, 0.82], beltY: 0.62 }
    : type === "suv"
      ? { length: 2.38, width: 0.98, front: 1.2, rear: -1.18, wheels: [-0.74, 0.74], beltY: 0.64 }
      : { length: 2.32, width: 0.88, front: 1.18, rear: -1.16, wheels: [-0.72, 0.72], beltY: 0.55 };
  spec.wheels.forEach((x) => {
    [-1, 1].forEach((side) => {
      const wheel = cyl(group, 0.18, 0.12, [x, 0.22, side * spec.width / 2], materials.tire, `${type} final wheel`, 32);
      wheel.rotation.x = Math.PI / 2;
      cyl(group, 0.075, 0.13, [x, 0.22, side * spec.width / 2], materials.steel, `${type} torqued wheel hub`, 24).rotation.x = Math.PI / 2;
    });
  });
  box(group, [0.1, 0.1, spec.width * 0.72], [spec.front, 0.38, 0], materials.black, `${type} grille`);
  box(group, [0.22, 0.12, spec.width * 0.92], [spec.front - 0.08, 0.35, 0], materials.carPaint, `${type} front bumper`);
  box(group, [0.18, 0.12, spec.width * 0.92], [spec.rear + 0.08, 0.35, 0], materials.carPaint, `${type} rear bumper`);
  addLights(group, materials, spec.front + 0.03, spec.rear - 0.03, spec.width);
  addBeltLineAndHandles(group, materials, spec.length, spec.width, spec.beltY);
}

function addQualityMarkers(group, materials, type) {
  const width = type === "sedan" ? 0.9 : 1.0;
  const length = type === "truck" ? 2.55 : type === "suv" ? 2.38 : 2.32;
  const gate = new THREE.Group();
  group.add(gate);
  box(gate, [0.06, 1.55, 0.06], [-length / 2, 0.84, width / 2 + 0.18], materials.green, `${type} QA left scanner post`);
  box(gate, [0.06, 1.55, 0.06], [length / 2, 0.84, width / 2 + 0.18], materials.green, `${type} QA right scanner post`);
  box(gate, [length + 0.12, 0.04, 0.04], [0, 1.58, width / 2 + 0.18], materials.green, `${type} QA scanner rail`);
}

function addLights(group, materials, frontX, rearX, width) {
  box(group, [0.05, 0.07, 0.18], [frontX, 0.42, width * 0.24], materials.glass, "right headlamp");
  box(group, [0.05, 0.07, 0.18], [frontX, 0.42, -width * 0.24], materials.glass, "left headlamp");
  box(group, [0.05, 0.08, 0.16], [rearX, 0.42, width * 0.27], materials.red, "right tail lamp");
  box(group, [0.05, 0.08, 0.16], [rearX, 0.42, -width * 0.27], materials.red, "left tail lamp");
}

function addBeltLineAndHandles(group, materials, length, width, y) {
  box(group, [length * 0.72, 0.018, width + 0.04], [0, y, 0], materials.black, "body belt line");
  box(group, [0.1, 0.04, 0.04], [0.16, y + 0.03, width / 2 + 0.03], materials.black, "right door handle");
  box(group, [0.1, 0.04, 0.04], [0.16, y + 0.03, -width / 2 - 0.03], materials.black, "left door handle");
}

function addPillars(group, materials, xs, height, z) {
  xs.forEach((x) => {
    box(group, [0.055, height, 0.055], [x, 0.48 + height / 5, z], materials.primer, "right BIW pillar").userData.removeBeforeInspection = true;
    box(group, [0.055, height, 0.055], [x, 0.48 + height / 5, -z], materials.primer, "left BIW pillar").userData.removeBeforeInspection = true;
  });
}

function collectPaintables(stages) {
  const paintables = [];
  stages.slice(0, 4).forEach((stageGroup) => {
    stageGroup.traverse((node) => {
      if (node.isMesh && node.material?.color && node.material.color.getHexString() !== "15191f") paintables.push(node);
    });
  });
  return paintables;
}

function addSideGlass(group, materials, points, depth, name) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.lineTo(points[0][0], points[0][1]);
  [-1, 1].forEach((side) => {
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape), materials.glass);
    glass.name = name;
    glass.position.z = side * depth / 2;
    glass.rotation.y = side > 0 ? 0 : Math.PI;
    group.add(glass);
  });
}

function makePartsRacks(materials) {
  const racks = new THREE.Group();
  racks.name = "line-side part racks";
  [
    [-5.7, "stamped panels"],
    [-1.7, "closure carts"],
    [2.2, "trim modules"],
    [4.1, "chassis modules"],
    [6.0, "wheel and fascia carts"],
  ].forEach(([x, name]) => {
    const rack = new THREE.Group();
    rack.position.set(x, 0.16, 1.55);
    rack.name = name;
    box(rack, [1.1, 0.08, 0.7], [0, 0, 0], materials.darkSteel, `${name} rack base`);
    box(rack, [1.1, 0.05, 0.05], [0, 0.68, -0.32], materials.steel, `${name} rear rail`);
    box(rack, [1.1, 0.05, 0.05], [0, 0.68, 0.32], materials.steel, `${name} front rail`);
    [-0.48, 0.48].forEach((px) => [-0.3, 0.3].forEach((pz) => box(rack, [0.04, 0.7, 0.04], [px, 0.35, pz], materials.steel, `${name} upright`)));
    box(rack, [0.72, 0.035, 0.44], [-0.08, 0.32, 0], materials.primer, `${name} loose part stack`);
    racks.add(rack);
  });
  return racks;
}

function makePaintBooth(materials) {
  const booth = new THREE.Group();
  box(booth, [1.92, 0.06, 0.06], [0, 1.72, -2.05], materials.steel, "paint booth top rail");
  box(booth, [1.92, 0.06, 0.06], [0, 1.72, 1.18], materials.steel, "paint booth top rail");
  box(booth, [0.05, 1.7, 3.25], [-0.96, 0.86, -0.43], materials.glass, "paint booth side");
  box(booth, [0.05, 1.7, 3.25], [0.96, 0.86, -0.43], materials.glass, "paint booth side");
  return booth;
}

function makeTextLabel(group, text, materials, position) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#101215";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#eef2f4";
  ctx.font = "bold 34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.23),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  label.position.set(...position);
  label.rotation.y = Math.PI;
  group.add(label);
}

function makeBodyTypeLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(10, 14, 18, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#8bd3ff";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#eef8ff";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 82);
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.34),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  label.userData.texture = texture;
  return label;
}

export function updateBodyTypeLabel(label, text) {
  const texture = label.userData.texture;
  const canvas = texture.image;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 14, 18, 0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#8bd3ff";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = "#eef8ff";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 256, 82);
  texture.needsUpdate = true;
}

export function makeSafetyZone(materials, x) {
  const zone = new THREE.Group();
  const slow = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.7, 96), materials.zone);
  slow.rotation.x = -Math.PI / 2;
  slow.position.set(x, 0.065, 0.25);
  const stop = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.92, 96), materials.stopZone);
  stop.rotation.x = -Math.PI / 2;
  stop.position.set(x, 0.07, 0.25);
  zone.add(slow, stop);
  zone.userData = { slow, stop };
  return zone;
}

export function makeSparks(materials) {
  const group = new THREE.Group();
  for (let i = 0; i < 14; i += 1) {
    const spark = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.26), materials.spark);
    spark.position.set(Math.random() * 0.5 - 0.25, Math.random() * 0.38, Math.random() * 0.36 - 0.18);
    spark.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    group.add(spark);
  }
  group.visible = false;
  return group;
}
