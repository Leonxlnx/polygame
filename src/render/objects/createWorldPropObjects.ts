import * as THREE from "three";
import type { WorldProp, WorldPropKind } from "../../game/content/worldProps";
import { terrainHeight } from "../../game/content/worldMap";

type PropObjects = {
  root: THREE.Group;
  dispose: () => void;
};

export function createWorldPropObjects(props: WorldProp[]): PropObjects {
  const root = new THREE.Group();
  root.name = "WorldProps";

  const disposables: Array<{ dispose: () => void }> = [];
  const byKind = groupByKind(props);

  addTrees(root, disposables, byKind.pine);
  addOaks(root, disposables, byKind.oak);
  addBirches(root, disposables, byKind.birch);
  addWillows(root, disposables, byKind.willow);
  addRocks(root, disposables, byKind.rock);
  addBoulders(root, disposables, byKind.boulder);
  addOres(root, disposables, byKind.ore);
  addCrystals(root, disposables, byKind.crystal);
  addBushes(root, disposables, byKind.bush);
  addFerns(root, disposables, byKind.fern);
  addReeds(root, disposables, byKind.reed);
  addMushrooms(root, disposables, byKind.mushroom);
  addLogs(root, disposables, byKind.log);
  addStumps(root, disposables, byKind.stump);
  addMarkers(root, disposables, byKind.marker);
  addFlowers(root, disposables, byKind.flower);
  addHouses(root, disposables, byKind.house);
  addFarms(root, disposables, byKind.farm);
  addWorkbenches(root, disposables, byKind.workbench);
  addChests(root, disposables, byKind.chest);
  addWells(root, disposables, byKind.well);
  addCampfires(root, disposables, byKind.campfire);
  addRuins(root, disposables, byKind.ruin);
  addShrines(root, disposables, byKind.shrine);
  addPillars(root, disposables, byKind.pillar);
  addRunestones(root, disposables, byKind.runestone);
  addTotems(root, disposables, byKind.totem);
  addBridges(root, disposables, byKind.bridge);
  addDocks(root, disposables, byKind.dock);
  addCampTents(root, disposables, byKind.campTent);
  addFences(root, disposables, byKind.fence);
  addBarrels(root, disposables, byKind.barrel);
  addCrates(root, disposables, byKind.crate);
  addHaystacks(root, disposables, byKind.haystack);
  addTorches(root, disposables, byKind.torch);

  return {
    root,
    dispose: () => {
      disposables.forEach((item) => {
        item.dispose();
      });
    },
  };
}

function groupByKind(props: WorldProp[]): Record<WorldPropKind, WorldProp[]> {
  return {
    pine: props.filter((prop) => prop.kind === "pine"),
    oak: props.filter((prop) => prop.kind === "oak"),
    birch: props.filter((prop) => prop.kind === "birch"),
    willow: props.filter((prop) => prop.kind === "willow"),
    rock: props.filter((prop) => prop.kind === "rock"),
    boulder: props.filter((prop) => prop.kind === "boulder"),
    ore: props.filter((prop) => prop.kind === "ore"),
    crystal: props.filter((prop) => prop.kind === "crystal"),
    bush: props.filter((prop) => prop.kind === "bush"),
    fern: props.filter((prop) => prop.kind === "fern"),
    reed: props.filter((prop) => prop.kind === "reed"),
    mushroom: props.filter((prop) => prop.kind === "mushroom"),
    log: props.filter((prop) => prop.kind === "log"),
    stump: props.filter((prop) => prop.kind === "stump"),
    marker: props.filter((prop) => prop.kind === "marker"),
    flower: props.filter((prop) => prop.kind === "flower"),
    house: props.filter((prop) => prop.kind === "house"),
    farm: props.filter((prop) => prop.kind === "farm"),
    workbench: props.filter((prop) => prop.kind === "workbench"),
    chest: props.filter((prop) => prop.kind === "chest"),
    well: props.filter((prop) => prop.kind === "well"),
    campfire: props.filter((prop) => prop.kind === "campfire"),
    ruin: props.filter((prop) => prop.kind === "ruin"),
    shrine: props.filter((prop) => prop.kind === "shrine"),
    pillar: props.filter((prop) => prop.kind === "pillar"),
    runestone: props.filter((prop) => prop.kind === "runestone"),
    totem: props.filter((prop) => prop.kind === "totem"),
    bridge: props.filter((prop) => prop.kind === "bridge"),
    dock: props.filter((prop) => prop.kind === "dock"),
    campTent: props.filter((prop) => prop.kind === "campTent"),
    fence: props.filter((prop) => prop.kind === "fence"),
    barrel: props.filter((prop) => prop.kind === "barrel"),
    crate: props.filter((prop) => prop.kind === "crate"),
    haystack: props.filter((prop) => prop.kind === "haystack"),
    torch: props.filter((prop) => prop.kind === "torch"),
  };
}

function addTrees(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.21, 0.34, 1.85, 6);
  const barkBandGeometry = new THREE.CylinderGeometry(0.22, 0.31, 0.045, 6);
  const lowerGeometry = new THREE.ConeGeometry(0.84, 1.08, 6);
  const middleGeometry = new THREE.ConeGeometry(0.72, 1.02, 6);
  const topGeometry = new THREE.ConeGeometry(0.52, 0.88, 6);
  const needleDetailGeometry = new THREE.ConeGeometry(0.22, 0.32, 5);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#5b3420", roughness: 0.92, flatShading: true });
  const barkBandMaterial = new THREE.MeshStandardMaterial({ color: "#3f2519", roughness: 0.98, flatShading: true });
  const lowerMaterial = new THREE.MeshStandardMaterial({ color: "#174f32", roughness: 0.98, flatShading: true });
  const middleMaterial = new THREE.MeshStandardMaterial({ color: "#1e633c", roughness: 0.98, flatShading: true });
  const topMaterial = new THREE.MeshStandardMaterial({ color: "#2d7948", roughness: 0.98, flatShading: true });
  const needleDetailMaterial = new THREE.MeshStandardMaterial({ color: "#2f7043", roughness: 1, flatShading: true });

  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, props.length);
  const barkBands = new THREE.InstancedMesh(barkBandGeometry, barkBandMaterial, props.length * 2);
  const lowers = new THREE.InstancedMesh(lowerGeometry, lowerMaterial, props.length);
  const middles = new THREE.InstancedMesh(middleGeometry, middleMaterial, props.length);
  const tops = new THREE.InstancedMesh(topGeometry, topMaterial, props.length);
  const needles = new THREE.InstancedMesh(needleDetailGeometry, needleDetailMaterial, props.length * 3);
  configureInstancedMesh(trunks);
  configureInstancedMesh(barkBands);
  configureInstancedMesh(lowers);
  configureInstancedMesh(middles);
  configureInstancedMesh(tops);
  configureInstancedMesh(needles);

  props.forEach((prop, index) => {
    setInstance(trunks, index, prop, 0.86, new THREE.Vector3(0.92, 1.06, 0.92));
    setOffsetInstance(barkBands, index * 2, prop, new THREE.Vector3(0, 0.62, 0), new THREE.Vector3(0.96, 1, 0.96));
    setOffsetInstance(barkBands, index * 2 + 1, prop, new THREE.Vector3(0, 1.12, 0), new THREE.Vector3(0.82, 1, 0.82));
    setInstance(lowers, index, prop, 1.62, new THREE.Vector3(1.0, 1.0, 1.0));
    setInstance(middles, index, prop, 2.12, new THREE.Vector3(0.94, 1.0, 0.94));
    setInstance(tops, index, prop, 2.56, new THREE.Vector3(0.88, 1.0, 0.88));
    for (let detail = 0; detail < 3; detail += 1) {
      const angle = detail * Math.PI * 0.72 + prop.variant * 0.31;
      setOffsetInstance(
        needles,
        index * 3 + detail,
        prop,
        new THREE.Vector3(Math.sin(angle) * 0.35, 1.92 + detail * 0.22, Math.cos(angle) * 0.35),
        new THREE.Vector3(0.78 - detail * 0.08, 0.74, 0.78 - detail * 0.08),
      );
    }
  });

  root.add(trunks, barkBands, lowers, middles, tops, needles);
  disposables.push(
    trunkGeometry,
    barkBandGeometry,
    lowerGeometry,
    middleGeometry,
    topGeometry,
    needleDetailGeometry,
    trunkMaterial,
    barkBandMaterial,
    lowerMaterial,
    middleMaterial,
    topMaterial,
    needleDetailMaterial,
  );
}

