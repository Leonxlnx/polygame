import { biomeAt, openingCoveCenterX, openingCoveExitX, OPENING_COVE_EXIT_Z, OPENING_COVE_SPAWN_Z, OPENING_PATH_START_Z, pathCenterX, pathWidthAt, valueNoise, WORLD_SIZE } from "./worldMap";

export type WorldPropKind =
  | "pine"
  | "oak"
  | "birch"
  | "willow"
  | "rock"
  | "boulder"
  | "ore"
  | "crystal"
  | "bush"
  | "fern"
  | "reed"
  | "mushroom"
  | "log"
  | "stump"
  | "marker"
  | "flower"
  | "house"
  | "farm"
  | "workbench"
  | "chest"
  | "well"
  | "campfire"
  | "ruin"
  | "shrine"
  | "pillar"
  | "runestone"
  | "totem"
  | "bridge"
  | "dock"
  | "campTent"
  | "fence"
  | "barrel"
  | "crate"
  | "haystack"
  | "torch";

export type WorldProp = {
  kind: WorldPropKind;
  x: number;
  z: number;
  radius: number;
  scale: number;
  rotation: number;
  variant: number;
  collides: boolean;
};

export type WorldCollider = {
  type: "circle";
  x: number;
  z: number;
  radius: number;
  propId?: string;
} | {
  type: "capsule";
  x: number;
  z: number;
  radius: number;
  halfLength: number;
  rotation: number;
  propId?: string;
};

const OPENING_ROUTE_START_Z = OPENING_PATH_START_Z - 0.8;
const OPENING_ROUTE_END_Z = -7;

export const worldProps: WorldProp[] = createWorldProps();

export const worldColliders: WorldCollider[] = worldProps.flatMap((prop, index) => createCollidersForProp(prop, `${prop.kind}-${index}`));

function createWorldProps(): WorldProp[] {
  const props: WorldProp[] = [];

  addCuratedProps(props);
  addCoveStartProps(props);
  addVillageProps(props);
  addVillageDetailProps(props);
  addBiomeStructureProps(props);
  addBiomeLandmarks(props);
  addFlowerClusters(props);
  addBiomeClusters(props);
  addWildlandProps(props);

  for (let cluster = 0; cluster < 17; cluster += 1) {
    const z = -88 + cluster * 10.2 + (valueNoise(cluster, 3) - 0.5) * 5;
    const side = cluster % 2 === 0 ? 1 : -1;
    const x = pathCenterX(z) + side * (pathWidthAt(z) * 0.5 + 7.5 + valueNoise(cluster, 5) * 12.5);
    const treeKind = biomeAt(x, z) === "meadow" ? "oak" : "pine";
    addCluster(props, treeKind, x, z, cluster * 100, 3 + Math.floor(valueNoise(cluster, 7) * 3), 2.7, 0.92, 1.62);
    addCluster(props, "bush", x + side * 2.4, z + 1.4, cluster * 100 + 20, 2, 1.45, 0.58, 0.92);
  }

  for (let cluster = 0; cluster < 18; cluster += 1) {
    const z = -74 + cluster * 7.1 + (valueNoise(cluster, 41) - 0.5) * 3.4;
    const side = cluster % 3 === 0 ? -1 : 1;
    const x = pathCenterX(z) + side * (pathWidthAt(z) * 0.5 + 2.2 + valueNoise(cluster, 43) * 4.8);
    addCluster(props, "rock", x, z, cluster * 120 + 500, 3 + Math.floor(valueNoise(cluster, 47) * 3), 1.05, 0.42, 1.04);
    if (cluster % 4 === 1) {
      addCluster(props, "ore", x + side * 1.8, z - 1.2, cluster * 120 + 820, 1 + Math.floor(valueNoise(cluster, 49) * 2), 0.9, 0.72, 1.1);
    }
  }

  for (let cluster = 0; cluster < 9; cluster += 1) {
    const z = -70 + cluster * 17.5 + (valueNoise(cluster, 71) - 0.5) * 4.8;
    const side = cluster % 2 === 0 ? -1 : 1;
    const x = pathCenterX(z) + side * (pathWidthAt(z) * 0.5 + 5.2 + valueNoise(cluster, 73) * 7.2);
    addCluster(props, cluster % 2 === 0 ? "log" : "stump", x, z, cluster * 140 + 900, 2 + Math.floor(valueNoise(cluster, 79) * 2), 1.35, 0.68, 1.12);
  }

  for (let i = 0; i < 46; i += 1) {
    const z = -96 + valueNoise(i * 31, 7) * 192;
    const side = valueNoise(i * 17, 11) > 0.5 ? 1 : -1;
    const distance = pathWidthAt(z) * 0.5 + 6.2 + valueNoise(i * 29, 13) * 18;
    const x = pathCenterX(z) + side * distance + (valueNoise(i * 37, 19) - 0.5) * 2.4;
    const roll = valueNoise(i * 41, 23);

    if (Math.hypot(x, z) < 6.5) continue;

    if (roll < 0.68) {
      props.push(makeProp(roll < 0.34 ? "oak" : "pine", x, z, i, 0.88 + valueNoise(i, 3) * 0.62));
    } else if (roll < 0.92) {
      props.push(makeProp("bush", x, z, i, 0.62 + valueNoise(i, 7) * 0.48));
    } else {
      props.push(makeProp("stump", x, z, i, 0.66 + valueNoise(i, 15) * 0.28));
    }
  }

  return props.filter((prop) => !shouldCullFromOpeningRoute(prop));
}

