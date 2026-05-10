import * as THREE from "three";
import {
  biomeAt,
  fbm,
  openingCoveCenterX,
  openingCoveExitX,
  OPENING_COVE_EXIT_Z,
  OPENING_COVE_SPAWN_Z,
  OPENING_PATH_START_Z,
  pathCenterX,
  pathWidthAt,
  smoothNoise,
  terrainHeight,
  valueNoise,
  WORLD_SIZE,
  type BiomeId,
} from "../../game/content/worldMap";
import { worldProps } from "../../game/content/worldProps";
import { createWorldPropObjects } from "./createWorldPropObjects";

type TileWorld = {
  root: THREE.Group;
  setHiddenPropIds: (hiddenPropIds: ReadonlySet<string>) => void;
  dispose: () => void;
};

type Point = {
  x: number;
  y: number;
  z: number;
};

type WaterPatchSpec = {
  x: number;
  z: number;
  rx: number;
  rz: number;
  rotation: number;
  seed: number;
};

type BranchPathSpec = {
  startZ: number;
  endX: number;
  endZ: number;
  width: number;
  bend: number;
  seed: number;
};

const grassPalettes: Record<BiomeId, string[]> = {
  village: ["#5a7241", "#627c48", "#6c8650", "#748d58", "#536c3c", "#67804a"],
  meadow: ["#5f7a43", "#68844a", "#719052", "#78985a", "#58733d", "#6b864d"],
  pineForest: ["#3e5b33", "#456438", "#4b6c3d", "#527343", "#39552f", "#48683b"],
  highland: ["#687657", "#717e5f", "#7b8769", "#616f51", "#848b6d", "#6c7858"],
  wetland: ["#4e6c55", "#57775e", "#5f8267", "#637e5e", "#496650", "#657f68"],
};
const pathPalette = ["#9f8b62", "#ad996d", "#b7a577", "#c2af80", "#d1be8a", "#a99468"];
const waterPatches: WaterPatchSpec[] = [
  { x: -78, z: 58, rx: 6.9, rz: 3.6, rotation: -0.35, seed: 11 },
  { x: -96, z: 94, rx: 8.2, rz: 4.0, rotation: 0.22, seed: 23 },
  { x: -58, z: 124, rx: 7.2, rz: 3.8, rotation: 0.58, seed: 37 },
  { x: -118, z: 142, rx: 5.4, rz: 2.8, rotation: -0.62, seed: 41 },
];
const branchPaths: BranchPathSpec[] = [
  { startZ: 30, endX: -82, endZ: 72, width: 2.95, bend: -10.5, seed: 301 },
  { startZ: 45, endX: 76, endZ: 60, width: 2.85, bend: 8.8, seed: 401 },
];

export function createTileWorld(worldSize = WORLD_SIZE): TileWorld {
  const root = new THREE.Group();
  root.name = "LowPolyWorld";

  const base = createBaseGround(worldSize);
  const grass = createGrassFloor(worldSize);
  const openingGrass = createOpeningGrassDetail();
  const biomeDetails = createBiomeGroundDetails(worldSize);
  const path = createPathMosaic(worldSize);
  const covePath = createOpeningCovePathMosaic();
  const branches = createBranchPathMosaics();
  const edgeBlend = createPathEdgeBlend(worldSize);
  const terraces = createVoxelTerraces();
  const shorelines = createWaterShorelines();
  const water = createWaterPatches();
  let props = createWorldPropObjects(worldProps);
  let hiddenSignature = "";

  root.add(base.mesh, grass.mesh, openingGrass.mesh, biomeDetails.mesh, path.mesh, covePath.mesh, branches.mesh, edgeBlend.mesh, terraces.root, shorelines.mesh, water.root, props.root);

  return {
    root,
    setHiddenPropIds: (hiddenPropIds) => {
      const nextSignature = Array.from(hiddenPropIds).sort().join("|");
      if (nextSignature === hiddenSignature) return;

      hiddenSignature = nextSignature;
      root.remove(props.root);
      props.dispose();
      props = createWorldPropObjects(worldProps.filter((prop, index) => !hiddenPropIds.has(propId(prop, index))));
      root.add(props.root);
    },
    dispose: () => {
      base.dispose();
      grass.dispose();
      openingGrass.dispose();
      biomeDetails.dispose();
      path.dispose();
      covePath.dispose();
      branches.dispose();
      edgeBlend.dispose();
      terraces.dispose();
      shorelines.dispose();
      water.dispose();
      props.dispose();
    },
  };
}