function addOaks(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.36, 7);
  const crownGeometry = new THREE.IcosahedronGeometry(0.72, 0);
  const lobeGeometry = new THREE.IcosahedronGeometry(0.42, 0);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#654128", roughness: 0.94, flatShading: true });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: "#3f743f", roughness: 1, flatShading: true });
  const shadowCrownMaterial = new THREE.MeshStandardMaterial({ color: "#345f36", roughness: 1, flatShading: true });
  const highlightMaterial = new THREE.MeshStandardMaterial({ color: "#578a48", roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, props.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, props.length);
  const lobes = new THREE.InstancedMesh(lobeGeometry, shadowCrownMaterial, props.length * 3);
  const highlights = new THREE.InstancedMesh(crownGeometry, highlightMaterial, props.length);
  configureInstancedMesh(trunks);
  configureInstancedMesh(crowns);
  configureInstancedMesh(lobes);
  configureInstancedMesh(highlights);

  props.forEach((prop, index) => {
    setInstance(trunks, index, prop, 0.66, new THREE.Vector3(0.9, 1.0, 0.9));
    setInstance(crowns, index, prop, 1.45, new THREE.Vector3(1.16, 0.86, 1.04));
    [
      [-0.36, 1.25, -0.16, 0.92, 0.72, 0.82],
      [0.38, 1.34, 0.12, 0.82, 0.62, 0.78],
      [0.04, 1.18, 0.38, 0.74, 0.56, 0.82],
    ].forEach(([x, y, z, sx, sy, sz], lobe) => {
      setOffsetInstance(lobes, index * 3 + lobe, prop, new THREE.Vector3(x, y, z), new THREE.Vector3(sx, sy, sz));
    });
    setInstance(highlights, index, prop, 1.74, new THREE.Vector3(0.78, 0.5, 0.72));
  });

  root.add(trunks, crowns, lobes, highlights);
  disposables.push(trunkGeometry, crownGeometry, lobeGeometry, trunkMaterial, crownMaterial, shadowCrownMaterial, highlightMaterial);
}

function addBirches(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.13, 0.18, 1.55, 7);
  const bandGeometry = new THREE.CylinderGeometry(0.135, 0.18, 0.045, 7);
  const crownGeometry = new THREE.IcosahedronGeometry(0.58, 0);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#d6d0b8", roughness: 0.92, flatShading: true });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: "#4b4b3e", roughness: 0.96, flatShading: true });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: "#7d9a4c", roughness: 1, flatShading: true });
  const crownLightMaterial = new THREE.MeshStandardMaterial({ color: "#91aa5d", roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, props.length);
  const bands = new THREE.InstancedMesh(bandGeometry, bandMaterial, props.length * 3);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, props.length);
  const lights = new THREE.InstancedMesh(crownGeometry, crownLightMaterial, props.length);
  [trunks, bands, crowns, lights].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(trunks, index, prop, 0.78, new THREE.Vector3(1, 1, 1));
    [0.54, 0.86, 1.16].forEach((height, band) => {
      setOffsetInstance(bands, index * 3 + band, prop, new THREE.Vector3(0, height, 0), new THREE.Vector3(1, 1, 1));
    });
    setOffsetInstance(crowns, index, prop, new THREE.Vector3(0, 1.62, 0), new THREE.Vector3(1.05, 0.82, 0.96));
    setOffsetInstance(lights, index, prop, new THREE.Vector3(0.14, 1.86, -0.08), new THREE.Vector3(0.72, 0.48, 0.66));
  });

  root.add(trunks, bands, crowns, lights);
  disposables.push(trunkGeometry, bandGeometry, crownGeometry, trunkMaterial, bandMaterial, crownMaterial, crownLightMaterial);
}

function addWillows(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.32, 1.32, 7);
  const crownGeometry = new THREE.IcosahedronGeometry(0.82, 0);
  const droopGeometry = new THREE.ConeGeometry(0.18, 0.9, 5);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: "#5a3d28", roughness: 0.95, flatShading: true });
  const crownMaterial = new THREE.MeshStandardMaterial({ color: "#52794a", roughness: 1, flatShading: true });
  const droopMaterial = new THREE.MeshStandardMaterial({ color: "#6d914f", roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, props.length);
  const crowns = new THREE.InstancedMesh(crownGeometry, crownMaterial, props.length);
  const droops = new THREE.InstancedMesh(droopGeometry, droopMaterial, props.length * 5);
  [trunks, crowns, droops].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(trunks, index, prop, 0.66, new THREE.Vector3(0.9, 1.0, 0.9));
    setOffsetInstance(crowns, index, prop, new THREE.Vector3(0, 1.45, 0), new THREE.Vector3(1.16, 0.78, 1.08));
    for (let leaf = 0; leaf < 5; leaf += 1) {
      const angle = leaf * Math.PI * 0.4 + prop.rotation;
      setOffsetInstance(
        droops,
        index * 5 + leaf,
        prop,
        new THREE.Vector3(Math.sin(angle) * 0.42, 1.14 - (leaf % 2) * 0.08, Math.cos(angle) * 0.42),
        new THREE.Vector3(0.7, 1.0, 0.7),
      );
    }
  });

  root.add(trunks, crowns, droops);
  disposables.push(trunkGeometry, crownGeometry, droopGeometry, trunkMaterial, crownMaterial, droopMaterial);
}

function addRocks(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const geometry = new THREE.DodecahedronGeometry(0.48, 0);
  const facetGeometry = new THREE.DodecahedronGeometry(0.17, 0);
  const materials = ["#6c6e62", "#7a796a", "#595f55"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.96, flatShading: true }),
  );
  const highlightMaterial = new THREE.MeshStandardMaterial({ color: "#8c8a79", roughness: 0.96, flatShading: true });
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: "#4d544c", roughness: 0.98, flatShading: true });
  const meshes = materials.map((material) => new THREE.InstancedMesh(geometry, material, props.length));
  const highlights = new THREE.InstancedMesh(facetGeometry, highlightMaterial, props.length);
  const shadows = new THREE.InstancedMesh(facetGeometry, shadowMaterial, props.length);
  meshes.forEach(configureInstancedMesh);
  configureInstancedMesh(highlights);
  configureInstancedMesh(shadows);

  props.forEach((prop, index) => {
    const mesh = meshes[prop.variant % meshes.length];
    setInstance(mesh, mesh.count, prop, 0.2, new THREE.Vector3(1.25, 0.6, 0.92));
    setOffsetInstance(highlights, index, prop, new THREE.Vector3(-0.15, 0.36, 0.1), new THREE.Vector3(0.7, 0.42, 0.5));
    setOffsetInstance(shadows, index, prop, new THREE.Vector3(0.18, 0.16, -0.12), new THREE.Vector3(0.6, 0.34, 0.56));
  });

  meshes.forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  });
  root.add(highlights, shadows);
  disposables.push(geometry, facetGeometry, ...materials, highlightMaterial, shadowMaterial);
}

function addBoulders(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const geometry = new THREE.DodecahedronGeometry(0.62, 0);
  const facetGeometry = new THREE.DodecahedronGeometry(0.24, 0);
  const material = new THREE.MeshStandardMaterial({ color: "#6f7162", roughness: 0.96, flatShading: true });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#555b51", roughness: 0.98, flatShading: true });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#898877", roughness: 0.96, flatShading: true });
  const bases = new THREE.InstancedMesh(geometry, material, props.length);
  const chunks = new THREE.InstancedMesh(geometry, darkMaterial, props.length * 2);
  const facets = new THREE.InstancedMesh(facetGeometry, lightMaterial, props.length * 2);
  configureInstancedMesh(bases);
  configureInstancedMesh(chunks);
  configureInstancedMesh(facets);

  props.forEach((prop, index) => {
    setInstance(bases, index, prop, 0.34, new THREE.Vector3(1.28, 0.68, 0.98));
    setOffsetInstance(chunks, index * 2, prop, new THREE.Vector3(-0.34, 0.22, 0.12), new THREE.Vector3(0.72, 0.46, 0.58));
    setOffsetInstance(chunks, index * 2 + 1, prop, new THREE.Vector3(0.42, 0.27, -0.18), new THREE.Vector3(0.64, 0.5, 0.72));
    setOffsetInstance(facets, index * 2, prop, new THREE.Vector3(-0.08, 0.62, 0.2), new THREE.Vector3(0.92, 0.34, 0.62));
    setOffsetInstance(facets, index * 2 + 1, prop, new THREE.Vector3(0.3, 0.48, -0.24), new THREE.Vector3(0.58, 0.32, 0.74));
  });

  root.add(bases, chunks, facets);
  disposables.push(geometry, facetGeometry, material, darkMaterial, lightMaterial);
}