function addWildlandProps(props: WorldProp[]): void {
  const half = WORLD_SIZE / 2;
  const clusterCount = 88;

  for (let cluster = 0; cluster < clusterCount; cluster += 1) {
    const z = -half + 42 + valueNoise(cluster * 17, 1401) * (WORLD_SIZE - 84);
    const side = valueNoise(cluster, 1407) > 0.5 ? 1 : -1;
    const edge = pathWidthAt(z) * 0.5;
    const distance = edge + 10 + valueNoise(cluster, 1411) * 56;
    const centerX = pathCenterX(z) + side * distance + (valueNoise(cluster, 1417) - 0.5) * 12;
    const biome = biomeAt(centerX, z);

    if (Math.abs(centerX) > half - 18 || Math.abs(z) > half - 18) continue;
    if (Math.hypot(centerX - pathCenterX(z), z - OPENING_PATH_START_Z) < 28) continue;

    if (biome === "pineForest") {
      addCluster(props, "pine", centerX, z, cluster * 310 + 15100, 3, 4.6, 1.0, 1.72);
      addCluster(props, "fern", centerX + side * 2.2, z + 1.4, cluster * 310 + 15200, 5, 2.8, 0.7, 1.18);
      continue;
    }

    if (biome === "highland") {
      addCluster(props, "boulder", centerX, z, cluster * 310 + 15300, 2, 3.8, 0.86, 1.52);
      addCluster(props, "rock", centerX - side * 2.6, z - 1.1, cluster * 310 + 15400, 4, 2.4, 0.48, 1.04);
      if (cluster % 5 === 0) addCluster(props, "crystal", centerX + side * 2.3, z + 1.8, cluster * 310 + 15500, 2, 1.2, 0.68, 1.06);
      continue;
    }

    if (biome === "wetland") {
      addCluster(props, "reed", centerX, z, cluster * 310 + 15600, 8, 3.4, 0.7, 1.22);
      if (cluster % 4 === 0) addCluster(props, "willow", centerX - side * 2.8, z + 1.6, cluster * 310 + 15700, 1, 0.8, 0.96, 1.36);
      continue;
    }

    addCluster(props, cluster % 3 === 0 ? "birch" : "oak", centerX, z, cluster * 310 + 15800, 2 + Math.floor(valueNoise(cluster, 15801) * 3), 4.2, 0.82, 1.44);
    addCluster(props, "flower", centerX + side * 1.8, z - 0.8, cluster * 310 + 15900, 4, 1.4, 0.72, 1.12);
  }
}

function shouldCullFromOpeningRoute(prop: WorldProp): boolean {
  if (prop.z < OPENING_ROUTE_START_Z || prop.z > OPENING_ROUTE_END_Z) return false;

  const pathHalfWidth = pathWidthAt(prop.z) * 0.5;
  const distanceFromCenter = Math.abs(prop.x - pathCenterX(prop.z));

  if (!prop.collides && (prop.kind === "marker" || prop.kind === "torch" || prop.kind === "fence")) {
    return false;
  }

  if (isOpeningBlockingKind(prop.kind)) {
    return distanceFromCenter < pathHalfWidth + 4.2 + prop.radius * 0.45;
  }

  if (prop.kind === "flower" || prop.kind === "bush" || prop.kind === "fern") {
    return distanceFromCenter < pathHalfWidth + 0.25;
  }

  return false;
}