function createVoxelTerraces(): { root: THREE.Group; dispose: () => void } {
  const root = new THREE.Group();
  root.name = "VoxelTerrainTerraces";

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const grassMaterial = new THREE.MeshStandardMaterial({ color: "#5f7a43", roughness: 0.98, flatShading: true });
  const dirtMaterial = new THREE.MeshStandardMaterial({ color: "#826642", roughness: 0.98, flatShading: true });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#7c7e70", roughness: 0.96, flatShading: true });
  const sandMaterial = new THREE.MeshStandardMaterial({ color: "#c3ae77", roughness: 0.96, flatShading: true });
  const maxPerLayer = 280;
  const grass = new THREE.InstancedMesh(geometry, grassMaterial, maxPerLayer);
  const dirt = new THREE.InstancedMesh(geometry, dirtMaterial, maxPerLayer);
  const stone = new THREE.InstancedMesh(geometry, stoneMaterial, maxPerLayer);
  const sand = new THREE.InstancedMesh(geometry, sandMaterial, maxPerLayer);
  const layers = [grass, dirt, stone, sand];
  const counts = new Map<THREE.InstancedMesh, number>(layers.map((mesh) => [mesh, 0]));

  layers.forEach((mesh) => {
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });

  for (let step = 0; step < 66; step += 1) {
    const z = OPENING_PATH_START_Z - 2 + step * 2.9;
    if (z > 144) break;

    ([-1, 1] as const).forEach((side) => {
      const roll = valueNoise(step * 37, side * 101);
      if (roll < 0.42 && z > -24) return;

      const edge = pathWidthAt(z) * 0.5;
      const blockDepth = 0.38 + valueNoise(step * 41, side * 113) * 0.82;
      const blockLength = 0.82 + valueNoise(step * 43, side * 127) * 1.62;
      const x = pathCenterX(z) + side * (edge + 0.62 + blockDepth * 0.5 + (valueNoise(step * 47, side * 131) - 0.5) * 0.42);
      const y = terrainHeight(x, z) + 0.066 + valueNoise(step * 53, side * 137) * 0.035;
      const rotation = (valueNoise(step * 59, side * 139) - 0.5) * 0.44;
      const biome = biomeAt(x, z);
      const height = biome === "highland" ? 0.18 : biome === "pineForest" ? 0.14 : 0.11;
      const primary = biome === "highland" || (z < OPENING_PATH_START_Z + 5 && roll > 0.58) ? stone : grass;
      addTerraceInstance(primary, counts, x, y + height * 0.5, z, blockLength, height, blockDepth, rotation);

      if (roll > 0.62) {
        const insetX = x + side * (0.12 + blockDepth * 0.16);
        addTerraceInstance(dirt, counts, insetX, y - 0.015, z + 0.12, blockLength * 0.66, 0.075, Math.max(0.24, blockDepth * 0.38), rotation + side * 0.08);
      }

      if (roll > 0.78 && Math.abs(z) < 70) {
        const lipX = pathCenterX(z) + side * (edge - 0.18);
        addTerraceInstance(sand, counts, lipX, terrainHeight(lipX, z) + 0.112, z + side * 0.03, blockLength * 0.38, 0.032, 0.24, rotation);
      }
    });
  }

  for (let block = 0; block < 18; block += 1) {
    const side = block % 2 === 0 ? -1 : 1;
    const z = OPENING_PATH_START_Z - 4.2 + Math.floor(block / 2) * 0.92;
    const edge = pathWidthAt(z) * 0.5;
    const x = pathCenterX(z) + side * (edge + 3.4 + valueNoise(block, 1701) * 1.5);
    const scale = 0.88 + valueNoise(block, 1707) * 0.86;
    addTerraceInstance(stone, counts, x, terrainHeight(x, z) + 0.12 * scale, z, 0.92 * scale, 0.24 * scale, 0.74 * scale, valueNoise(block, 1711) * Math.PI);
  }

  layers.forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  });

  return {
    root,
    dispose: () => {
      geometry.dispose();
      grassMaterial.dispose();
      dirtMaterial.dispose();
      stoneMaterial.dispose();
      sandMaterial.dispose();
    },
  };
}

function addTerraceInstance(
  mesh: THREE.InstancedMesh,
  counts: Map<THREE.InstancedMesh, number>,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  rotation: number,
): void {
  const index = counts.get(mesh) ?? 0;
  if (index >= mesh.instanceMatrix.count) return;

  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0)),
    new THREE.Vector3(width, height, depth),
  );
  mesh.setMatrixAt(index, matrix);
  counts.set(mesh, index + 1);
  mesh.count = index + 1;
}

function propId(prop: { kind: string }, index: number): string {
  return `${prop.kind}-${index}`;
}