function addOres(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const rockGeometry = new THREE.DodecahedronGeometry(0.44, 0);
  const shardGeometry = new THREE.ConeGeometry(0.1, 0.42, 5);
  const rockMaterial = new THREE.MeshStandardMaterial({ color: "#65695f", roughness: 0.94, flatShading: true });
  const shardMaterial = new THREE.MeshStandardMaterial({ color: "#8db5b7", roughness: 0.78, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, props.length);
  const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, props.length * 3);
  configureInstancedMesh(rocks);
  configureInstancedMesh(shards);

  props.forEach((prop, index) => {
    setInstance(rocks, index, prop, 0.22, new THREE.Vector3(1.2, 0.66, 0.92));
    for (let shard = 0; shard < 3; shard += 1) {
      const angle = prop.rotation + shard * 2.1;
      const position = new THREE.Vector3(
        prop.x + Math.sin(angle) * 0.16 * prop.scale,
        terrainHeight(prop.x, prop.z) + (0.38 + shard * 0.02) * prop.scale,
        prop.z + Math.cos(angle) * 0.16 * prop.scale,
      );
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, angle, shard % 2 === 0 ? 0.24 : -0.18));
      const scale = new THREE.Vector3(prop.scale, prop.scale, prop.scale);
      const shardIndex = index * 3 + shard;
      shards.setMatrixAt(shardIndex, new THREE.Matrix4().compose(position, rotation, scale));
      shards.count = Math.max(shards.count, shardIndex + 1);
    }
  });

  shards.instanceMatrix.needsUpdate = true;
  root.add(rocks, shards);
  disposables.push(rockGeometry, shardGeometry, rockMaterial, shardMaterial);
}

function addCrystals(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const baseGeometry = new THREE.DodecahedronGeometry(0.28, 0);
  const crystalGeometry = new THREE.ConeGeometry(0.14, 0.66, 5);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: "#5f665e", roughness: 0.94, flatShading: true });
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: "#6ec0c3", roughness: 0.62, emissive: "#1d5f66", emissiveIntensity: 0.18, flatShading: true });
  const bases = new THREE.InstancedMesh(baseGeometry, baseMaterial, props.length);
  const crystals = new THREE.InstancedMesh(crystalGeometry, crystalMaterial, props.length * 2);
  configureInstancedMesh(bases);
  configureInstancedMesh(crystals);

  props.forEach((prop, index) => {
    setInstance(bases, index, prop, 0.16, new THREE.Vector3(1.0, 0.45, 1.0));
    setOffsetInstance(crystals, index * 2, prop, new THREE.Vector3(-0.08, 0.48, 0.02), new THREE.Vector3(1.0, 1.0, 1.0));
    setOffsetInstance(crystals, index * 2 + 1, prop, new THREE.Vector3(0.14, 0.34, -0.06), new THREE.Vector3(0.72, 0.72, 0.72));
  });

  root.add(bases, crystals);
  disposables.push(baseGeometry, crystalGeometry, baseMaterial, crystalMaterial);
}

function addBushes(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const geometry = new THREE.IcosahedronGeometry(0.45, 0);
  const lobeGeometry = new THREE.IcosahedronGeometry(0.28, 0);
  const material = new THREE.MeshStandardMaterial({ color: "#4f7d3b", roughness: 1, flatShading: true });
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: "#406a34", roughness: 1, flatShading: true });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#648d45", roughness: 1, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, props.length);
  const lobes = new THREE.InstancedMesh(lobeGeometry, shadowMaterial, props.length * 2);
  const lights = new THREE.InstancedMesh(lobeGeometry, lightMaterial, props.length);
  configureInstancedMesh(mesh);
  configureInstancedMesh(lobes);
  configureInstancedMesh(lights);

  props.forEach((prop, index) => {
    setInstance(mesh, index, prop, 0.24, new THREE.Vector3(1.1, 0.58, 0.88));
    setOffsetInstance(lobes, index * 2, prop, new THREE.Vector3(-0.22, 0.2, 0.12), new THREE.Vector3(0.92, 0.52, 0.76));
    setOffsetInstance(lobes, index * 2 + 1, prop, new THREE.Vector3(0.22, 0.22, -0.1), new THREE.Vector3(0.76, 0.5, 0.8));
    setOffsetInstance(lights, index, prop, new THREE.Vector3(0.08, 0.42, 0.1), new THREE.Vector3(0.54, 0.34, 0.48));
  });

  root.add(mesh, lobes, lights);
  disposables.push(geometry, lobeGeometry, material, shadowMaterial, lightMaterial);
}

function addFerns(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const leafGeometry = new THREE.ConeGeometry(0.075, 0.42, 4);
  const material = new THREE.MeshStandardMaterial({ color: "#5d8746", roughness: 1, flatShading: true });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#719750", roughness: 1, flatShading: true });
  const leaves = new THREE.InstancedMesh(leafGeometry, material, props.length * 6);
  const lightLeaves = new THREE.InstancedMesh(leafGeometry, lightMaterial, props.length * 2);
  configureInstancedMesh(leaves);
  configureInstancedMesh(lightLeaves);

  props.forEach((prop, index) => {
    for (let leaf = 0; leaf < 6; leaf += 1) {
      const angle = prop.rotation + leaf * Math.PI * 0.333 + prop.variant * 0.17;
      setOffsetInstance(
        leaves,
        index * 6 + leaf,
        prop,
        new THREE.Vector3(Math.sin(angle) * 0.1, 0.19 + (leaf % 2) * 0.025, Math.cos(angle) * 0.1),
        new THREE.Vector3(0.68 + (leaf % 2) * 0.14, 0.86, 0.68 + (leaf % 2) * 0.14),
      );
    }
    setOffsetInstance(lightLeaves, index * 2, prop, new THREE.Vector3(0.04, 0.26, 0.06), new THREE.Vector3(0.54, 0.68, 0.54));
    setOffsetInstance(lightLeaves, index * 2 + 1, prop, new THREE.Vector3(-0.06, 0.22, -0.04), new THREE.Vector3(0.48, 0.62, 0.48));
  });

  root.add(leaves, lightLeaves);
  disposables.push(leafGeometry, material, lightMaterial);
}

function addReeds(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const stemGeometry = new THREE.CylinderGeometry(0.026, 0.033, 0.86, 5);
  const seedGeometry = new THREE.CylinderGeometry(0.046, 0.046, 0.24, 5);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: "#6f874b", roughness: 1, flatShading: true });
  const seedMaterial = new THREE.MeshStandardMaterial({ color: "#725233", roughness: 0.96, flatShading: true });
  const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, props.length * 3);
  const seeds = new THREE.InstancedMesh(seedGeometry, seedMaterial, props.length * 3);
  [stems, seeds].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    for (let reed = 0; reed < 3; reed += 1) {
      const angle = prop.rotation + reed * 2.08;
      const offsetX = Math.sin(angle) * 0.09;
      const offsetZ = Math.cos(angle) * 0.09;
      const reedIndex = index * 3 + reed;
      setOffsetInstance(stems, reedIndex, prop, new THREE.Vector3(offsetX, 0.43, offsetZ), new THREE.Vector3(1, 1, 1));
      setOffsetInstance(seeds, reedIndex, prop, new THREE.Vector3(offsetX, 0.91, offsetZ), new THREE.Vector3(1, 1, 1));
    }
  });

  root.add(stems, seeds);
  disposables.push(stemGeometry, seedGeometry, stemMaterial, seedMaterial);
}

function addMushrooms(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const stemGeometry = new THREE.CylinderGeometry(0.035, 0.048, 0.18, 5);
  const capGeometry = new THREE.ConeGeometry(0.13, 0.12, 6);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: "#d8c095", roughness: 0.96, flatShading: true });
  const capMaterial = new THREE.MeshStandardMaterial({ color: "#a74f3a", roughness: 0.94, flatShading: true });
  const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, props.length);
  const caps = new THREE.InstancedMesh(capGeometry, capMaterial, props.length);
  [stems, caps].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(stems, index, prop, 0.09, new THREE.Vector3(1, 1, 1));
    setInstance(caps, index, prop, 0.22, new THREE.Vector3(1, 1, 1));
  });

  root.add(stems, caps);
  disposables.push(stemGeometry, capGeometry, stemMaterial, capMaterial);
}