function isOpeningBlockingKind(kind: WorldPropKind): boolean {
  switch (kind) {
    case "pine":
    case "oak":
    case "birch":
    case "willow":
    case "rock":
    case "boulder":
    case "ore":
    case "crystal":
    case "log":
    case "stump":
    case "marker":
    case "house":
    case "workbench":
    case "chest":
    case "well":
    case "campfire":
    case "ruin":
    case "shrine":
    case "pillar":
    case "runestone":
    case "totem":
    case "campTent":
    case "fence":
    case "barrel":
    case "crate":
    case "haystack":
    case "torch":
      return true;
    case "farm":
    case "bridge":
    case "dock":
    case "bush":
    case "fern":
    case "reed":
    case "mushroom":
    case "flower":
      return false;
  }
}

function addBiomeStructureProps(props: WorldProp[]): void {
  [
    { kind: "bridge" as const, x: -78.2, z: 57.8, scale: 1.18, rotation: 1.18, collides: false },
    { kind: "dock" as const, x: -93.2, z: 89.4, scale: 1.04, rotation: -0.34, collides: false },
    { kind: "runestone" as const, x: 72.4, z: 54.1, scale: 1.08, rotation: -0.12, collides: true },
    { kind: "runestone" as const, x: 84.8, z: 66.2, scale: 0.82, rotation: 0.74, collides: true },
    { kind: "totem" as const, x: -25.2, z: -94.6, scale: 1.0, rotation: 0.3, collides: true },
  ].forEach((prop, index) => {
    props.push({
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: radiusForKind(prop.kind) * prop.scale,
      scale: prop.scale,
      rotation: prop.rotation,
      variant: index % 4,
      collides: prop.collides,
    });
  });
}

function addBiomeClusters(props: WorldProp[]): void {
  const half = WORLD_SIZE / 2;

  for (let cluster = 0; cluster < 20; cluster += 1) {
    const z = -half + 18 + cluster * 5.7 + (valueNoise(cluster, 301) - 0.5) * 6;
    const x = -38 + valueNoise(cluster, 307) * 58 + (valueNoise(cluster, 311) - 0.5) * 5;
    if (biomeAt(x, z) !== "pineForest") continue;
    addCluster(props, "pine", x, z, cluster * 180 + 7100, 4 + Math.floor(valueNoise(cluster, 313) * 4), 3.3, 1.04, 1.74);
    addCluster(props, "fern", x + 1.2, z - 1.4, cluster * 180 + 7300, 4, 2.1, 0.72, 1.16);
    if (cluster % 3 === 0) {
      addCluster(props, "mushroom", x - 1.7, z + 1.1, cluster * 180 + 7500, 5, 1.2, 0.72, 1.08);
    }
  }

  for (let cluster = 0; cluster < 16; cluster += 1) {
    const x = 52 + valueNoise(cluster, 401) * 86;
    const z = -128 + cluster * 16.4 + (valueNoise(cluster, 409) - 0.5) * 10;
    if (biomeAt(x, z) !== "highland") continue;
    addCluster(props, "boulder", x, z, cluster * 210 + 8100, 2 + Math.floor(valueNoise(cluster, 419) * 3), 2.8, 0.88, 1.46);
    addCluster(props, "rock", x - 2.0, z + 1.3, cluster * 210 + 8300, 3, 2.1, 0.58, 1.0);
    if (cluster % 4 === 2) {
      addCluster(props, "crystal", x + 2.4, z - 0.6, cluster * 210 + 8500, 2, 1.2, 0.82, 1.18);
    }
  }

  for (let cluster = 0; cluster < 15; cluster += 1) {
    const x = -130 + valueNoise(cluster, 501) * 84;
    const z = 38 + valueNoise(cluster, 503) * 104;
    if (biomeAt(x, z) !== "wetland") continue;
    addCluster(props, "reed", x, z, cluster * 190 + 9100, 7 + Math.floor(valueNoise(cluster, 509) * 5), 2.6, 0.76, 1.22);
    if (cluster % 4 === 0) {
      addCluster(props, "willow", x + 2.8, z - 1.7, cluster * 190 + 9300, 1, 0.5, 1.06, 1.38);
    }
  }

  for (let cluster = 0; cluster < 12; cluster += 1) {
    const z = -22 + cluster * 12.6 + (valueNoise(cluster, 601) - 0.5) * 5;
    const side = cluster % 2 === 0 ? -1 : 1;
    const x = pathCenterX(z) + side * (pathWidthAt(z) * 0.5 + 8 + valueNoise(cluster, 607) * 11);
    if (biomeAt(x, z) === "wetland" || biomeAt(x, z) === "highland") continue;
    addCluster(props, cluster % 3 === 0 ? "birch" : "oak", x, z, cluster * 170 + 10100, 2 + Math.floor(valueNoise(cluster, 613) * 3), 3.0, 0.9, 1.38);
    addCluster(props, "flower", x + side * 1.9, z + 0.8, cluster * 170 + 10300, 5, 1.5, 0.78, 1.16);
  }
}