function createBaseGround(size: number): { mesh: THREE.Mesh; dispose: () => void } {
  const geometry = new THREE.PlaneGeometry(size * 4, size * 4);
  const material = new THREE.MeshStandardMaterial({
    color: "#5f843d",
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "BaseGround";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.22;
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createGrassFloor(size: number): { mesh: THREE.Mesh; dispose: () => void } {
  const cellSize = size > 900 ? 4.45 : 0.58;
  const half = size / 2;
  const columns = Math.ceil(size / cellSize);
  const rows = Math.ceil(size / cellSize);
  const positions: number[] = [];
  const colors: number[] = [];

  for (let gx = 0; gx < columns; gx += 1) {
    for (let gz = 0; gz < rows; gz += 1) {
      const x0 = -half + gx * cellSize;
      const z0 = -half + gz * cellSize;
      const x1 = x0 + cellSize;
      const z1 = z0 + cellSize;

      const a = makeJitteredPoint(x0, z0, gx, gz);
      const b = makeJitteredPoint(x1, z0, gx + 1, gz);
      const c = makeJitteredPoint(x1, z1, gx + 1, gz + 1);
      const d = makeJitteredPoint(x0, z1, gx, gz + 1);
      const splitForward = valueNoise(gx, gz) > 0.5;

      if (splitForward) {
        addGrassTriangle(positions, colors, a, b, c);
        addGrassTriangle(positions, colors, a, c, d);
      } else {
        addGrassTriangle(positions, colors, a, b, d);
        addGrassTriangle(positions, colors, b, c, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "IrregularLowPolyGrass";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createOpeningGrassDetail(): { mesh: THREE.Mesh; dispose: () => void } {
  const minX = -72;
  const maxX = 72;
  const minZ = OPENING_PATH_START_Z - 46;
  const maxZ = 118;
  const cellSize = 0.82;
  const columns = Math.ceil((maxX - minX) / cellSize);
  const rows = Math.ceil((maxZ - minZ) / cellSize);
  const positions: number[] = [];
  const colors: number[] = [];

  for (let gx = 0; gx < columns; gx += 1) {
    for (let gz = 0; gz < rows; gz += 1) {
      const x0 = minX + gx * cellSize;
      const z0 = minZ + gz * cellSize;
      const x1 = Math.min(maxX, x0 + cellSize);
      const z1 = Math.min(maxZ, z0 + cellSize);
      const centerX = (x0 + x1) * 0.5;
      const centerZ = (z0 + z1) * 0.5;
      const pathDistance = Math.abs(centerX - pathCenterX(centerZ));

      if (pathDistance < pathWidthAt(centerZ) * 0.62) continue;

      const worldGX = Math.floor((x0 + WORLD_SIZE * 0.5) / cellSize);
      const worldGZ = Math.floor((z0 + WORLD_SIZE * 0.5) / cellSize);
      const a = makeOpeningGrassPoint(x0, z0, worldGX, worldGZ);
      const b = makeOpeningGrassPoint(x1, z0, worldGX + 1, worldGZ);
      const c = makeOpeningGrassPoint(x1, z1, worldGX + 1, worldGZ + 1);
      const d = makeOpeningGrassPoint(x0, z1, worldGX, worldGZ + 1);

      if (valueNoise(worldGX, worldGZ) > 0.5) {
        addGrassTriangle(positions, colors, a, b, c);
        addGrassTriangle(positions, colors, a, c, d);
      } else {
        addGrassTriangle(positions, colors, a, b, d);
        addGrassTriangle(positions, colors, b, c, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -0.35,
    polygonOffsetUnits: -0.35,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "OpeningGrassDetail";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createBiomeGroundDetails(size: number): { mesh: THREE.Mesh; dispose: () => void } {
  const half = size / 2;
  const positions: number[] = [];
  const colors: number[] = [];
  const detailCount = size > 900 ? 520 : 150;

  for (let index = 0; index < detailCount; index += 1) {
    const x = -half + valueNoise(index * 17, 701) * size;
    const z = -half + valueNoise(index * 19, 709) * size;
    const biome = biomeAt(x, z);
    const pathDistance = Math.abs(x - pathCenterX(z));
    if (pathDistance < pathWidthAt(z) * 0.7) continue;

    if (biome === "highland") {
      addGroundPatch(
        positions,
        colors,
        x,
        z,
        1.4 + valueNoise(index, 719) * 2.8,
        0.5 + valueNoise(index, 727) * 1.2,
        valueNoise(index, 733) * Math.PI,
        ["#7f8564", "#687653", "#8a8a6b"],
        0.094,
        index,
      );
    } else if (biome === "pineForest" && index % 2 === 0) {
      addGroundPatch(
        positions,
        colors,
        x,
        z,
        1.1 + valueNoise(index, 739) * 1.9,
        0.46 + valueNoise(index, 743) * 0.86,
        valueNoise(index, 751) * Math.PI,
        ["#3d5634", "#47633b", "#526d40"],
        0.092,
        index,
      );
    } else if (biome === "wetland" && index % 3 !== 0) {
      addGroundPatch(
        positions,
        colors,
        x,
        z,
        0.9 + valueNoise(index, 757) * 1.8,
        0.44 + valueNoise(index, 761) * 0.9,
        valueNoise(index, 769) * Math.PI,
        ["#5b755a", "#657e61", "#706f55"],
        0.093,
        index,
      );
    } else if (biome === "meadow" && index % 4 === 1) {
      addGroundPatch(
        positions,
        colors,
        x,
        z,
        0.8 + valueNoise(index, 773) * 1.5,
        0.4 + valueNoise(index, 787) * 0.8,
        valueNoise(index, 797) * Math.PI,
        ["#789257", "#6c884c", "#839b61"],
        0.091,
        index,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -0.5,
    polygonOffsetUnits: -0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "BiomeGroundDetailPatches";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createPathMosaic(size: number): { mesh: THREE.Mesh; dispose: () => void } {
  const half = size / 2;
  const step = 0.5;
  const rows = Math.ceil(size / step);
  const columns = 10;
  const points: Point[][] = [];
  const positions: number[] = [];
  const colors: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    points[row] = [];
    const rowBaseZ = -half + row * step;
    const rowJitter = row === 0 || row === rows ? 0 : (smoothNoise(row * 0.31, 311) - 0.5) * 0.08;
    const z = rowBaseZ + rowJitter;
    const leftEdge = pathEdgeX(z, row, -1);
    const rightEdge = pathEdgeX(z, row, 1);

    for (let column = 0; column <= columns; column += 1) {
      const edge = column === 0 || column === columns;
      const baseU = column / columns;
      const uJitter = edge ? 0 : (valueNoise(row * 53, column * 97) - 0.5) * 0.045;
      const u = THREE.MathUtils.clamp(baseU + uJitter, 0.035, 0.965);
      const x = THREE.MathUtils.lerp(leftEdge, rightEdge, u);

      points[row][column] = {
        x,
        y: terrainHeight(x, z) + 0.086,
        z,
      };
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const midZ = (points[row][0].z + points[row + 1][0].z) * 0.5;
    if (midZ < OPENING_PATH_START_Z) continue;

    for (let column = 0; column < columns; column += 1) {
      const a = points[row][column];
      const b = points[row + 1][column];
      const c = points[row + 1][column + 1];
      const d = points[row][column + 1];
      const seed = row * 9973 + column * 7919;
      const type = valueNoise(seed, 43);

      if (type < 0.62) {
        addPathQuad(positions, colors, a, b, c, d, seed);
      } else if (type < 0.82) {
        addPathTriangle(positions, colors, a, b, c, seed);
        addPathTriangle(positions, colors, a, c, d, seed + 1);
      } else if (type < 0.97) {
        addPathTriangle(positions, colors, a, b, d, seed);
        addPathTriangle(positions, colors, b, c, d, seed + 1);
      } else {
        addPathFan(positions, colors, a, b, c, d, seed);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "VillagePathMosaic";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createOpeningCovePathMosaic(): { mesh: THREE.Mesh; dispose: () => void } {
  const positions: number[] = [];
  const colors: number[] = [];
  const coveX = openingCoveCenterX();
  const coveZ = OPENING_COVE_SPAWN_Z;

  addPathPatch(positions, colors, coveX, coveZ, 4.0, 3.0, -0.18, 17001, 15);
  addPathPatch(positions, colors, coveX + 1.5, coveZ + 2.2, 2.4, 1.55, 0.42, 17037, 10);
  addOpeningCoveConnector(positions, colors);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -0.9,
    polygonOffsetUnits: -0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "OpeningCovePathMosaic";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function addOpeningCoveConnector(positions: number[], colors: number[]): void {
  const start = { x: openingCoveCenterX() + 2.2, z: OPENING_COVE_SPAWN_Z + 1.1 };
  const end = { x: openingCoveExitX(), z: OPENING_COVE_EXIT_Z };
  const control = { x: (start.x + end.x) * 0.5 - 1.2, z: (start.z + end.z) * 0.5 + 0.7 };
  const rows = 34;
  const columns = 4;
  const points: Point[][] = [];

  for (let row = 0; row <= rows; row += 1) {
    points[row] = [];
    const t = row / rows;
    const inv = 1 - t;
    const centerX = inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x;
    const centerZ = inv * inv * start.z + 2 * inv * t * control.z + t * t * end.z;
    const nextT = Math.min(1, t + 1 / rows);
    const nextInv = 1 - nextT;
    const nextX = nextInv * nextInv * start.x + 2 * nextInv * nextT * control.x + nextT * nextT * end.x;
    const nextZ = nextInv * nextInv * start.z + 2 * nextInv * nextT * control.z + nextT * nextT * end.z;
    const tangentX = nextX - centerX;
    const tangentZ = nextZ - centerZ;
    const length = Math.hypot(tangentX, tangentZ) || 1;
    const normalX = -tangentZ / length;
    const normalZ = tangentX / length;
    const localWidth = 2.45 + Math.sin(t * Math.PI) * 0.95 + (smoothNoise(row * 0.21, 18.3) - 0.5) * 0.18;

    for (let column = 0; column <= columns; column += 1) {
      const edge = column === 0 || column === columns;
      const u = column / columns - 0.5 + (edge ? 0 : (valueNoise(row * 31, column * 73) - 0.5) * 0.04);
      const ragged = edge ? (valueNoise(row * 43, column * 89) - 0.5) * 0.28 : 0;
      const x = centerX + normalX * (u * localWidth + ragged);
      const z = centerZ + normalZ * (u * localWidth + ragged);
      points[row][column] = {
        x,
        y: terrainHeight(x, z) + 0.112,
        z,
      };
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = points[row][column];
      const b = points[row + 1][column];
      const c = points[row + 1][column + 1];
      const d = points[row][column + 1];
      const seed = 18000 + row * 97 + column * 17;

      if (valueNoise(seed, 31) < 0.66) {
        addPathTriangle(positions, colors, a, b, c, seed);
        addPathTriangle(positions, colors, a, c, d, seed + 1);
      } else {
        addPathFan(positions, colors, a, b, c, d, seed);
      }
    }
  }
}

function addPathPatch(
  positions: number[],
  colors: number[],
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  rotation: number,
  seed: number,
  segments: number,
): void {
  const center: Point = {
    x: centerX,
    y: terrainHeight(centerX, centerZ) + 0.114,
    z: centerZ,
  };
  const points: Point[] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const wobble = 0.78 + valueNoise(seed + index * 11, 701) * 0.34;
    const localX = Math.cos(angle) * radiusX * wobble;
    const localZ = Math.sin(angle) * radiusZ * wobble;
    const x = centerX + localX * cos + localZ * sin;
    const z = centerZ - localX * sin + localZ * cos;
    points.push({ x, y: terrainHeight(x, z) + 0.114, z });
  }

  for (let index = 0; index < points.length; index += 1) {
    addPathTriangle(positions, colors, center, points[index], points[(index + 1) % points.length], seed + index);
  }
}

function createBranchPathMosaics(): { mesh: THREE.Mesh; dispose: () => void } {
  const positions: number[] = [];
  const colors: number[] = [];

  branchPaths.forEach((branch) => {
    const start = { x: pathCenterX(branch.startZ), z: branch.startZ };
    const rows = 66;
    const columns = 4;
    const points: Point[][] = [];

    for (let row = 0; row <= rows; row += 1) {
      points[row] = [];
      const t = row / rows;
      const curve = Math.sin(t * Math.PI);
      const ripple = Math.sin(t * Math.PI * 2 + branch.seed) * 0.7;
      const centerX = THREE.MathUtils.lerp(start.x, branch.endX, t) + curve * branch.bend + ripple;
      const centerZ = THREE.MathUtils.lerp(start.z, branch.endZ, t) + Math.sin(t * Math.PI * 1.5 + branch.seed * 0.01) * 1.2;
      const nextT = Math.min(1, t + 1 / rows);
      const nextCurve = Math.sin(nextT * Math.PI);
      const nextX = THREE.MathUtils.lerp(start.x, branch.endX, nextT) + nextCurve * branch.bend;
      const nextZ = THREE.MathUtils.lerp(start.z, branch.endZ, nextT);
      const tangentX = nextX - centerX;
      const tangentZ = nextZ - centerZ;
      const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
      const normalX = -tangentZ / tangentLength;
      const normalZ = tangentX / tangentLength;
      const localWidth = branch.width * (0.86 + Math.sin(t * Math.PI) * 0.2 + (smoothNoise(row * 0.18, branch.seed) - 0.5) * 0.13);

      for (let column = 0; column <= columns; column += 1) {
        const edge = column === 0 || column === columns;
        const baseU = column / columns - 0.5;
        const u = baseU + (edge ? 0 : (valueNoise(branch.seed + row * 17, column * 31) - 0.5) * 0.06);
        const edgeNoise = edge ? (valueNoise(branch.seed + row * 29, column + 19) - 0.5) * 0.26 : 0;
        const offset = u * localWidth + edgeNoise;
        const x = centerX + normalX * offset;
        const z = centerZ + normalZ * offset;
        points[row][column] = {
          x,
          y: terrainHeight(x, z) + 0.092,
          z,
        };
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const a = points[row][column];
        const b = points[row + 1][column];
        const c = points[row + 1][column + 1];
        const d = points[row][column + 1];
        const seed = branch.seed * 1000 + row * 83 + column * 17;

        if (valueNoise(seed, 31) < 0.72) {
          addPathTriangle(positions, colors, a, b, c, seed);
          addPathTriangle(positions, colors, a, c, d, seed + 1);
        } else {
          addPathFan(positions, colors, a, b, c, d, seed);
        }
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -0.75,
    polygonOffsetUnits: -0.75,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "BranchPathMosaics";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createPathEdgeBlend(size: number): { mesh: THREE.Mesh; dispose: () => void } {
  const half = size / 2;
  const step = 0.68;
  const rows = Math.ceil(size / step);
  const positions: number[] = [];
  const colors: number[] = [];

  for (let row = 2; row < rows - 2; row += 1) {
    const baseZ = -half + row * step;
    if (baseZ < OPENING_PATH_START_Z - 0.2) continue;

    ([-1, 1] as const).forEach((side) => {
      const roll = valueNoise(row * 19, side * 47);
      if (roll < 0.28) return;

      const zCenter = baseZ + (smoothNoise(row * 0.31, side * 11.4) - 0.5) * 0.5;
      const length = 0.44 + valueNoise(row * 29, side * 61) * 1.45;
      const depth = 0.16 + valueNoise(row * 31, side * 73) * 0.64;
      const seed = row * 101 + side * 7;
      const grassIntoPath = roll < 0.73;
      const pathRow = Math.round((zCenter + half) / 0.58);

      if (grassIntoPath) {
        addEdgeBlendQuad(
          positions,
          colors,
          makeTransitionPoint(zCenter - length * 0.5, pathRow, side, 0.1),
          makeTransitionPoint(zCenter + length * 0.5, pathRow, side, 0.1),
          makeTransitionPoint(zCenter + length * (0.06 + valueNoise(seed, 1) * 0.34), pathRow, side, -depth * (0.52 + valueNoise(seed, 2) * 0.42)),
          makeTransitionPoint(zCenter - length * (0.08 + valueNoise(seed, 3) * 0.28), pathRow, side, -depth),
          seed,
          true,
        );
      } else {
        addEdgeBlendQuad(
          positions,
          colors,
          makeTransitionPoint(zCenter - length * 0.42, pathRow, side, -0.08),
          makeTransitionPoint(zCenter + length * 0.42, pathRow, side, -0.14),
          makeTransitionPoint(zCenter + length * (0.06 + valueNoise(seed, 4) * 0.3), pathRow, side, depth * 0.72),
          makeTransitionPoint(zCenter - length * (0.1 + valueNoise(seed, 5) * 0.3), pathRow, side, depth * 0.88),
          seed,
          false,
        );
      }
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "PathEdgePolygonBlend";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createWaterShorelines(): { mesh: THREE.Mesh; dispose: () => void } {
  const positions: number[] = [];
  const colors: number[] = [];

  waterPatches.forEach((patch) => {
    addWaterShoreline(positions, colors, patch);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
    flatShading: true,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "WaterShorelinePolygons";
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function createWaterPatches(): { root: THREE.Group; dispose: () => void } {
  const root = new THREE.Group();
  root.name = "WetlandWaterPatches";
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const colors: number[] = [];

  waterPatches.forEach((patch) => {
    addWaterPatch(positions, colors, patch.x, patch.z, patch.rx, patch.rz, patch.rotation, patch.seed);
  });

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.5,
    metalness: 0,
    flatShading: false,
    transparent: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "WaterPatchMesh";
  mesh.receiveShadow = true;
  root.add(mesh);

  return {
    root,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

function addGroundPatch(
  positions: number[],
  colors: number[],
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  rotation: number,
  palette: string[],
  yOffset: number,
  seed: number,
): void {
  const segments = 5 + Math.floor(valueNoise(seed, 811) * 4);
  const center: Point = {
    x: centerX,
    y: terrainHeight(centerX, centerZ) + yOffset,
    z: centerZ,
  };
  const points: Point[] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const wobble = 0.62 + valueNoise(seed + index * 13, 823) * 0.58;
    const localX = Math.cos(angle) * radiusX * wobble;
    const localZ = Math.sin(angle) * radiusZ * wobble;
    const x = centerX + localX * cos + localZ * sin;
    const z = centerZ - localX * sin + localZ * cos;
    points.push({ x, y: terrainHeight(x, z) + yOffset, z });
  }

  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const color = new THREE.Color(palette[(index + seed) % palette.length]);
    color.lerp(grassColorAt(centerX, centerZ), 0.42);
    color.lerp(new THREE.Color("#6e7d53"), valueNoise(seed, index + 829) * 0.08);
    positions.push(center.x, center.y, center.z, a.x, a.y, a.z, b.x, b.y, b.z);
    pushColor(colors, color, 3);
  }
}

function addWaterShoreline(positions: number[], colors: number[], patch: WaterPatchSpec): void {
  const segments = 24;
  const cos = Math.cos(patch.rotation);
  const sin = Math.sin(patch.rotation);
  const inner: Point[] = [];
  const outer: Point[] = [];

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const innerWobble = 0.94 + valueNoise(patch.seed + index * 23, 883) * 0.12;
    const outerWobble = 1.05 + valueNoise(patch.seed + index * 29, 887) * 0.16;
    const innerLocalX = Math.cos(angle) * patch.rx * innerWobble;
    const innerLocalZ = Math.sin(angle) * patch.rz * innerWobble;
    const outerLocalX = Math.cos(angle) * (patch.rx + 0.72) * outerWobble;
    const outerLocalZ = Math.sin(angle) * (patch.rz + 0.58) * outerWobble;
    const innerX = patch.x + innerLocalX * cos + innerLocalZ * sin;
    const innerZ = patch.z - innerLocalX * sin + innerLocalZ * cos;
    const outerX = patch.x + outerLocalX * cos + outerLocalZ * sin;
    const outerZ = patch.z - outerLocalX * sin + outerLocalZ * cos;

    inner.push({ x: innerX, y: terrainHeight(innerX, innerZ) + 0.112, z: innerZ });
    outer.push({ x: outerX, y: terrainHeight(outerX, outerZ) + 0.109, z: outerZ });
  }

  for (let index = 0; index < segments; index += 1) {
    const a = inner[index];
    const b = inner[(index + 1) % segments];
    const c = outer[(index + 1) % segments];
    const d = outer[index];
    const color = new THREE.Color(index % 3 === 0 ? "#777b5d" : index % 3 === 1 ? "#677d61" : "#6f805f");
    color.lerp(grassColorAt((a.x + d.x) * 0.5, (a.z + d.z) * 0.5), 0.58);

    if (valueNoise(patch.seed + index, 907) > 0.38) {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      pushColor(colors, color, 6);
    } else {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      pushColor(colors, color, 6);
    }
  }
}

function addWaterPatch(
  positions: number[],
  colors: number[],
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  rotation: number,
  seed: number,
): void {
  const segments = 20;
  const center: Point = {
    x: centerX,
    y: terrainHeight(centerX, centerZ) + 0.13,
    z: centerZ,
  };
  const points: Point[] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const wobble = 0.82 + valueNoise(seed + index * 17, seed - index * 13) * 0.32;
    const localX = Math.cos(angle) * radiusX * wobble;
    const localZ = Math.sin(angle) * radiusZ * wobble;
    const x = centerX + localX * cos + localZ * sin;
    const z = centerZ - localX * sin + localZ * cos;
    points.push({ x, y: center.y, z });
  }

  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const color = new THREE.Color("#5d998e");
    color.lerp(new THREE.Color(index % 2 === 0 ? "#568d84" : "#69a397"), 0.04 + valueNoise(seed + index, 97) * 0.05);
    positions.push(center.x, center.y, center.z, a.x, a.y, a.z, b.x, b.y, b.z);
    pushColor(colors, color, 3);
  }

  for (let facet = 0; facet < 12; facet += 1) {
    addWaterFacet(positions, colors, centerX, centerZ, radiusX, radiusZ, rotation, seed + facet * 41);
  }
}

function addWaterFacet(
  positions: number[],
  colors: number[],
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  rotation: number,
  seed: number,
): void {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const angle = valueNoise(seed, 937) * Math.PI * 2;
  const distance = Math.sqrt(valueNoise(seed, 941)) * 0.72;
  const localX = Math.cos(angle) * radiusX * distance;
  const localZ = Math.sin(angle) * radiusZ * distance;
  const x = centerX + localX * cos + localZ * sin;
  const z = centerZ - localX * sin + localZ * cos;
  const sizeX = 0.34 + valueNoise(seed, 947) * 0.78;
  const sizeZ = 0.05 + valueNoise(seed, 953) * 0.12;
  const facetRotation = rotation + (valueNoise(seed, 967) - 0.5) * 1.2;
  const facetCos = Math.cos(facetRotation);
  const facetSin = Math.sin(facetRotation);
  const y = terrainHeight(x, z) + 0.137;
  const offsets = [
    [-sizeX, -sizeZ],
    [sizeX, -sizeZ * 0.5],
    [sizeX * 0.72, sizeZ],
    [-sizeX * 0.82, sizeZ * 0.68],
  ] as const;
  const points = offsets.map(([offsetX, offsetZ]) => ({
    x: x + offsetX * facetCos + offsetZ * facetSin,
    y,
    z: z - offsetX * facetSin + offsetZ * facetCos,
  }));
  const color = new THREE.Color(valueNoise(seed, 971) > 0.5 ? "#76aa9e" : "#4f8b82");
  color.lerp(new THREE.Color("#5d998e"), 0.72);
  positions.push(
    points[0].x,
    points[0].y,
    points[0].z,
    points[1].x,
    points[1].y,
    points[1].z,
    points[2].x,
    points[2].y,
    points[2].z,
    points[0].x,
    points[0].y,
    points[0].z,
    points[2].x,
    points[2].y,
    points[2].z,
    points[3].x,
    points[3].y,
    points[3].z,
  );
  pushColor(colors, color, 6);
}

function addGrassTriangle(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
): void {
  const x = (a.x + b.x + c.x) / 3;
  const z = (a.z + b.z + c.z) / 3;
  const color = grassColorAt(x, z);

  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  pushColor(colors, color, 3);
}

function addEdgeBlendQuad(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  seed: number,
  grassBite: boolean,
): void {
  const center: Point = {
    x: (a.x + b.x + c.x + d.x) * 0.25 + (valueNoise(seed, 97) - 0.5) * 0.06,
    y: (a.y + b.y + c.y + d.y) * 0.25 + 0.004,
    z: (a.z + b.z + c.z + d.z) * 0.25 + (valueNoise(seed, 101) - 0.5) * 0.06,
  };

  addEdgeBlendTriangle(positions, colors, a, b, center, seed, grassBite);
  addEdgeBlendTriangle(positions, colors, b, c, center, seed + 1, grassBite);
  addEdgeBlendTriangle(positions, colors, c, d, center, seed + 2, grassBite);
  addEdgeBlendTriangle(positions, colors, d, a, center, seed + 3, grassBite);
}

function addEdgeBlendTriangle(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  seed: number,
  grassBite: boolean,
): void {
  const x = (a.x + b.x + c.x) / 3;
  const z = (a.z + b.z + c.z) / 3;
  const color = grassBite
    ? grassColorAt(x, z).lerp(pathColor(seed), 0.03 + valueNoise(seed, 109) * 0.04)
    : pathColor(seed).lerp(grassColorAt(x, z), 0.16 + valueNoise(seed, 113) * 0.1);

  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  pushColor(colors, color, 3);
}

function addPathQuad(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  seed: number,
): void {
  const color = pathColor(seed);
  color.lerp(new THREE.Color("#b3a27c"), 0.32);

  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  pushColor(colors, color, 6);
}

function addPathTriangle(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  seed: number,
): void {
  const color = pathColor(seed);
  color.lerp(new THREE.Color("#b3a27c"), 0.32);
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  pushColor(colors, color, 3);
}

function addPathFan(
  positions: number[],
  colors: number[],
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  seed: number,
): void {
  const center: Point = {
    x: (a.x + b.x + c.x + d.x) * 0.25 + (valueNoise(seed, 71) - 0.5) * 0.045,
    y: (a.y + b.y + c.y + d.y) * 0.25 + 0.003,
    z: (a.z + b.z + c.z + d.z) * 0.25 + (valueNoise(seed, 73) - 0.5) * 0.045,
  };

  addPathTriangle(positions, colors, a, b, center, seed);
  addPathTriangle(positions, colors, b, c, center, seed + 1);
  addPathTriangle(positions, colors, c, d, center, seed + 2);
  addPathTriangle(positions, colors, d, a, center, seed + 3);
}

function pathColor(seed: number): THREE.Color {
  const noise = valueNoise(seed * 3 + 17, seed - 29);
  const color = new THREE.Color(pathPalette[Math.floor(noise * pathPalette.length) % pathPalette.length]);
  color.lerp(new THREE.Color("#9d8c67"), valueNoise(seed, 23) * 0.015);
  color.lerp(new THREE.Color("#b6a57d"), 0.42);
  return color;
}

function grassColorAt(x: number, z: number): THREE.Color {
  const localX = Math.floor(x * 1.35);
  const localZ = Math.floor(z * 1.35);
  const localNoise = valueNoise(localX, localZ);
  const microNoise = valueNoise(localX * 7 + 13, localZ * 11 - 5);
  const baseNoise = fbm(x * 0.16, z * 0.16);
  const biome = biomeAt(x, z);
  const palette = grassPalettes[biome];
  const index = Math.floor((localNoise * 0.72 + microNoise * 0.28) * palette.length) % palette.length;
  const color = new THREE.Color(palette[index]);
  const unify = biome === "pineForest" ? "#4b683b" : biome === "wetland" ? "#58735d" : biome === "highland" ? "#747d5d" : "#687f4b";
  color.lerp(new THREE.Color(unify), 0.42);

  if (baseNoise > 0.72) {
    color.lerp(new THREE.Color("#7d925c"), 0.06);
  } else if (baseNoise < 0.24) {
    color.lerp(new THREE.Color("#58723d"), 0.04);
  }

  return color;
}

function edgeDetail(row: number, side: -1 | 1): number {
  const broad = (smoothNoise(row * 0.15, side * 23.1) - 0.5) * 0.74;
  const mid = (smoothNoise(row * 0.43 + side * 3.2, side * 11.7) - 0.5) * 0.28;
  const corner = (valueNoise(row * 11 + side * 97, row * 5 - side * 31) - 0.5) * 0.2;
  return broad + mid + corner;
}

function pathEdgeX(z: number, row: number, side: -1 | 1): number {
  const center = pathCenterX(z);
  const width = pathWidthAt(z);
  const widthNoise = side === -1
    ? smoothNoise(z * 0.22, -17.4)
    : smoothNoise(z * 0.2, 19.8);

  return center + side * width * (0.5 + (widthNoise - 0.5) * 0.12) + edgeDetail(row, side);
}

function makeTransitionPoint(z: number, row: number, side: -1 | 1, offsetFromEdge: number): Point {
  const x = pathEdgeX(z, row, side) + side * offsetFromEdge;
  return {
    x,
    y: terrainHeight(x, z) + 0.116,
    z,
  };
}

function makeJitteredPoint(x: number, z: number, gx: number, gz: number): Point {
  const isEdge = gx === 0 || gz === 0;
  const jitter = isEdge ? 0 : 0.13;
  return makePoint(
    x + (valueNoise(gx, gz) - 0.5) * jitter,
    z + (valueNoise(gx + 97, gz - 31) - 0.5) * jitter,
    0,
  );
}

function makeOpeningGrassPoint(x: number, z: number, gx: number, gz: number): Point {
  const jitter = 0.11;
  return makePoint(
    x + (valueNoise(gx * 3 + 11, gz * 5 - 17) - 0.5) * jitter,
    z + (valueNoise(gx * 7 - 23, gz * 2 + 29) - 0.5) * jitter,
    0.024,
  );
}

function makePoint(x: number, z: number, yOffset: number): Point {
  return {
    x,
    y: terrainHeight(x, z) + yOffset,
    z,
  };
}

function pushColor(colors: number[], color: THREE.Color, vertices: number): void {
  for (let i = 0; i < vertices; i += 1) {
    colors.push(color.r, color.g, color.b);
  }
}