function addLogs(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const geometry = new THREE.CylinderGeometry(0.2, 0.24, 1.32, 6);
  const capGeometry = new THREE.CylinderGeometry(0.21, 0.21, 0.05, 6);
  const barkStripGeometry = new THREE.BoxGeometry(0.075, 0.04, 0.58);
  const knotGeometry = new THREE.DodecahedronGeometry(0.075, 0);
  const material = new THREE.MeshStandardMaterial({ color: "#634025", roughness: 0.94, flatShading: true });
  const capMaterial = new THREE.MeshStandardMaterial({ color: "#b5834f", roughness: 0.92, flatShading: true });
  const barkStripMaterial = new THREE.MeshStandardMaterial({ color: "#472b1d", roughness: 0.98, flatShading: true });
  const knotMaterial = new THREE.MeshStandardMaterial({ color: "#2f2119", roughness: 0.98, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, props.length);
  const capA = new THREE.InstancedMesh(capGeometry, capMaterial, props.length);
  const capB = new THREE.InstancedMesh(capGeometry, capMaterial, props.length);
  const strips = new THREE.InstancedMesh(barkStripGeometry, barkStripMaterial, props.length * 3);
  const knots = new THREE.InstancedMesh(knotGeometry, knotMaterial, props.length * 2);
  configureInstancedMesh(mesh);
  configureInstancedMesh(capA);
  configureInstancedMesh(capB);
  configureInstancedMesh(strips);
  configureInstancedMesh(knots);

  props.forEach((prop, index) => {
    const position = new THREE.Vector3(prop.x, terrainHeight(prop.x, prop.z) + 0.18, prop.z);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, prop.rotation, 0));
    const scale = new THREE.Vector3(prop.scale * 0.88, prop.scale * 1.0, prop.scale * 0.88);
    const matrix = new THREE.Matrix4().compose(position, rotation, scale);
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation).setY(0).normalize();
    const capScale = new THREE.Vector3(prop.scale * 0.88, prop.scale, prop.scale * 0.88);
    const capOffset = axis.multiplyScalar(1.32 * prop.scale * 0.5);
    const capMatrixA = new THREE.Matrix4().compose(position.clone().add(capOffset), rotation, capScale);
    const capMatrixB = new THREE.Matrix4().compose(position.clone().sub(capOffset), rotation, capScale);

    mesh.setMatrixAt(index, matrix);
    capA.setMatrixAt(index, capMatrixA);
    capB.setMatrixAt(index, capMatrixB);
    mesh.count = Math.max(mesh.count, index + 1);
    capA.count = Math.max(capA.count, index + 1);
    capB.count = Math.max(capB.count, index + 1);
    [
      [-0.14, 0.36, -0.16, 0.74],
      [0.1, 0.34, 0.08, 0.58],
      [0.02, 0.4, 0.23, 0.48],
    ].forEach(([x, y, z, width], strip) => {
      setOffsetInstance(strips, index * 3 + strip, prop, new THREE.Vector3(x, y, z), new THREE.Vector3(width, 1, 0.8));
    });
    setOffsetInstance(knots, index * 2, prop, new THREE.Vector3(-0.19, 0.31, -0.08), new THREE.Vector3(0.8, 0.42, 0.62));
    setOffsetInstance(knots, index * 2 + 1, prop, new THREE.Vector3(0.18, 0.27, 0.19), new THREE.Vector3(0.58, 0.34, 0.5));
  });

  mesh.instanceMatrix.needsUpdate = true;
  capA.instanceMatrix.needsUpdate = true;
  capB.instanceMatrix.needsUpdate = true;
  root.add(mesh, capA, capB, strips, knots);
  disposables.push(geometry, capGeometry, barkStripGeometry, knotGeometry, material, capMaterial, barkStripMaterial, knotMaterial);
}

function addStumps(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const geometry = new THREE.CylinderGeometry(0.32, 0.4, 0.62, 6);
  const capGeometry = new THREE.CylinderGeometry(0.3, 0.32, 0.045, 6);
  const ringGeometry = new THREE.CylinderGeometry(0.16, 0.17, 0.052, 6);
  const chipGeometry = new THREE.DodecahedronGeometry(0.09, 0);
  const material = new THREE.MeshStandardMaterial({ color: "#6f482b", roughness: 0.96, flatShading: true });
  const capMaterial = new THREE.MeshStandardMaterial({ color: "#9b6c42", roughness: 0.96, flatShading: true });
  const ringMaterial = new THREE.MeshStandardMaterial({ color: "#c19058", roughness: 0.96, flatShading: true });
  const chipMaterial = new THREE.MeshStandardMaterial({ color: "#b57d47", roughness: 0.96, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, props.length);
  const caps = new THREE.InstancedMesh(capGeometry, capMaterial, props.length);
  const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, props.length);
  const chips = new THREE.InstancedMesh(chipGeometry, chipMaterial, props.length * 2);
  configureInstancedMesh(mesh);
  configureInstancedMesh(caps);
  configureInstancedMesh(rings);
  configureInstancedMesh(chips);

  props.forEach((prop, index) => {
    setInstance(mesh, index, prop, 0.3, new THREE.Vector3(0.86, 0.95, 0.86));
    setInstance(caps, index, prop, 0.6, new THREE.Vector3(0.86, 0.95, 0.86));
    setInstance(rings, index, prop, 0.63, new THREE.Vector3(0.86, 0.95, 0.86));
    setOffsetInstance(chips, index * 2, prop, new THREE.Vector3(-0.1, 0.68, 0.04), new THREE.Vector3(0.58, 0.32, 0.5));
    setOffsetInstance(chips, index * 2 + 1, prop, new THREE.Vector3(0.11, 0.66, -0.08), new THREE.Vector3(0.44, 0.28, 0.42));
  });

  root.add(mesh, caps, rings, chips);
  disposables.push(geometry, capGeometry, ringGeometry, chipGeometry, material, capMaterial, ringMaterial, chipMaterial);
}

function addMarkers(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const postGeometry = new THREE.CylinderGeometry(0.09, 0.12, 1.05, 5);
  const signGeometry = new THREE.BoxGeometry(0.78, 0.32, 0.12);
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#5a3823", roughness: 0.92, flatShading: true });
  const signMaterial = new THREE.MeshStandardMaterial({ color: "#8a5f35", roughness: 0.88, flatShading: true });
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, props.length);
  const signs = new THREE.InstancedMesh(signGeometry, signMaterial, props.length);
  configureInstancedMesh(posts);
  configureInstancedMesh(signs);

  props.forEach((prop, index) => {
    setInstance(posts, index, prop, 0.5, new THREE.Vector3(1, 1, 1));
    setInstance(signs, index, prop, 0.94, new THREE.Vector3(1, 1, 1));
  });

  root.add(posts, signs);
  disposables.push(postGeometry, signGeometry, postMaterial, signMaterial);
}

function addFlowers(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.38, 5);
  const leafGeometry = new THREE.ConeGeometry(0.09, 0.24, 4);
  const centerGeometry = new THREE.DodecahedronGeometry(0.078, 0);
  const petalGeometry = new THREE.BoxGeometry(0.14, 0.04, 0.18);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: "#456f34", roughness: 1, flatShading: true });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: "#5e8a3f", roughness: 1, flatShading: true });
  const centerMaterial = new THREE.MeshStandardMaterial({ color: "#8c5f22", roughness: 0.96, flatShading: true });
  const headMaterials = ["#d88925", "#efaa3c", "#efe2a3"].map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.96, flatShading: true }),
  );
  const stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, props.length);
  const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, props.length * 3);
  const centers = new THREE.InstancedMesh(centerGeometry, centerMaterial, props.length);
  const petals = headMaterials.map((material) => new THREE.InstancedMesh(petalGeometry, material, props.length * 6));
  configureInstancedMesh(stems);
  configureInstancedMesh(leaves);
  configureInstancedMesh(centers);
  petals.forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    const baseY = terrainHeight(prop.x, prop.z);
    const stemScale = new THREE.Vector3(0.95 * prop.scale, 1.05 * prop.scale, 0.95 * prop.scale);
    const stemPosition = new THREE.Vector3(prop.x, baseY + 0.17 * prop.scale, prop.z);
    const stemRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08 * Math.sin(prop.rotation), prop.rotation, 0.08 * Math.cos(prop.rotation)));
    stems.setMatrixAt(index, new THREE.Matrix4().compose(stemPosition, stemRotation, stemScale));
    stems.count = Math.max(stems.count, index + 1);

    const headPosition = new THREE.Vector3(prop.x, baseY + 0.42 * prop.scale, prop.z);
    centers.setMatrixAt(index, new THREE.Matrix4().compose(headPosition, stemRotation, new THREE.Vector3(prop.scale, prop.scale, prop.scale)));
    centers.count = Math.max(centers.count, index + 1);

    for (let leaf = 0; leaf < 3; leaf += 1) {
      const leafAngle = prop.rotation + [0.85, -0.85, 2.45][leaf];
      const leafPosition = new THREE.Vector3(
        prop.x + Math.sin(leafAngle) * 0.065 * prop.scale,
        baseY + (0.15 + leaf * 0.046) * prop.scale,
        prop.z + Math.cos(leafAngle) * 0.065 * prop.scale,
      );
      const leafRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2.35, leafAngle, leaf === 1 ? -0.45 : 0.45));
      const leafScale = new THREE.Vector3(prop.scale * (leaf === 2 ? 0.64 : 0.82), prop.scale * 0.82, prop.scale * (leaf === 2 ? 0.64 : 0.82));
      const leafIndex = index * 3 + leaf;
      leaves.setMatrixAt(leafIndex, new THREE.Matrix4().compose(leafPosition, leafRotation, leafScale));
      leaves.count = Math.max(leaves.count, leafIndex + 1);
    }

    for (let petal = 0; petal < 6; petal += 1) {
      const petalAngle = prop.rotation + petal * Math.PI * 0.333;
      const petalMesh = petals[(prop.variant + petal) % petals.length];
      const petalPosition = new THREE.Vector3(
        prop.x + Math.sin(petalAngle) * 0.095 * prop.scale,
        baseY + (0.425 + Math.sin(petal * 1.7) * 0.012) * prop.scale,
        prop.z + Math.cos(petalAngle) * 0.095 * prop.scale,
      );
      const petalRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, petalAngle, 0.08));
      const petalScale = new THREE.Vector3(prop.scale, prop.scale, prop.scale);
      petalMesh.setMatrixAt(petalMesh.count, new THREE.Matrix4().compose(petalPosition, petalRotation, petalScale));
      petalMesh.count += 1;
    }
  });

  [stems, leaves, centers, ...petals].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    root.add(mesh);
  });
  disposables.push(stemGeometry, leafGeometry, centerGeometry, petalGeometry, stemMaterial, leafMaterial, centerMaterial, ...headMaterials);
}