function addBiomeLandmarks(props: WorldProp[]): void {
  [
    { kind: "shrine" as const, x: 72, z: 58, scale: 1.12, rotation: -0.4 },
    { kind: "pillar" as const, x: 82, z: 62, scale: 0.9, rotation: 0.2 },
    { kind: "pillar" as const, x: 66, z: 64, scale: 0.72, rotation: -0.8 },
    { kind: "boulder" as const, x: 96, z: -28, scale: 1.48, rotation: 0.4 },
    { kind: "willow" as const, x: -86, z: 76, scale: 1.34, rotation: -0.2 },
    { kind: "willow" as const, x: -104, z: 104, scale: 1.16, rotation: 0.6 },
    { kind: "crystal" as const, x: 118, z: 118, scale: 1.2, rotation: 0.1 },
    { kind: "marker" as const, x: -42, z: 34, scale: 0.86, rotation: -0.25 },
    { kind: "chest" as const, x: -39.4, z: 35.6, scale: 0.82, rotation: 0.45 },
  ].forEach((prop, index) => {
    props.push({
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: radiusForKind(prop.kind) * prop.scale,
      scale: prop.scale,
      rotation: prop.rotation,
      variant: index % 4,
      collides: prop.kind !== "crystal",
    });
  });

  addCluster(props, "reed", -92, 94, 12100, 18, 6.2, 0.86, 1.42);
  addCluster(props, "reed", -78, 58, 12200, 14, 5.4, 0.82, 1.34);
  addCluster(props, "willow", -95, 99, 12300, 2, 4.6, 1.08, 1.32);
  addCluster(props, "boulder", 86, 62, 12400, 5, 5.2, 0.82, 1.36);
  addCluster(props, "crystal", 91, 58, 12500, 4, 2.4, 0.76, 1.1);
  addCluster(props, "pillar", 78, 63, 12600, 4, 4.0, 0.7, 1.08);
  addCluster(props, "fern", -18, -92, 12700, 18, 7.0, 0.78, 1.24);
  addCluster(props, "mushroom", -22, -88, 12800, 12, 4.8, 0.74, 1.08);
}

function addVillageDetailProps(props: WorldProp[]): void {
  const detailProps = [
    { kind: "fence" as const, x: -9.6, z: 0.8, scale: 0.9, rotation: 1.2 },
    { kind: "fence" as const, x: -4.9, z: 1.0, scale: 0.74, rotation: 1.38 },
    { kind: "barrel" as const, x: -7.4, z: 1.8, scale: 0.66, rotation: -0.4 },
    { kind: "crate" as const, x: -7.9, z: 2.7, scale: 0.72, rotation: 0.32 },
    { kind: "crate" as const, x: -5.9, z: 2.9, scale: 0.58, rotation: -0.2 },
    { kind: "marker" as const, x: -3.8, z: -0.8, scale: 0.7, rotation: -0.52 },
    { kind: "torch" as const, x: -6.0, z: 1.1, scale: 0.86, rotation: 0.15 },
    { kind: "haystack" as const, x: -10.6, z: -1.2, scale: 0.72, rotation: 0.6 },
    { kind: "flower" as const, x: -3.5, z: -3.2, scale: 1.12, rotation: 0.8 },
    { kind: "flower" as const, x: -3.1, z: -2.6, scale: 0.96, rotation: -0.3 },
    { kind: "bush" as const, x: -10.8, z: 1.4, scale: 0.72, rotation: 0.1 },
  ];

  detailProps.forEach((prop, index) => {
    props.push({
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: radiusForKind(prop.kind) * prop.scale,
      scale: prop.scale,
      rotation: prop.rotation,
      variant: index % 4,
      collides: prop.kind !== "flower" && prop.kind !== "bush" && prop.kind !== "torch",
    });
  });
}

function addCluster(
  props: WorldProp[],
  kind: WorldPropKind,
  centerX: number,
  centerZ: number,
  seed: number,
  count: number,
  spread: number,
  minScale: number,
  maxScale: number,
): void {
  for (let i = 0; i < count; i += 1) {
    const angle = valueNoise(seed + i, 1) * Math.PI * 2;
    const radius = Math.sqrt(valueNoise(seed + i, 2)) * spread;
    const x = centerX + Math.cos(angle) * radius;
    const z = centerZ + Math.sin(angle) * radius;
    const scale = minScale + valueNoise(seed + i, 3) * (maxScale - minScale);

    props.push(makeProp(kind, x, z, seed + i, scale));
  }
}

function addVillageProps(props: WorldProp[]): void {
  const village = [
    { kind: "workbench" as const, x: -6.9, z: 2.2, scale: 0.84, rotation: -0.44 },
    { kind: "log" as const, x: -7.9, z: -2.8, scale: 0.92, rotation: 1.16 },
    { kind: "log" as const, x: -6.8, z: -4.7, scale: 0.82, rotation: -0.52 },
    { kind: "log" as const, x: -5.2, z: -5.9, scale: 0.78, rotation: 0.84 },
    { kind: "stump" as const, x: -8.8, z: -4.2, scale: 0.78, rotation: 0.34 },
    { kind: "stump" as const, x: -4.2, z: -6.6, scale: 0.7, rotation: -0.14 },
    { kind: "rock" as const, x: -0.9, z: -7.2, scale: 0.68, rotation: -0.2 },
    { kind: "rock" as const, x: 1.3, z: -8.6, scale: 0.74, rotation: 0.5 },
    { kind: "rock" as const, x: 3.2, z: -7.4, scale: 0.64, rotation: 0.12 },
    { kind: "boulder" as const, x: -10.4, z: 3.8, scale: 1.66, rotation: -0.2 },
    { kind: "boulder" as const, x: -8.2, z: 5.6, scale: 1.34, rotation: 0.4 },
    { kind: "boulder" as const, x: -5.6, z: 6.8, scale: 1.58, rotation: -0.5 },
    { kind: "boulder" as const, x: -3.2, z: 7.5, scale: 1.22, rotation: 0.18 },
    { kind: "pine" as const, x: -11.3, z: -3.8, scale: 1.18, rotation: 0.2 },
    { kind: "oak" as const, x: 6.8, z: -6.5, scale: 1.02, rotation: -0.3 },
    { kind: "bush" as const, x: -9.7, z: -1.4, scale: 0.84, rotation: 0.6 },
    { kind: "flower" as const, x: -2.4, z: -3.1, scale: 1.0, rotation: 0.1 },
    { kind: "flower" as const, x: -1.7, z: -3.6, scale: 0.9, rotation: 1.2 },
    { kind: "flower" as const, x: 3.7, z: -2.8, scale: 0.96, rotation: 0.7 },
  ];

  village.forEach((prop, index) => {
    props.push({
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: radiusForKind(prop.kind) * prop.scale,
      scale: prop.scale,
      rotation: prop.rotation,
      variant: index % 4,
      collides: prop.kind !== "flower" && prop.kind !== "bush",
    });
  });
}

function addCoveStartProps(props: WorldProp[]): void {
  const coveProps = [
    ...openingOffRoadCoveProps(),
    ...openingRearWallProps(),
    ...openingSideProps(),
    ...openingCoveLandmarkProps(),
    ...openingFlowerProps(),
  ];

  coveProps.forEach((prop, index) => {
    props.push({
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: radiusForKind(prop.kind) * prop.scale,
      scale: prop.scale,
      rotation: prop.rotation,
      variant: index % 4,
      collides: prop.collides,
    });
  });
}

function openingOffRoadCoveProps(): Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> {
  const cx = openingCoveCenterX();
  const cz = OPENING_COVE_SPAWN_Z;
  const exitX = openingCoveExitX();
  const exitZ = OPENING_COVE_EXIT_Z;

  return [
    { kind: "boulder", x: cx - 4.8, z: cz - 1.9, scale: 1.32, rotation: -0.4, collides: true },
    { kind: "boulder", x: cx - 3.4, z: cz - 4.0, scale: 1.12, rotation: 0.25, collides: true },
    { kind: "pine", x: cx - 6.2, z: cz + 0.8, scale: 1.22, rotation: 0.2, collides: true },
    { kind: "pine", x: cx - 5.3, z: cz + 3.8, scale: 1.1, rotation: -0.16, collides: true },
    { kind: "rock", x: cx + 0.2, z: cz - 3.8, scale: 0.72, rotation: 0.7, collides: true },
    { kind: "stump", x: cx - 2.9, z: cz + 2.3, scale: 0.58, rotation: 0.1, collides: true },
    { kind: "log", x: cx + 2.7, z: cz - 1.8, scale: 0.78, rotation: 1.25, collides: true },
    { kind: "flower", x: cx + 1.7, z: cz + 1.45, scale: 1.08, rotation: 0.8, collides: false },
    { kind: "flower", x: cx + 0.9, z: cz + 1.95, scale: 0.94, rotation: -0.5, collides: false },
    { kind: "torch", x: exitX - 1.4, z: exitZ - 1.1, scale: 0.88, rotation: 0.2, collides: false },
    { kind: "marker", x: exitX + 1.5, z: exitZ + 0.1, scale: 0.66, rotation: -0.6, collides: false },
  ];
}