function addHouses(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const wallGeometry = new THREE.BoxGeometry(1.65, 1.2, 1.5);
  const roofGeometry = new THREE.ConeGeometry(1.32, 0.78, 4);
  const doorGeometry = new THREE.BoxGeometry(0.34, 0.62, 0.055);
  const windowGeometry = new THREE.BoxGeometry(0.24, 0.24, 0.06);
  const beamGeometry = new THREE.BoxGeometry(0.075, 1.18, 0.07);
  const chimneyGeometry = new THREE.BoxGeometry(0.22, 0.48, 0.22);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: "#b18c63", roughness: 0.92, flatShading: true });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#7b3f32", roughness: 0.9, flatShading: true });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: "#4d3324", roughness: 0.92, flatShading: true });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: "#d9bc74", roughness: 0.74, emissive: "#4a3519", emissiveIntensity: 0.08, flatShading: true });
  const beamMaterial = new THREE.MeshStandardMaterial({ color: "#65442b", roughness: 0.94, flatShading: true });
  const chimneyMaterial = new THREE.MeshStandardMaterial({ color: "#6c6a5d", roughness: 0.95, flatShading: true });
  const walls = new THREE.InstancedMesh(wallGeometry, wallMaterial, props.length);
  const roofs = new THREE.InstancedMesh(roofGeometry, roofMaterial, props.length);
  const doors = new THREE.InstancedMesh(doorGeometry, doorMaterial, props.length);
  const windows = new THREE.InstancedMesh(windowGeometry, windowMaterial, props.length * 2);
  const beams = new THREE.InstancedMesh(beamGeometry, beamMaterial, props.length * 2);
  const chimneys = new THREE.InstancedMesh(chimneyGeometry, chimneyMaterial, props.length);
  [walls, roofs, doors, windows, beams, chimneys].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(walls, index, prop, 0.62, new THREE.Vector3(1, 1, 1));
    setInstance(roofs, index, prop, 1.44, new THREE.Vector3(1, 0.86, 1));
    setOffsetInstance(doors, index, prop, new THREE.Vector3(0, 0.38, 0.78), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(windows, index * 2, prop, new THREE.Vector3(-0.48, 0.82, 0.78), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(windows, index * 2 + 1, prop, new THREE.Vector3(0.48, 0.82, 0.78), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(beams, index * 2, prop, new THREE.Vector3(-0.76, 0.62, 0.79), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(beams, index * 2 + 1, prop, new THREE.Vector3(0.76, 0.62, 0.79), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(chimneys, index, prop, new THREE.Vector3(0.46, 1.6, -0.32), new THREE.Vector3(1, 1, 1));
  });

  root.add(walls, roofs, doors, windows, beams, chimneys);
  disposables.push(
    wallGeometry,
    roofGeometry,
    doorGeometry,
    windowGeometry,
    beamGeometry,
    chimneyGeometry,
    wallMaterial,
    roofMaterial,
    doorMaterial,
    windowMaterial,
    beamMaterial,
    chimneyMaterial,
  );
}

function addFarms(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const soilGeometry = new THREE.BoxGeometry(1.45, 0.06, 1.05);
  const sproutGeometry = new THREE.ConeGeometry(0.07, 0.28, 4);
  const soilMaterial = new THREE.MeshStandardMaterial({ color: "#6a4a2d", roughness: 1, flatShading: true });
  const sproutMaterial = new THREE.MeshStandardMaterial({ color: "#79a852", roughness: 1, flatShading: true });
  const soil = new THREE.InstancedMesh(soilGeometry, soilMaterial, props.length);
  const sprouts = new THREE.InstancedMesh(sproutGeometry, sproutMaterial, props.length * 6);
  configureInstancedMesh(soil);
  configureInstancedMesh(sprouts);

  props.forEach((prop, index) => {
    setInstance(soil, index, prop, 0.04, new THREE.Vector3(1, 1, 1));
    for (let sprout = 0; sprout < 6; sprout += 1) {
      const row = sprout % 3;
      const column = Math.floor(sprout / 3);
      setOffsetInstance(
        sprouts,
        index * 6 + sprout,
        prop,
        new THREE.Vector3((row - 1) * 0.32, 0.22, (column - 0.5) * 0.34),
        new THREE.Vector3(1, 1, 1),
      );
    }
  });

  root.add(soil, sprouts);
  disposables.push(soilGeometry, sproutGeometry, soilMaterial, sproutMaterial);
}

function addWorkbenches(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const topGeometry = new THREE.BoxGeometry(0.92, 0.16, 0.5);
  const plankGeometry = new THREE.BoxGeometry(0.42, 0.035, 0.54);
  const legGeometry = new THREE.BoxGeometry(0.12, 0.48, 0.12);
  const toolGeometry = new THREE.BoxGeometry(0.34, 0.045, 0.07);
  const pegGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 5);
  const topMaterial = new THREE.MeshStandardMaterial({ color: "#765033", roughness: 0.92, flatShading: true });
  const plankMaterial = new THREE.MeshStandardMaterial({ color: "#8c623e", roughness: 0.92, flatShading: true });
  const legMaterial = new THREE.MeshStandardMaterial({ color: "#4e3323", roughness: 0.92, flatShading: true });
  const toolMaterial = new THREE.MeshStandardMaterial({ color: "#68685d", roughness: 0.88, flatShading: true });
  const tops = new THREE.InstancedMesh(topGeometry, topMaterial, props.length);
  const planks = new THREE.InstancedMesh(plankGeometry, plankMaterial, props.length * 2);
  const legs = new THREE.InstancedMesh(legGeometry, legMaterial, props.length * 4);
  const tools = new THREE.InstancedMesh(toolGeometry, toolMaterial, props.length);
  const pegs = new THREE.InstancedMesh(pegGeometry, legMaterial, props.length * 4);
  configureInstancedMesh(tops);
  configureInstancedMesh(planks);
  configureInstancedMesh(legs);
  configureInstancedMesh(tools);
  configureInstancedMesh(pegs);

  props.forEach((prop, index) => {
    setInstance(tops, index, prop, 0.52, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(planks, index * 2, prop, new THREE.Vector3(-0.23, 0.615, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(planks, index * 2 + 1, prop, new THREE.Vector3(0.23, 0.615, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(tools, index, prop, new THREE.Vector3(0.14, 0.665, 0.12), new THREE.Vector3(1, 1, 1));
    [[-0.36, -0.18], [0.36, -0.18], [-0.36, 0.18], [0.36, 0.18]].forEach(([x, z], leg) => {
      setOffsetInstance(legs, index * 4 + leg, prop, new THREE.Vector3(x, 0.26, z), new THREE.Vector3(1, 1, 1));
      setOffsetInstance(pegs, index * 4 + leg, prop, new THREE.Vector3(x, 0.54, z), new THREE.Vector3(1, 1, 1));
    });
  });

  root.add(tops, planks, legs, tools, pegs);
  disposables.push(topGeometry, plankGeometry, legGeometry, toolGeometry, pegGeometry, topMaterial, plankMaterial, legMaterial, toolMaterial);
}

function addChests(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const baseGeometry = new THREE.BoxGeometry(0.58, 0.34, 0.42);
  const lidGeometry = new THREE.BoxGeometry(0.62, 0.16, 0.46);
  const trimGeometry = new THREE.BoxGeometry(0.08, 0.4, 0.48);
  const lockGeometry = new THREE.BoxGeometry(0.1, 0.12, 0.05);
  const baseMaterial = new THREE.MeshStandardMaterial({ color: "#70462c", roughness: 0.9, flatShading: true });
  const lidMaterial = new THREE.MeshStandardMaterial({ color: "#8b5b32", roughness: 0.9, flatShading: true });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#d1b66a", roughness: 0.78, flatShading: true });
  const lockMaterial = new THREE.MeshStandardMaterial({ color: "#e1c46d", roughness: 0.72, flatShading: true });
  const bases = new THREE.InstancedMesh(baseGeometry, baseMaterial, props.length);
  const lids = new THREE.InstancedMesh(lidGeometry, lidMaterial, props.length);
  const trims = new THREE.InstancedMesh(trimGeometry, trimMaterial, props.length);
  const locks = new THREE.InstancedMesh(lockGeometry, lockMaterial, props.length);
  [bases, lids, trims, locks].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(bases, index, prop, 0.2, new THREE.Vector3(1, 1, 1));
    setInstance(lids, index, prop, 0.45, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(trims, index, prop, new THREE.Vector3(0, 0.32, 0.02), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(locks, index, prop, new THREE.Vector3(0, 0.31, 0.24), new THREE.Vector3(1, 1, 1));
  });

  root.add(bases, lids, trims, locks);
  disposables.push(baseGeometry, lidGeometry, trimGeometry, lockGeometry, baseMaterial, lidMaterial, trimMaterial, lockMaterial);
}

function addWells(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const baseGeometry = new THREE.CylinderGeometry(0.48, 0.56, 0.52, 8);
  const waterGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.035, 8);
  const postGeometry = new THREE.BoxGeometry(0.09, 0.82, 0.09);
  const roofGeometry = new THREE.ConeGeometry(0.62, 0.36, 4);
  const ropeGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.48, 5);
  const bucketGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#777568", roughness: 0.94, flatShading: true });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: "#4fa7b4", roughness: 0.5, flatShading: true });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: "#5d3d28", roughness: 0.9, flatShading: true });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#6f4631", roughness: 0.9, flatShading: true });
  const bucketMaterial = new THREE.MeshStandardMaterial({ color: "#6c6658", roughness: 0.94, flatShading: true });
  const bases = new THREE.InstancedMesh(baseGeometry, stoneMaterial, props.length);
  const waters = new THREE.InstancedMesh(waterGeometry, waterMaterial, props.length);
  const posts = new THREE.InstancedMesh(postGeometry, woodMaterial, props.length * 2);
  const roofs = new THREE.InstancedMesh(roofGeometry, roofMaterial, props.length);
  const ropes = new THREE.InstancedMesh(ropeGeometry, woodMaterial, props.length);
  const buckets = new THREE.InstancedMesh(bucketGeometry, bucketMaterial, props.length);
  [bases, waters, posts, roofs, ropes, buckets].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(bases, index, prop, 0.26, new THREE.Vector3(1, 1, 1));
    setInstance(waters, index, prop, 0.54, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(posts, index * 2, prop, new THREE.Vector3(-0.38, 0.92, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(posts, index * 2 + 1, prop, new THREE.Vector3(0.38, 0.92, 0), new THREE.Vector3(1, 1, 1));
    setInstance(roofs, index, prop, 1.36, new THREE.Vector3(1, 0.8, 1));
    setOffsetInstance(ropes, index, prop, new THREE.Vector3(0, 0.94, 0.05), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(buckets, index, prop, new THREE.Vector3(0.12, 0.66, 0.1), new THREE.Vector3(1, 1, 1));
  });

  root.add(bases, waters, posts, roofs, ropes, buckets);
  disposables.push(baseGeometry, waterGeometry, postGeometry, roofGeometry, ropeGeometry, bucketGeometry, stoneMaterial, waterMaterial, woodMaterial, roofMaterial, bucketMaterial);
}

function addCampfires(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const logGeometry = new THREE.CylinderGeometry(0.07, 0.08, 0.62, 6);
  const flameGeometry = new THREE.ConeGeometry(0.18, 0.46, 5);
  const innerFlameGeometry = new THREE.ConeGeometry(0.095, 0.34, 5);
  const logMaterial = new THREE.MeshStandardMaterial({ color: "#5f3a21", roughness: 0.9, flatShading: true });
  const flameMaterial = new THREE.MeshStandardMaterial({ color: "#df7b2f", roughness: 0.78, emissive: "#5a1e07", emissiveIntensity: 0.55, flatShading: true });
  const innerFlameMaterial = new THREE.MeshStandardMaterial({ color: "#f4ce59", roughness: 0.68, emissive: "#7b390b", emissiveIntensity: 0.62, flatShading: true });
  const logs = new THREE.InstancedMesh(logGeometry, logMaterial, props.length * 2);
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, props.length);
  const innerFlames = new THREE.InstancedMesh(innerFlameGeometry, innerFlameMaterial, props.length);
  configureInstancedMesh(logs);
  configureInstancedMesh(flames);
  configureInstancedMesh(innerFlames);

  props.forEach((prop, index) => {
    for (let log = 0; log < 2; log += 1) {
      const rotationOffset = log === 0 ? Math.PI / 2 : 0;
      const position = new THREE.Vector3(prop.x, terrainHeight(prop.x, prop.z) + 0.11 * prop.scale, prop.z);
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, prop.rotation + rotationOffset, 0));
      const scale = new THREE.Vector3(prop.scale, prop.scale, prop.scale);
      logs.setMatrixAt(index * 2 + log, new THREE.Matrix4().compose(position, rotation, scale));
      logs.count = Math.max(logs.count, index * 2 + log + 1);
    }
    setInstance(flames, index, prop, 0.36, new THREE.Vector3(1, 1, 1));
    setInstance(innerFlames, index, prop, 0.39, new THREE.Vector3(1, 1, 1));
  });

  logs.instanceMatrix.needsUpdate = true;
  root.add(logs, flames, innerFlames);
  disposables.push(logGeometry, flameGeometry, innerFlameGeometry, logMaterial, flameMaterial, innerFlameMaterial);
}

function addRuins(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const blockGeometry = new THREE.BoxGeometry(0.42, 0.38, 0.42);
  const pillarGeometry = new THREE.CylinderGeometry(0.16, 0.2, 0.86, 6);
  const material = new THREE.MeshStandardMaterial({ color: "#8a8877", roughness: 0.95, flatShading: true });
  const blocks = new THREE.InstancedMesh(blockGeometry, material, props.length * 3);
  const pillars = new THREE.InstancedMesh(pillarGeometry, material, props.length);
  configureInstancedMesh(blocks);
  configureInstancedMesh(pillars);

  props.forEach((prop, index) => {
    setInstance(pillars, index, prop, 0.42, new THREE.Vector3(1, 1, 1));
    [[-0.38, 0.05], [0.3, 0.32], [0.02, -0.42]].forEach(([x, z], block) => {
      setOffsetInstance(blocks, index * 3 + block, prop, new THREE.Vector3(x, 0.18 + block * 0.03, z), new THREE.Vector3(1, 1, 1));
    });
  });

  root.add(blocks, pillars);
  disposables.push(blockGeometry, pillarGeometry, material);
}

function addShrines(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const baseGeometry = new THREE.BoxGeometry(1.24, 0.22, 1.0);
  const stepGeometry = new THREE.BoxGeometry(1.5, 0.12, 1.24);
  const postGeometry = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6);
  const capGeometry = new THREE.BoxGeometry(1.34, 0.18, 0.38);
  const gemGeometry = new THREE.OctahedronGeometry(0.18, 0);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#86806b", roughness: 0.94, flatShading: true });
  const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: "#686856", roughness: 0.96, flatShading: true });
  const gemMaterial = new THREE.MeshStandardMaterial({ color: "#75c9cf", roughness: 0.58, emissive: "#2c7b82", emissiveIntensity: 0.28, flatShading: true });
  const bases = new THREE.InstancedMesh(baseGeometry, stoneMaterial, props.length);
  const steps = new THREE.InstancedMesh(stepGeometry, darkStoneMaterial, props.length);
  const posts = new THREE.InstancedMesh(postGeometry, stoneMaterial, props.length * 2);
  const caps = new THREE.InstancedMesh(capGeometry, stoneMaterial, props.length);
  const gems = new THREE.InstancedMesh(gemGeometry, gemMaterial, props.length);
  [bases, steps, posts, caps, gems].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(steps, index, prop, 0.06, new THREE.Vector3(1, 1, 1));
    setInstance(bases, index, prop, 0.24, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(posts, index * 2, prop, new THREE.Vector3(-0.46, 0.74, -0.08), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(posts, index * 2 + 1, prop, new THREE.Vector3(0.46, 0.74, -0.08), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(caps, index, prop, new THREE.Vector3(0, 1.23, -0.08), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(gems, index, prop, new THREE.Vector3(0, 0.72, 0.28), new THREE.Vector3(1, 1, 1));
  });

  root.add(steps, bases, posts, caps, gems);
  disposables.push(baseGeometry, stepGeometry, postGeometry, capGeometry, gemGeometry, stoneMaterial, darkStoneMaterial, gemMaterial);
}

function addPillars(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const shaftGeometry = new THREE.CylinderGeometry(0.16, 0.2, 0.96, 7);
  const capGeometry = new THREE.BoxGeometry(0.46, 0.12, 0.46);
  const chipGeometry = new THREE.DodecahedronGeometry(0.16, 0);
  const material = new THREE.MeshStandardMaterial({ color: "#827f6c", roughness: 0.96, flatShading: true });
  const shafts = new THREE.InstancedMesh(shaftGeometry, material, props.length);
  const caps = new THREE.InstancedMesh(capGeometry, material, props.length);
  const chips = new THREE.InstancedMesh(chipGeometry, material, props.length);
  [shafts, caps, chips].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(shafts, index, prop, 0.48, new THREE.Vector3(1, 0.78 + prop.variant * 0.08, 1));
    setOffsetInstance(caps, index, prop, new THREE.Vector3(0, 0.93 + prop.variant * 0.04, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(chips, index, prop, new THREE.Vector3(0.32, 0.12, -0.26), new THREE.Vector3(0.7, 0.42, 0.62));
  });

  root.add(shafts, caps, chips);
  disposables.push(shaftGeometry, capGeometry, chipGeometry, material);
}

function addRunestones(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const stoneGeometry = new THREE.BoxGeometry(0.42, 1.08, 0.32);
  const chipGeometry = new THREE.DodecahedronGeometry(0.14, 0);
  const runeGeometry = new THREE.BoxGeometry(0.045, 0.34, 0.03);
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#747965", roughness: 0.96, flatShading: true });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#575f53", roughness: 0.98, flatShading: true });
  const runeMaterial = new THREE.MeshStandardMaterial({ color: "#83c7c2", roughness: 0.72, emissive: "#1e6265", emissiveIntensity: 0.2, flatShading: true });
  const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, props.length);
  const chips = new THREE.InstancedMesh(chipGeometry, darkMaterial, props.length * 2);
  const runes = new THREE.InstancedMesh(runeGeometry, runeMaterial, props.length * 2);
  [stones, chips, runes].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(stones, index, prop, 0.54, new THREE.Vector3(0.9, 1, 0.78));
    setOffsetInstance(chips, index * 2, prop, new THREE.Vector3(-0.26, 0.18, 0.12), new THREE.Vector3(0.82, 0.54, 0.78));
    setOffsetInstance(chips, index * 2 + 1, prop, new THREE.Vector3(0.24, 0.08, -0.14), new THREE.Vector3(0.58, 0.38, 0.62));
    setOffsetInstance(runes, index * 2, prop, new THREE.Vector3(-0.07, 0.66, 0.175), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(runes, index * 2 + 1, prop, new THREE.Vector3(0.08, 0.44, 0.176), new THREE.Vector3(1, 0.72, 1));
  });

  root.add(stones, chips, runes);
  disposables.push(stoneGeometry, chipGeometry, runeGeometry, stoneMaterial, darkMaterial, runeMaterial);
}