function openingCoveLandmarkProps(): Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> {
  const rows = [
    { z: -24.2, side: -1 as const, kind: "torch" as const, offset: 2.85, scale: 0.92, rotation: 0.18, collides: false },
    { z: -23.4, side: 1 as const, kind: "marker" as const, offset: 2.95, scale: 0.7, rotation: -0.58, collides: false },
    { z: -20.8, side: -1 as const, kind: "fence" as const, offset: 3.45, scale: 0.72, rotation: 1.18, collides: false },
    { z: -19.6, side: 1 as const, kind: "rock" as const, offset: 3.7, scale: 0.64, rotation: 0.36, collides: true },
    { z: -15.1, side: -1 as const, kind: "stump" as const, offset: 4.65, scale: 0.68, rotation: -0.1, collides: true },
    { z: -14.5, side: 1 as const, kind: "log" as const, offset: 4.2, scale: 0.72, rotation: 0.92, collides: true },
  ];

  return rows.map((row) => {
    const edge = pathWidthAt(row.z) * 0.5;
    return {
      kind: row.kind,
      x: pathCenterX(row.z) + row.side * (edge + row.offset),
      z: row.z,
      scale: row.scale,
      rotation: row.rotation,
      collides: row.collides,
    };
  });
}

function openingRearWallProps(): Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> {
  const leftZ = OPENING_PATH_START_Z - 2.0;
  const rightZ = OPENING_PATH_START_Z - 1.45;
  const leftEdge = pathCenterX(leftZ) - pathWidthAt(leftZ) * 0.5;
  const rightEdge = pathCenterX(rightZ) + pathWidthAt(rightZ) * 0.5;

  return [
    { kind: "boulder", x: leftEdge - 4.4, z: leftZ + 0.45, scale: 1.72, rotation: -0.25, collides: true },
    { kind: "boulder", x: leftEdge - 2.35, z: leftZ - 0.2, scale: 1.42, rotation: 0.36, collides: true },
    { kind: "pine", x: leftEdge - 6.1, z: leftZ + 1.25, scale: 1.18, rotation: 0.62, collides: true },
    { kind: "boulder", x: rightEdge + 2.7, z: rightZ + 0.2, scale: 1.62, rotation: -0.58, collides: true },
    { kind: "boulder", x: rightEdge + 4.8, z: rightZ - 0.55, scale: 1.28, rotation: 0.2, collides: true },
    { kind: "pine", x: rightEdge + 6.5, z: rightZ + 0.75, scale: 1.28, rotation: -0.38, collides: true },
  ];
}

function openingSideProps(): Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> {
  const rows = [
    { z: -39.4, side: -1 as const, kind: "boulder" as const, offset: 5.5, scale: 1.46, rotation: 0.24 },
    { z: -38.1, side: 1 as const, kind: "rock" as const, offset: 5.35, scale: 0.9, rotation: -0.52 },
    { z: -35.6, side: -1 as const, kind: "pine" as const, offset: 6.8, scale: 1.34, rotation: 0.12 },
    { z: -34.4, side: 1 as const, kind: "boulder" as const, offset: 5.8, scale: 1.18, rotation: -0.18 },
    { z: -31.2, side: -1 as const, kind: "rock" as const, offset: 5.1, scale: 0.82, rotation: 0.48 },
    { z: -29.9, side: 1 as const, kind: "oak" as const, offset: 6.65, scale: 1.06, rotation: -0.34 },
    { z: -27.5, side: -1 as const, kind: "oak" as const, offset: 6.9, scale: 0.98, rotation: 0.72 },
    { z: -25.7, side: 1 as const, kind: "rock" as const, offset: 5.4, scale: 0.76, rotation: -0.08 },
    { z: -22.4, side: -1 as const, kind: "bush" as const, offset: 2.1, scale: 0.76, rotation: 0.3, collides: false },
    { z: -21.2, side: 1 as const, kind: "pine" as const, offset: 7.1, scale: 1.18, rotation: -0.46 },
    { z: -18.4, side: -1 as const, kind: "rock" as const, offset: 5.6, scale: 0.86, rotation: -0.58 },
    { z: -16.2, side: 1 as const, kind: "marker" as const, offset: 2.85, scale: 0.66, rotation: 0.78 },
    { z: -13.7, side: -1 as const, kind: "pine" as const, offset: 6.8, scale: 1.12, rotation: 0.18 },
    { z: -11.9, side: 1 as const, kind: "bush" as const, offset: 2.45, scale: 0.68, rotation: -0.2, collides: false },
  ];

  return rows.map((row, index) => {
    const edge = pathWidthAt(row.z) * 0.5;
    const x = pathCenterX(row.z) + row.side * (edge + row.offset + (valueNoise(index + 41, 1701) - 0.5) * 0.42);
    const z = row.z + (valueNoise(index + 83, 1709) - 0.5) * 0.46;

    return {
      kind: row.kind,
      x,
      z,
      scale: row.scale,
      rotation: row.rotation,
      collides: row.collides ?? true,
    };
  });
}

function openingFlowerProps(): Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> {
  const clusters = [
    { z: -33.1, side: 1 as const, offset: 1.5, seed: 1810 },
    { z: -24.6, side: -1 as const, offset: 1.25, seed: 1840 },
    { z: -17.2, side: 1 as const, offset: 1.35, seed: 1870 },
  ];
  const props: Array<{ kind: WorldPropKind; x: number; z: number; scale: number; rotation: number; collides: boolean }> = [];

  clusters.forEach((cluster) => {
    const edge = pathWidthAt(cluster.z) * 0.5;
    const baseX = pathCenterX(cluster.z) + cluster.side * (edge + cluster.offset);

    for (let index = 0; index < 4; index += 1) {
      const angle = valueNoise(cluster.seed + index, 1901) * Math.PI * 2;
      const radius = 0.22 + valueNoise(cluster.seed + index, 1907) * 0.58;
      props.push({
        kind: "flower",
        x: baseX + Math.cos(angle) * radius,
        z: cluster.z + Math.sin(angle) * radius,
        scale: 0.96 + valueNoise(cluster.seed + index, 1913) * 0.32,
        rotation: valueNoise(cluster.seed + index, 1919) * Math.PI,
        collides: false,
      });
    }
  });

  return props;
}

function addCuratedProps(props: WorldProp[]): void {
  const anchors = [
    { z: -24, side: 1, kind: "pine" as const, distance: 8.2, scale: 1.5 },
    { z: -20, side: -1, kind: "rock" as const, distance: 6.4, scale: 1.05 },
    { z: -16, side: 1, kind: "bush" as const, distance: 5.8, scale: 0.82 },
    { z: -12, side: -1, kind: "pine" as const, distance: 7.4, scale: 1.26 },
    { z: 12, side: 1, kind: "oak" as const, distance: 8.4, scale: 1.08 },
    { z: 17, side: -1, kind: "bush" as const, distance: 6.6, scale: 0.78 },
    { z: 22, side: 1, kind: "rock" as const, distance: 6.2, scale: 0.84 },
    { z: 29, side: -1, kind: "pine" as const, distance: 9.2, scale: 1.44 },
  ];

  anchors.forEach((anchor, index) => {
    const x = pathCenterX(anchor.z) + anchor.side * (pathWidthAt(anchor.z) * 0.5 + anchor.distance);
    props.push(makeProp(anchor.kind, x, anchor.z, index + 900, anchor.scale));
  });
}

function addFlowerClusters(props: WorldProp[]): void {
  const curated = [
    { z: -10.5, side: 1, distance: 1.55, seed: 5100 },
    { z: -3.2, side: -1, distance: 1.25, seed: 5200 },
    { z: 6.8, side: 1, distance: 1.85, seed: 5300 },
    { z: 15.4, side: -1, distance: 1.6, seed: 5400 },
  ];

  curated.forEach((cluster) => {
    const centerX = pathCenterX(cluster.z) + cluster.side * (pathWidthAt(cluster.z) * 0.5 + cluster.distance);
    addCluster(props, "flower", centerX, cluster.z, cluster.seed, 5, 0.68, 0.86, 1.24);
  });

  for (let cluster = 0; cluster < 18; cluster += 1) {
    const z = -92 + cluster * 10.2 + (valueNoise(cluster, 211) - 0.5) * 2.4;
    const side = valueNoise(cluster, 223) > 0.5 ? 1 : -1;
    const distance = pathWidthAt(z) * 0.5 + 0.8 + valueNoise(cluster, 227) * 3.2;
    const centerX = pathCenterX(z) + side * distance;
    const count = 4 + Math.floor(valueNoise(cluster, 229) * 4);

    addCluster(props, "flower", centerX, z, cluster * 80 + 6000, count, 0.55 + valueNoise(cluster, 233) * 0.62, 0.82, 1.28);
  }
}