function addTotems(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const poleGeometry = new THREE.CylinderGeometry(0.13, 0.18, 1.22, 6);
  const faceGeometry = new THREE.BoxGeometry(0.36, 0.32, 0.08);
  const eyeGeometry = new THREE.BoxGeometry(0.065, 0.045, 0.035);
  const capGeometry = new THREE.ConeGeometry(0.28, 0.26, 4);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#684127", roughness: 0.94, flatShading: true });
  const faceMaterial = new THREE.MeshStandardMaterial({ color: "#8b6038", roughness: 0.92, flatShading: true });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: "#d5bb72", roughness: 0.8, flatShading: true });
  const poles = new THREE.InstancedMesh(poleGeometry, poleMaterial, props.length);
  const faces = new THREE.InstancedMesh(faceGeometry, faceMaterial, props.length);
  const eyes = new THREE.InstancedMesh(eyeGeometry, eyeMaterial, props.length * 2);
  const caps = new THREE.InstancedMesh(capGeometry, poleMaterial, props.length);
  [poles, faces, eyes, caps].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(poles, index, prop, 0.61, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(faces, index, prop, new THREE.Vector3(0, 0.76, 0.15), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(eyes, index * 2, prop, new THREE.Vector3(-0.075, 0.8, 0.205), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(eyes, index * 2 + 1, prop, new THREE.Vector3(0.075, 0.8, 0.205), new THREE.Vector3(1, 1, 1));
    setInstance(caps, index, prop, 1.34, new THREE.Vector3(1, 0.78, 1));
  });

  root.add(poles, faces, eyes, caps);
  disposables.push(poleGeometry, faceGeometry, eyeGeometry, capGeometry, poleMaterial, faceMaterial, eyeMaterial);
}