function makeProp(kind: WorldPropKind, x: number, z: number, seed: number, scale: number): WorldProp {
  return {
    kind,
    x,
    z,
    radius: radiusForKind(kind) * scale,
    scale,
    rotation: valueNoise(seed, 31) * Math.PI * 2,
    variant: Math.floor(valueNoise(seed, 37) * 4),
    collides: kind !== "bush" && kind !== "flower",
  };
}

function radiusForKind(kind: WorldPropKind): number {
  const baseRadius = {
    pine: 0.58,
    oak: 0.64,
    birch: 0.48,
    willow: 0.72,
    rock: 0.48,
    boulder: 0.82,
    ore: 0.5,
    crystal: 0.34,
    bush: 0.34,
    fern: 0.18,
    reed: 0.12,
    mushroom: 0.1,
    log: 0.62,
    stump: 0.38,
    marker: 0.44,
    flower: 0.08,
    house: 1.35,
    farm: 0.62,
    workbench: 0.5,
    chest: 0.42,
    well: 0.62,
    campfire: 0.38,
    ruin: 0.66,
    shrine: 0.88,
    pillar: 0.36,
    runestone: 0.44,
    totem: 0.28,
    bridge: 1.2,
    dock: 0.92,
    campTent: 0.72,
    fence: 0.72,
    barrel: 0.32,
    crate: 0.34,
    haystack: 0.46,
    torch: 0.18,
  } satisfies Record<WorldPropKind, number>;

  return baseRadius[kind];
}

function createCollidersForProp(prop: WorldProp, propId: string): WorldCollider[] {
  if (!prop.collides) return [];

  return createRawCollidersForProp(prop).map((collider) => ({ ...collider, propId }));
}

function createRawCollidersForProp(prop: WorldProp): WorldCollider[] {
  switch (prop.kind) {
    case "pine":
      return [makeCircleCollider(prop, 0.28)];
    case "oak":
      return [makeCircleCollider(prop, 0.32)];
    case "birch":
      return [makeCircleCollider(prop, 0.28)];
    case "willow":
      return [makeCircleCollider(prop, 0.44)];
    case "rock":
      return [makeCircleCollider(prop, 0.4)];
    case "boulder":
      return [makeCircleCollider(prop, 0.68)];
    case "ore":
      return [makeCircleCollider(prop, 0.42)];
    case "crystal":
      return [makeCircleCollider(prop, 0.26)];
    case "log":
      return [{
        type: "capsule",
        x: prop.x,
        z: prop.z,
        radius: 0.17 * prop.scale,
        halfLength: 0.48 * prop.scale,
        rotation: prop.rotation,
      }];
    case "stump":
      return [makeCircleCollider(prop, 0.25)];
    case "marker":
      return [makeCircleCollider(prop, 0.24)];
    case "house":
      return [makeCircleCollider(prop, 1.05)];
    case "workbench":
      return [makeCircleCollider(prop, 0.42)];
    case "chest":
      return [makeCircleCollider(prop, 0.32)];
    case "well":
      return [makeCircleCollider(prop, 0.5)];
    case "ruin":
      return [makeCircleCollider(prop, 0.52)];
    case "shrine":
      return [makeCircleCollider(prop, 0.68)];
    case "pillar":
      return [makeCircleCollider(prop, 0.28)];
    case "runestone":
      return [makeCircleCollider(prop, 0.34)];
    case "totem":
      return [makeCircleCollider(prop, 0.22)];
    case "campTent":
      return [makeCircleCollider(prop, 0.58)];
    case "bridge":
    case "dock":
      return [];
    case "fence":
      return [{
        type: "capsule",
        x: prop.x,
        z: prop.z,
        radius: 0.14 * prop.scale,
        halfLength: 0.62 * prop.scale,
        rotation: prop.rotation,
      }];
    case "barrel":
      return [makeCircleCollider(prop, 0.26)];
    case "crate":
      return [makeCircleCollider(prop, 0.28)];
    case "haystack":
      return [makeCircleCollider(prop, 0.34)];
    case "farm":
    case "campfire":
    case "torch":
    case "flower":
    case "fern":
    case "reed":
    case "mushroom":
      return [];
    case "bush":
      return [];
  }
}

function makeCircleCollider(prop: WorldProp, radius: number): WorldCollider {
  return {
    type: "circle",
    x: prop.x,
    z: prop.z,
    radius: radius * prop.scale,
  };
}