function addBridges(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const plankGeometry = new THREE.BoxGeometry(0.34, 0.1, 1.38);
  const railGeometry = new THREE.BoxGeometry(3.0, 0.12, 0.12);
  const postGeometry = new THREE.BoxGeometry(0.12, 0.52, 0.12);
  const plankMaterial = new THREE.MeshStandardMaterial({ color: "#806144", roughness: 0.94, flatShading: true });
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#5c3d28", roughness: 0.94, flatShading: true });
  const planks = new THREE.InstancedMesh(plankGeometry, plankMaterial, props.length * 7);
  const rails = new THREE.InstancedMesh(railGeometry, railMaterial, props.length * 2);
  const posts = new THREE.InstancedMesh(postGeometry, railMaterial, props.length * 6);
  [planks, rails, posts].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    for (let plank = 0; plank < 7; plank += 1) {
      setOffsetInstance(planks, index * 7 + plank, prop, new THREE.Vector3((plank - 3) * 0.38, 0.12, 0), new THREE.Vector3(1, 1, 1));
    }
    setOffsetInstance(rails, index * 2, prop, new THREE.Vector3(0, 0.48, -0.78), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(rails, index * 2 + 1, prop, new THREE.Vector3(0, 0.48, 0.78), new THREE.Vector3(1, 1, 1));
    [-1.2, 0, 1.2].forEach((x, post) => {
      setOffsetInstance(posts, index * 6 + post * 2, prop, new THREE.Vector3(x, 0.3, -0.78), new THREE.Vector3(1, 1, 1));
      setOffsetInstance(posts, index * 6 + post * 2 + 1, prop, new THREE.Vector3(x, 0.3, 0.78), new THREE.Vector3(1, 1, 1));
    });
  });

  root.add(planks, rails, posts);
  disposables.push(plankGeometry, railGeometry, postGeometry, plankMaterial, railMaterial);
}

function addDocks(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const boardGeometry = new THREE.BoxGeometry(1.55, 0.09, 0.26);
  const postGeometry = new THREE.CylinderGeometry(0.07, 0.09, 0.72, 6);
  const ropeGeometry = new THREE.BoxGeometry(1.42, 0.07, 0.07);
  const boardMaterial = new THREE.MeshStandardMaterial({ color: "#74563d", roughness: 0.95, flatShading: true });
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#4d3324", roughness: 0.95, flatShading: true });
  const boards = new THREE.InstancedMesh(boardGeometry, boardMaterial, props.length * 4);
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, props.length * 4);
  const ropes = new THREE.InstancedMesh(ropeGeometry, postMaterial, props.length * 2);
  [boards, posts, ropes].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    for (let board = 0; board < 4; board += 1) {
      setOffsetInstance(boards, index * 4 + board, prop, new THREE.Vector3(0, 0.12, (board - 1.5) * 0.31), new THREE.Vector3(1, 1, 1));
    }
    [[-0.68, -0.52], [0.68, -0.52], [-0.68, 0.52], [0.68, 0.52]].forEach(([x, z], post) => {
      setOffsetInstance(posts, index * 4 + post, prop, new THREE.Vector3(x, 0.36, z), new THREE.Vector3(1, 1, 1));
    });
    setOffsetInstance(ropes, index * 2, prop, new THREE.Vector3(0, 0.62, -0.54), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(ropes, index * 2 + 1, prop, new THREE.Vector3(0, 0.62, 0.54), new THREE.Vector3(1, 1, 1));
  });

  root.add(boards, posts, ropes);
  disposables.push(boardGeometry, postGeometry, ropeGeometry, boardMaterial, postMaterial);
}

function addCampTents(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const tentGeometry = new THREE.ConeGeometry(0.72, 0.78, 4);
  const flapGeometry = new THREE.BoxGeometry(0.22, 0.42, 0.045);
  const pegGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.24, 5);
  const fabricMaterial = new THREE.MeshStandardMaterial({ color: "#657250", roughness: 0.96, flatShading: true });
  const darkFabricMaterial = new THREE.MeshStandardMaterial({ color: "#3d4737", roughness: 0.98, flatShading: true });
  const pegMaterial = new THREE.MeshStandardMaterial({ color: "#5a3825", roughness: 0.94, flatShading: true });
  const tents = new THREE.InstancedMesh(tentGeometry, fabricMaterial, props.length);
  const flaps = new THREE.InstancedMesh(flapGeometry, darkFabricMaterial, props.length);
  const pegs = new THREE.InstancedMesh(pegGeometry, pegMaterial, props.length * 4);
  [tents, flaps, pegs].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(tents, index, prop, 0.39, new THREE.Vector3(1.0, 0.82, 0.72));
    setOffsetInstance(flaps, index, prop, new THREE.Vector3(0, 0.31, 0.5), new THREE.Vector3(1, 1, 1));
    [[-0.56, -0.45], [0.56, -0.45], [-0.56, 0.45], [0.56, 0.45]].forEach(([x, z], peg) => {
      setOffsetInstance(pegs, index * 4 + peg, prop, new THREE.Vector3(x, 0.1, z), new THREE.Vector3(1, 1, 1));
    });
  });

  root.add(tents, flaps, pegs);
  disposables.push(tentGeometry, flapGeometry, pegGeometry, fabricMaterial, darkFabricMaterial, pegMaterial);
}

function addFences(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const postGeometry = new THREE.BoxGeometry(0.12, 0.72, 0.12);
  const railGeometry = new THREE.BoxGeometry(1.36, 0.1, 0.12);
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#5a3825", roughness: 0.94, flatShading: true });
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#765033", roughness: 0.92, flatShading: true });
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, props.length * 2);
  const rails = new THREE.InstancedMesh(railGeometry, railMaterial, props.length * 2);
  [posts, rails].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setOffsetInstance(posts, index * 2, prop, new THREE.Vector3(-0.62, 0.36, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(posts, index * 2 + 1, prop, new THREE.Vector3(0.62, 0.36, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(rails, index * 2, prop, new THREE.Vector3(0, 0.48, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(rails, index * 2 + 1, prop, new THREE.Vector3(0, 0.26, 0), new THREE.Vector3(1, 1, 1));
  });

  root.add(posts, rails);
  disposables.push(postGeometry, railGeometry, postMaterial, railMaterial);
}

function addBarrels(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const bodyGeometry = new THREE.CylinderGeometry(0.24, 0.28, 0.52, 8);
  const ringGeometry = new THREE.CylinderGeometry(0.245, 0.285, 0.045, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#6f4529", roughness: 0.92, flatShading: true });
  const ringMaterial = new THREE.MeshStandardMaterial({ color: "#2f2b22", roughness: 0.88, flatShading: true });
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, props.length);
  const rings = new THREE.InstancedMesh(ringGeometry, ringMaterial, props.length * 2);
  [bodies, rings].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(bodies, index, prop, 0.26, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(rings, index * 2, prop, new THREE.Vector3(0, 0.12, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(rings, index * 2 + 1, prop, new THREE.Vector3(0, 0.4, 0), new THREE.Vector3(1, 1, 1));
  });

  root.add(bodies, rings);
  disposables.push(bodyGeometry, ringGeometry, bodyMaterial, ringMaterial);
}

function addCrates(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const bodyGeometry = new THREE.BoxGeometry(0.48, 0.42, 0.48);
  const strapGeometry = new THREE.BoxGeometry(0.08, 0.46, 0.52);
  const crossStrapGeometry = new THREE.BoxGeometry(0.52, 0.08, 0.08);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#7b5633", roughness: 0.94, flatShading: true });
  const strapMaterial = new THREE.MeshStandardMaterial({ color: "#4a301f", roughness: 0.94, flatShading: true });
  const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, props.length);
  const straps = new THREE.InstancedMesh(strapGeometry, strapMaterial, props.length);
  const crossStraps = new THREE.InstancedMesh(crossStrapGeometry, strapMaterial, props.length);
  [bodies, straps, crossStraps].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(bodies, index, prop, 0.22, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(straps, index, prop, new THREE.Vector3(0, 0.23, 0), new THREE.Vector3(1, 1, 1));
    setOffsetInstance(crossStraps, index, prop, new THREE.Vector3(0, 0.36, 0.25), new THREE.Vector3(1, 1, 1));
  });

  root.add(bodies, straps, crossStraps);
  disposables.push(bodyGeometry, strapGeometry, crossStrapGeometry, bodyMaterial, strapMaterial);
}

function addHaystacks(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const bodyGeometry = new THREE.ConeGeometry(0.46, 0.72, 7);
  const bandGeometry = new THREE.CylinderGeometry(0.32, 0.38, 0.08, 7);
  const hayMaterial = new THREE.MeshStandardMaterial({ color: "#b99a4f", roughness: 0.98, flatShading: true });
  const bandMaterial = new THREE.MeshStandardMaterial({ color: "#7b5633", roughness: 0.94, flatShading: true });
  const bodies = new THREE.InstancedMesh(bodyGeometry, hayMaterial, props.length);
  const bands = new THREE.InstancedMesh(bandGeometry, bandMaterial, props.length);
  [bodies, bands].forEach(configureInstancedMesh);

  props.forEach((prop, index) => {
    setInstance(bodies, index, prop, 0.36, new THREE.Vector3(1, 1, 1));
    setOffsetInstance(bands, index, prop, new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(1, 1, 1));
  });

  root.add(bodies, bands);
  disposables.push(bodyGeometry, bandGeometry, hayMaterial, bandMaterial);
}

function addTorches(root: THREE.Group, disposables: Array<{ dispose: () => void }>, props: WorldProp[]): void {
  const postGeometry = new THREE.CylinderGeometry(0.045, 0.06, 0.88, 6);
  const flameGeometry = new THREE.ConeGeometry(0.11, 0.28, 5);
  const postMaterial = new THREE.MeshStandardMaterial({ color: "#4b2f20", roughness: 0.92, flatShading: true });
  const flameMaterial = new THREE.MeshStandardMaterial({ color: "#e69a37", roughness: 0.7, emissive: "#5c2408", emissiveIntensity: 0.5, flatShading: true });
  const posts = new THREE.InstancedMesh(postGeometry, postMaterial, props.length);
  const flames = new THREE.InstancedMesh(flameGeometry, flameMaterial, props.length);
  configureInstancedMesh(posts);
  configureInstancedMesh(flames);

  props.forEach((prop, index) => {
    setInstance(posts, index, prop, 0.44, new THREE.Vector3(1, 1, 1));
    setInstance(flames, index, prop, 1.02, new THREE.Vector3(1, 1, 1));
  });

  root.add(posts, flames);
  disposables.push(postGeometry, flameGeometry, postMaterial, flameMaterial);
}

function configureInstancedMesh(mesh: THREE.InstancedMesh): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.count = 0;
}

function setOffsetInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  prop: WorldProp,
  localOffset: THREE.Vector3,
  baseScale: THREE.Vector3,
): void {
  const cos = Math.cos(prop.rotation);
  const sin = Math.sin(prop.rotation);
  const offsetX = localOffset.x * cos + localOffset.z * sin;
  const offsetZ = -localOffset.x * sin + localOffset.z * cos;
  const position = new THREE.Vector3(
    prop.x + offsetX * prop.scale,
    terrainHeight(prop.x, prop.z) + localOffset.y * prop.scale,
    prop.z + offsetZ * prop.scale,
  );
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), prop.rotation);
  const scale = new THREE.Vector3(baseScale.x * prop.scale, baseScale.y * prop.scale, baseScale.z * prop.scale);
  mesh.setMatrixAt(index, new THREE.Matrix4().compose(position, rotation, scale));
  mesh.count = Math.max(mesh.count, index + 1);
  mesh.instanceMatrix.needsUpdate = true;
}

function setInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  prop: WorldProp,
  yOffset: number,
  baseScale: THREE.Vector3,
): void {
  const position = new THREE.Vector3(prop.x, terrainHeight(prop.x, prop.z) + yOffset * prop.scale, prop.z);
  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), prop.rotation);
  const scale = new THREE.Vector3(baseScale.x * prop.scale, baseScale.y * prop.scale, baseScale.z * prop.scale);
  const matrix = new THREE.Matrix4().compose(position, rotation, scale);
  mesh.setMatrixAt(index, matrix);
  mesh.count = Math.max(mesh.count, index + 1);
  mesh.instanceMatrix.needsUpdate = true;
}
