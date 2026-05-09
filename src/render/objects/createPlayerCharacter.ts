import * as THREE from "three";

export type PlayerCharacter = {
  root: THREE.Group;
  update: (deltaSeconds: number, velocity: THREE.Vector3, elapsedSeconds: number, attackPulse?: number, gatherPulse?: number, talkAmount?: number) => void;
  dispose: () => void;
};

export type CharacterStyleId = "pathfinder" | "sentinel" | "arcanist" | "warden" | "duelist";
export type CharacterColorId = "forest" | "steel" | "ember" | "violet" | "ochre";

type CharacterColors = {
  tunic: string;
  darkTunic: string;
  trim: string;
  leather: string;
  boot: string;
  pants: string;
  skin: string;
  hair: string;
};

export type CharacterPreset = {
  id: CharacterStyleId;
  name: string;
  role: string;
  description: string;
  scale: number;
  colors: CharacterColors;
};

export type CharacterColorVariant = {
  id: CharacterColorId;
  name: string;
  colors: Pick<CharacterColors, "tunic" | "darkTunic" | "trim" | "pants">;
};

type LimbSide = "left" | "right";

type ArmRig = {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
};

type LegRig = {
  hip: THREE.Group;
  knee: THREE.Group;
  ankle: THREE.Group;
  baseAnkleY: number;
};

type CharacterRig = {
  facing: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  arms: Record<LimbSide, ArmRig>;
  legs: Record<LimbSide, LegRig>;
};

type CharacterSilhouette = {
  shoulderWidth: number;
  torsoWidth: number;
  torsoHeight: number;
  torsoDepth: number;
  hipWidth: number;
  legSpacing: number;
  armLength: number;
  legLength: number;
  limbWidth: number;
  footWidth: number;
  headScale: number;
};

type GeometrySet = {
  pelvis: THREE.BufferGeometry;
  waist: THREE.BufferGeometry;
  torso: THREE.BufferGeometry;
  detailPlate: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  strap: THREE.BufferGeometry;
  pouch: THREE.BufferGeometry;
  cuff: THREE.BufferGeometry;
  neck: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  hair: THREE.BufferGeometry;
  eye: THREE.BufferGeometry;
  upperArm: THREE.BufferGeometry;
  forearm: THREE.BufferGeometry;
  hand: THREE.BufferGeometry;
  thigh: THREE.BufferGeometry;
  shin: THREE.BufferGeometry;
  foot: THREE.BufferGeometry;
  gem: THREE.BufferGeometry;
};

type MaterialSet = {
  tunic: THREE.MeshStandardMaterial;
  darkTunic: THREE.MeshStandardMaterial;
  trim: THREE.MeshStandardMaterial;
  leather: THREE.MeshStandardMaterial;
  boot: THREE.MeshStandardMaterial;
  pants: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  hair: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
};

export const characterColorVariants: CharacterColorVariant[] = [
  {
    id: "forest",
    name: "Forest",
    colors: {
      tunic: "#3f6a50",
      darkTunic: "#2b4b3d",
      trim: "#d1b874",
      pants: "#2d4038",
    },
  },
  {
    id: "steel",
    name: "Steel",
    colors: {
      tunic: "#4e5b60",
      darkTunic: "#343f43",
      trim: "#c9b882",
      pants: "#30383a",
    },
  },
  {
    id: "ember",
    name: "Copper",
    colors: {
      tunic: "#735342",
      darkTunic: "#4d3930",
      trim: "#d0ad73",
      pants: "#3a332e",
    },
  },
  {
    id: "violet",
    name: "Dusk",
    colors: {
      tunic: "#555a73",
      darkTunic: "#393d50",
      trim: "#c8b77f",
      pants: "#343845",
    },
  },
  {
    id: "ochre",
    name: "Sage",
    colors: {
      tunic: "#67734d",
      darkTunic: "#464f35",
      trim: "#cbb471",
      pants: "#373d31",
    },
  },
];

export const characterPresets: CharacterPreset[] = [
  {
    id: "pathfinder",
    name: "Mara",
    role: "Balanced",
    description: "Short swept hair and a calm, practical build.",
    scale: 1.22,
    colors: { ...baseColors("#2f7f61", "#245f4d", "#e0c270", "#293c35"), hair: "#2f231a" },
  },
  {
    id: "sentinel",
    name: "Rowan",
    role: "Steady",
    description: "Cropped hair, wider shoulders, and grounded movement.",
    scale: 1.27,
    colors: { ...baseColors("#46586a", "#2f3d4b", "#c6b27a", "#30373c"), hair: "#211f1c" },
  },
  {
    id: "arcanist",
    name: "Nia",
    role: "Focused",
    description: "Longer hair, slim posture, and careful precise steps.",
    scale: 1.19,
    colors: { ...baseColors("#4f6252", "#34463d", "#d7c078", "#323b36"), hair: "#3b281d" },
  },
  {
    id: "warden",
    name: "Toma",
    role: "Crafty",
    description: "Loose hair, sturdy clothes, and a practical worker stance.",
    scale: 1.23,
    colors: { ...baseColors("#536f45", "#394d35", "#d3b76f", "#303b2e"), hair: "#4a2f1e" },
  },
  {
    id: "duelist",
    name: "Ilya",
    role: "Light",
    description: "Side-part hair, narrow frame, and quick readable steps.",
    scale: 1.18,
    colors: { ...baseColors("#6c5638", "#423425", "#d8be7b", "#2f302b"), hair: "#241b16" },
  },
];

export function getCharacterPreset(id: CharacterStyleId): CharacterPreset {
  return characterPresets.find((preset) => preset.id === id) ?? characterPresets[0];
}

export function getCharacterColorVariant(id: CharacterColorId): CharacterColorVariant {
  return characterColorVariants.find((variant) => variant.id === id) ?? characterColorVariants[0];
}

export function createPlayerCharacter(
  styleId: CharacterStyleId = "pathfinder",
  colorId: CharacterColorId = "forest",
): PlayerCharacter {
  const root = new THREE.Group();
  root.name = "PlayerCharacter";

  const preset = getCharacterPreset(styleId);
  const colorVariant = getCharacterColorVariant(colorId);
  const colors = resolveColors(preset, colorVariant);
  const disposables: Array<{ dispose: () => void }> = [];
  const rig = createRig(disposables, preset, colors);
  root.add(rig.facing);

  let walkPhase = 0;
  let walkBlend = 0;
  let runBlend = 0;
  let facingYaw = 0.55;
  const movementLean = new THREE.Vector2();

  return {
    root,
    update: (deltaSeconds, velocity, elapsedSeconds, attackPulse = 0, gatherPulse = 0, talkAmount = 0) => {
      const speed = Math.hypot(velocity.x, velocity.z);
      const targetWalkBlend = THREE.MathUtils.clamp(speed / 4.2, 0, 1);
      const targetRunBlend = THREE.MathUtils.clamp((speed - 4.25) / 2.1, 0, 1);
      walkBlend = THREE.MathUtils.damp(walkBlend, targetWalkBlend, 11.5, deltaSeconds);
      runBlend = THREE.MathUtils.damp(runBlend, targetRunBlend, 9, deltaSeconds);
      const cadence = 3.85 + speed * 0.46 + runBlend * 1.1;
      walkPhase += deltaSeconds * cadence * Math.max(walkBlend, 0.08);

      if (speed > 0.08) {
        const targetYaw = Math.atan2(velocity.x, velocity.z);
        facingYaw = dampAngle(facingYaw, targetYaw, 13, deltaSeconds);
      }

      const sinYaw = Math.sin(facingYaw);
      const cosYaw = Math.cos(facingYaw);
      const localForward = velocity.x * sinYaw + velocity.z * cosYaw;
      const localRight = velocity.x * cosYaw - velocity.z * sinYaw;
      movementLean.x = THREE.MathUtils.damp(movementLean.x, localRight * 0.0045, 10, deltaSeconds);
      movementLean.y = THREE.MathUtils.damp(movementLean.y, localForward * 0.0025, 10, deltaSeconds);

      const leftPhase = walkPhase;
      const rightPhase = walkPhase + Math.PI;
      const leftStride = Math.sin(leftPhase);
      const rightStride = Math.sin(rightPhase);
      const strideAbs = Math.abs(leftStride);
      const idleBreath = Math.sin(elapsedSeconds * 2.05) * (1 - walkBlend);
      const contactPulse = Math.pow(Math.max(0, Math.cos(walkPhase * 2)), 1.8);
      const passingPulse = Math.pow(Math.max(0, Math.sin(walkPhase * 2)), 1.1);
      const groundedBob = (passingPulse * 0.012 - contactPulse * 0.007) * walkBlend;
      const walkEase = smoothStep(walkBlend);
      const runEase = smoothStep(runBlend);
      const attackProgress = attackPulse > 0 ? THREE.MathUtils.clamp(1 - attackPulse / 0.34, 0, 1) : 0;
      const attackSwing = attackPulse > 0 ? Math.sin(attackProgress * Math.PI) : 0;
      const attackFollow = attackPulse > 0 ? smoothStep(attackProgress) : 0;
      const gatherProgress = gatherPulse > 0 ? THREE.MathUtils.clamp(1 - gatherPulse / 0.48, 0, 1) : 0;
      const gatherSwing = gatherPulse > 0 ? Math.sin(gatherProgress * Math.PI) : 0;
      const gatherWindup = gatherPulse > 0 ? Math.sin(THREE.MathUtils.clamp(gatherProgress / 0.34, 0, 1) * Math.PI * 0.5) : 0;
      const gatherStrike = gatherPulse > 0 ? Math.sin(THREE.MathUtils.clamp((gatherProgress - 0.18) / 0.64, 0, 1) * Math.PI) : 0;
      const gatherRecover = gatherPulse > 0 ? smoothStep(THREE.MathUtils.clamp((gatherProgress - 0.62) / 0.38, 0, 1)) : 0;
      const talk = smoothStep(talkAmount);
      const talkBeat = Math.sin(elapsedSeconds * 8.4) * talk;
      const talkGesture = Math.sin(elapsedSeconds * 3.2 + 0.4) * talk;
      const forwardLean = (0.014 + speed * 0.0025 + runEase * 0.018) * walkEase;
      const torsoLean = (0.01 + speed * 0.0018 + runEase * 0.012) * walkEase;

      rig.facing.rotation.y = facingYaw;
      rig.facing.position.y = 0.11 + groundedBob + idleBreath * 0.008 - gatherStrike * 0.01;
      rig.torso.position.y = 0.21 + idleBreath * 0.006 - contactPulse * 0.006 * walkEase - gatherStrike * 0.012;
      rig.hips.rotation.x = forwardLean + movementLean.y + Math.sin(walkPhase * 2) * 0.006 * walkEase + gatherStrike * 0.08 - gatherRecover * 0.035;
      rig.hips.rotation.y = attackSwing * 0.16 + gatherWindup * 0.08 - gatherStrike * 0.1;
      rig.hips.rotation.z = movementLean.x * 0.55 + (leftStride - rightStride) * 0.006 * walkEase;
      rig.torso.rotation.x = torsoLean + idleBreath * 0.012 + Math.sin(walkPhase * 2 + 0.3) * 0.004 * walkEase + gatherWindup * 0.05 + gatherStrike * 0.2 - gatherRecover * 0.06;
      rig.torso.rotation.y = attackSwing * 0.22 + gatherWindup * 0.08 - gatherStrike * 0.13;
      rig.torso.rotation.z = -Math.sin(walkPhase) * (0.008 + runEase * 0.004) * walkEase;
      rig.chest.rotation.y = Math.sin(walkPhase) * (0.02 + runEase * 0.016) * walkEase + attackSwing * 0.34;
      rig.head.rotation.x = idleBreath * 0.012 - forwardLean * 0.12 + strideAbs * 0.003 * walkEase + gatherStrike * 0.06 + talkBeat * 0.018;
      rig.head.rotation.y = -Math.sin(walkPhase) * 0.012 * walkEase - attackSwing * 0.12 - gatherStrike * 0.04 + talkGesture * 0.025;
      rig.head.rotation.z = Math.sin(elapsedSeconds * 1.35) * 0.012 * (1 - walkBlend) + talkGesture * 0.014;

      animateLeg(rig.legs.left, leftPhase, walkBlend, runBlend);
      animateLeg(rig.legs.right, rightPhase, walkBlend, runBlend);
      animateArm(rig.arms.left, rightPhase, walkBlend, runBlend, -1);
      animateArm(rig.arms.right, leftPhase, walkBlend, runBlend, 1);

      if (attackPulse > 0) {
        rig.arms.right.shoulder.rotation.x -= 0.9 * attackSwing + 0.18 * attackFollow;
        rig.arms.right.shoulder.rotation.z += 0.32 * attackSwing;
        rig.arms.right.elbow.rotation.x -= 0.5 * attackSwing;
        rig.arms.right.hand.rotation.z += 0.26 * attackSwing;
        rig.arms.left.shoulder.rotation.x += 0.28 * attackSwing;
        rig.arms.left.elbow.rotation.x -= 0.18 * attackSwing;
      }

      if (gatherPulse > 0) {
        const brace = Math.max(gatherWindup, gatherStrike * 0.7);
        rig.legs.left.hip.rotation.x += 0.08 * brace;
        rig.legs.right.hip.rotation.x += 0.15 * brace;
        rig.legs.left.knee.rotation.x += 0.13 * brace;
        rig.legs.right.knee.rotation.x += 0.19 * brace;
        rig.legs.left.ankle.rotation.x -= 0.05 * brace;
        rig.legs.right.ankle.rotation.x -= 0.08 * brace;

        rig.head.rotation.x += gatherSwing * 0.08;
        rig.arms.left.shoulder.rotation.x -= 0.18 * gatherWindup + 0.54 * gatherStrike;
        rig.arms.right.shoulder.rotation.x -= 0.3 * gatherWindup + 0.68 * gatherStrike;
        rig.arms.left.shoulder.rotation.z -= 0.14 * gatherWindup + 0.24 * gatherStrike;
        rig.arms.right.shoulder.rotation.z += 0.18 * gatherWindup + 0.26 * gatherStrike;
        rig.arms.left.elbow.rotation.x -= 0.18 * gatherWindup + 0.34 * gatherStrike;
        rig.arms.right.elbow.rotation.x -= 0.22 * gatherWindup + 0.42 * gatherStrike;
        rig.arms.left.hand.rotation.x += 0.12 * gatherStrike;
        rig.arms.right.hand.rotation.x += 0.16 * gatherStrike;
        rig.arms.left.hand.rotation.z -= 0.12 * gatherWindup + 0.18 * gatherStrike;
        rig.arms.right.hand.rotation.z += 0.12 * gatherWindup + 0.2 * gatherStrike;
      }

      if (talk > 0) {
        rig.chest.rotation.y += talkGesture * 0.035;
        rig.arms.left.shoulder.rotation.x += talkGesture * 0.045;
        rig.arms.right.shoulder.rotation.x -= talkGesture * 0.05;
        rig.arms.left.elbow.rotation.x -= (0.05 + Math.max(0, talkBeat) * 0.035) * talk;
        rig.arms.right.elbow.rotation.x -= (0.05 + Math.max(0, -talkBeat) * 0.035) * talk;
        rig.arms.left.hand.rotation.z -= talkGesture * 0.04;
        rig.arms.right.hand.rotation.z += talkGesture * 0.04;
      }
    },
    dispose: () => {
      disposables.forEach((item) => {
        item.dispose();
      });
    },
  };
}

function createRig(
  disposables: Array<{ dispose: () => void }>,
  preset: CharacterPreset,
  colors: CharacterColors,
): CharacterRig {
  const facing = new THREE.Group();
  facing.name = "CharacterRig";
  facing.scale.setScalar(preset.scale);
  const silhouette = getSilhouette(preset.id);

  const geometries = createGeometries();
  const materials = createMaterials(colors);
  disposables.push(...Object.values(geometries), ...Object.values(materials));

  const hips = new THREE.Group();
  hips.name = "Hips";
  hips.position.y = 0.92;
  facing.add(hips);

  const pelvis = mesh(geometries.pelvis, materials.darkTunic, "Pelvis");
  pelvis.scale.set(silhouette.hipWidth, 1, 0.82 * silhouette.torsoDepth);
  hips.add(pelvis);

  const belt = mesh(geometries.waist, materials.leather, "Belt");
  belt.position.y = 0.14;
  belt.scale.set(1.05 * silhouette.hipWidth, 1, 0.84 * silhouette.torsoDepth);
  hips.add(belt);

  const sidePouch = mesh(geometries.pouch, materials.leather, "SidePouch");
  sidePouch.position.set(0.24 * silhouette.hipWidth, 0.05, 0.2 * silhouette.torsoDepth);
  sidePouch.rotation.z = -0.04;
  sidePouch.scale.set(0.95, 0.9, 0.85);
  hips.add(sidePouch);

  const torso = new THREE.Group();
  torso.name = "Torso";
  torso.position.y = 0.21;
  hips.add(torso);

  const torsoMesh = mesh(geometries.torso, materials.tunic, "TorsoMesh");
  torsoMesh.position.y = 0.36;
  torsoMesh.scale.set(silhouette.torsoWidth, silhouette.torsoHeight, 0.82 * silhouette.torsoDepth);
  torso.add(torsoMesh);

  const collar = mesh(geometries.collar, materials.trim, "Collar");
  collar.position.set(0, 0.71 + (silhouette.torsoHeight - 1) * 0.12, 0.2 * silhouette.torsoDepth);
  collar.scale.set(1.05 * silhouette.torsoWidth, 1, 0.7 * silhouette.torsoDepth);
  torso.add(collar);

  const chestStrap = mesh(geometries.strap, materials.leather, "ChestStrap");
  chestStrap.position.set(-0.05 * silhouette.torsoWidth, 0.39, 0.255 * silhouette.torsoDepth);
  chestStrap.rotation.z = -0.45;
  chestStrap.scale.set(0.95, 0.94 * silhouette.torsoHeight, 1);
  torso.add(chestStrap);

  const trimPlate = mesh(geometries.detailPlate, materials.trim, "TunicFastener");
  trimPlate.position.set(0.12 * silhouette.torsoWidth, 0.45, 0.285 * silhouette.torsoDepth);
  trimPlate.rotation.x = Math.PI / 2;
  trimPlate.scale.set(0.36, 0.2, 0.24);
  torso.add(trimPlate);

  const chest = new THREE.Group();
  chest.name = "Chest";
  chest.position.y = 0.42;
  torso.add(chest);

  const neck = mesh(geometries.neck, materials.skin, "Neck");
  neck.position.y = 0.74 + (silhouette.torsoHeight - 1) * 0.18;
  torso.add(neck);

  const head = new THREE.Group();
  head.name = "Head";
  head.position.y = 0.93 + (silhouette.torsoHeight - 1) * 0.2;
  torso.add(head);

  addHead(head, geometries, materials, silhouette, preset.id);

  const arms = {
    left: createArm("left", geometries, materials, silhouette),
    right: createArm("right", geometries, materials, silhouette),
  };
  torso.add(arms.left.shoulder, arms.right.shoulder);

  const legs = {
    left: createLeg("left", geometries, materials, silhouette),
    right: createLeg("right", geometries, materials, silhouette),
  };
  hips.add(legs.left.hip, legs.right.hip);

  return { facing, hips, torso, chest, head, arms, legs };
}

function createGeometries(): GeometrySet {
  return {
    pelvis: new THREE.CylinderGeometry(0.21, 0.27, 0.22, 8),
    waist: new THREE.CylinderGeometry(0.29, 0.26, 0.06, 8),
    torso: new THREE.CylinderGeometry(0.24, 0.32, 0.66, 8),
    detailPlate: new THREE.CylinderGeometry(0.075, 0.085, 0.026, 8),
    collar: new THREE.BoxGeometry(0.36, 0.055, 0.08),
    strap: new THREE.BoxGeometry(0.055, 0.62, 0.035),
    pouch: new THREE.BoxGeometry(0.2, 0.18, 0.09),
    cuff: new THREE.CylinderGeometry(0.068, 0.076, 0.045, 8),
    neck: new THREE.CylinderGeometry(0.075, 0.09, 0.13, 6),
    head: new THREE.DodecahedronGeometry(0.2, 0),
    hair: new THREE.DodecahedronGeometry(0.18, 0),
    eye: new THREE.SphereGeometry(0.018, 6, 4),
    upperArm: new THREE.CylinderGeometry(0.055, 0.073, 0.38, 8),
    forearm: new THREE.CylinderGeometry(0.05, 0.064, 0.34, 8),
    hand: new THREE.DodecahedronGeometry(0.068, 0),
    thigh: new THREE.CylinderGeometry(0.07, 0.092, 0.42, 8),
    shin: new THREE.CylinderGeometry(0.058, 0.074, 0.38, 8),
    foot: new THREE.DodecahedronGeometry(0.105, 0),
    gem: new THREE.DodecahedronGeometry(0.07, 0),
  };
}

function createMaterials(colors: CharacterColors): MaterialSet {
  return {
    tunic: material(colors.tunic),
    darkTunic: material(colors.darkTunic),
    trim: material(colors.trim),
    leather: material(colors.leather),
    boot: material(colors.boot),
    pants: material(colors.pants),
    skin: material(colors.skin),
    hair: material(colors.hair),
    eye: new THREE.MeshStandardMaterial({ color: "#1b1a15", roughness: 0.8, flatShading: true }),
  };
}

function addHead(
  head: THREE.Group,
  geometries: GeometrySet,
  materials: MaterialSet,
  silhouette: CharacterSilhouette,
  id: CharacterStyleId,
): void {
  const headMesh = mesh(geometries.head, materials.skin, "HeadMesh");
  headMesh.scale.set(0.92 * silhouette.headScale, 1.06 * silhouette.headScale, 0.94 * silhouette.headScale);
  head.add(headMesh);

  addHairStyle(head, geometries, materials, silhouette, id);

  [-1, 1].forEach((sideSign) => {
    const eye = mesh(geometries.eye, materials.eye, sideSign < 0 ? "LeftEye" : "RightEye");
    eye.position.set(sideSign * 0.055 * silhouette.headScale, 0.025 * silhouette.headScale, 0.18 * silhouette.headScale);
    eye.scale.set(1, 0.75, 0.72);
    head.add(eye);

    const brow = mesh(geometries.detailPlate, materials.hair, sideSign < 0 ? "LeftBrow" : "RightBrow");
    brow.position.set(sideSign * 0.055 * silhouette.headScale, 0.055 * silhouette.headScale, 0.185 * silhouette.headScale);
    brow.rotation.z = sideSign * -0.16;
    brow.scale.set(0.32 * silhouette.headScale, 0.14 * silhouette.headScale, 0.16 * silhouette.headScale);
    head.add(brow);
  });

  const nose = mesh(geometries.gem, materials.skin, "Nose");
  nose.position.set(0, -0.008 * silhouette.headScale, 0.2 * silhouette.headScale);
  nose.scale.set(0.34 * silhouette.headScale, 0.48 * silhouette.headScale, 0.28 * silhouette.headScale);
  head.add(nose);

  const mouth = mesh(geometries.detailPlate, materials.leather, "Mouth");
  mouth.position.set(0, -0.075 * silhouette.headScale, 0.187 * silhouette.headScale);
  mouth.rotation.x = Math.PI / 2;
  mouth.scale.set(0.42 * silhouette.headScale, 0.1 * silhouette.headScale, 0.1 * silhouette.headScale);
  head.add(mouth);
}

function addHairStyle(
  head: THREE.Group,
  geometries: GeometrySet,
  materials: MaterialSet,
  silhouette: CharacterSilhouette,
  id: CharacterStyleId,
): void {
  const s = silhouette.headScale;
  const top = mesh(geometries.hair, materials.hair, "HairTop");
  top.position.set(0, 0.13 * s, 0.035 * s);
  top.rotation.x = -0.04;
  head.add(top);

  const hairline = mesh(geometries.detailPlate, materials.hair, "FrontHairline");
  hairline.position.set(0, 0.08 * s, 0.18 * s);
  hairline.rotation.x = Math.PI / 2;
  hairline.scale.set(1.2 * s, 0.2 * s, 0.18 * s);
  head.add(hairline);

  if (id === "sentinel") {
    top.scale.set(1.06 * s, 0.34 * s, 0.84 * s);
    hairline.position.y = 0.07 * s;
    hairline.scale.set(1.12 * s, 0.18 * s, 0.16 * s);
    [-1, 1].forEach((sideSign) => {
      const side = mesh(geometries.hair, materials.hair, sideSign < 0 ? "LeftCroppedHair" : "RightCroppedHair");
      side.position.set(sideSign * 0.155 * s, -0.005 * s, 0.08 * s);
      side.scale.set(0.34 * s, 0.48 * s, 0.5 * s);
      head.add(side);
    });
    return;
  }

  if (id === "arcanist") {
    top.scale.set(0.96 * s, 0.42 * s, 0.78 * s);
    hairline.position.set(-0.012 * s, 0.088 * s, 0.185 * s);
    hairline.scale.set(1.02 * s, 0.22 * s, 0.2 * s);
    [-1, 1].forEach((sideSign) => {
      const lock = mesh(geometries.hair, materials.hair, sideSign < 0 ? "LeftLongHair" : "RightLongHair");
      lock.position.set(sideSign * 0.15 * s, -0.075 * s, 0.09 * s);
      lock.rotation.z = sideSign * 0.1;
      lock.scale.set(0.32 * s, 0.78 * s, 0.44 * s);
      head.add(lock);
    });
    const part = mesh(geometries.detailPlate, materials.skin, "HairPart");
    part.position.set(-0.06 * s, 0.17 * s, 0.135 * s);
    part.rotation.x = Math.PI / 2;
    part.rotation.z = 0.22;
    part.scale.set(0.1 * s, 0.46 * s, 0.08 * s);
    head.add(part);
    return;
  }

  if (id === "warden") {
    top.scale.set(1.0 * s, 0.38 * s, 0.76 * s);
    hairline.scale.set(1.08 * s, 0.22 * s, 0.18 * s);
    [-0.11, -0.025, 0.075].forEach((x, index) => {
      const tuft = mesh(geometries.gem, materials.hair, `MessyHair${index}`);
      tuft.position.set(x * s, 0.17 * s, 0.13 * s);
      tuft.rotation.z = (index - 1) * 0.34;
      tuft.rotation.x = 0.16;
      tuft.scale.set(0.52 * s, 0.76 * s, 0.5 * s);
      head.add(tuft);
    });
    return;
  }

  if (id === "duelist") {
    top.scale.set(0.98 * s, 0.38 * s, 0.76 * s);
    hairline.position.set(0.03 * s, 0.082 * s, 0.185 * s);
    hairline.scale.set(1.02 * s, 0.18 * s, 0.18 * s);
    const sweep = mesh(geometries.hair, materials.hair, "SidePartSweep");
    sweep.position.set(0.08 * s, 0.15 * s, 0.155 * s);
    sweep.rotation.z = -0.34;
    sweep.rotation.x = 0.08;
    sweep.scale.set(0.62 * s, 0.36 * s, 0.5 * s);
    head.add(sweep);
    const sideburn = mesh(geometries.hair, materials.hair, "SidePartSideburn");
    sideburn.position.set(-0.15 * s, -0.025 * s, 0.11 * s);
    sideburn.scale.set(0.24 * s, 0.52 * s, 0.36 * s);
    head.add(sideburn);
    return;
  }

  top.scale.set(0.96 * s, 0.38 * s, 0.78 * s);
  hairline.position.set(-0.02 * s, 0.086 * s, 0.185 * s);
  hairline.scale.set(1.02 * s, 0.2 * s, 0.18 * s);
  const front = mesh(geometries.hair, materials.hair, "SweptFrontHair");
  front.position.set(-0.058 * s, 0.145 * s, 0.16 * s);
  front.rotation.z = 0.28;
  front.rotation.x = 0.1;
  front.scale.set(0.56 * s, 0.36 * s, 0.46 * s);
  head.add(front);
}

function createArm(
  side: LimbSide,
  geometries: GeometrySet,
  materials: MaterialSet,
  silhouette: CharacterSilhouette,
): ArmRig {
  const sideSign = side === "left" ? -1 : 1;
  const shoulder = new THREE.Group();
  shoulder.name = `${side}Shoulder`;
  shoulder.position.set(sideSign * 0.3 * silhouette.shoulderWidth, 0.56, 0.02);
  shoulder.rotation.z = sideSign * 0.11;

  const upper = mesh(geometries.upperArm, materials.tunic, `${side}UpperArm`);
  upper.position.y = -0.19 * silhouette.armLength;
  upper.scale.set(0.82 * silhouette.limbWidth, silhouette.armLength, 0.82 * silhouette.limbWidth);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.name = `${side}Elbow`;
  elbow.position.y = -0.38 * silhouette.armLength;
  shoulder.add(elbow);

  const forearm = mesh(geometries.forearm, materials.darkTunic, `${side}Forearm`);
  forearm.position.y = -0.17 * silhouette.armLength;
  forearm.scale.set(0.8 * silhouette.limbWidth, silhouette.armLength, 0.8 * silhouette.limbWidth);
  elbow.add(forearm);

  const hand = new THREE.Group();
  hand.name = `${side}Hand`;
  hand.position.y = -0.36 * silhouette.armLength;
  elbow.add(hand);

  const cuff = mesh(geometries.cuff, materials.trim, `${side}WristCuff`);
  cuff.position.y = -0.31 * silhouette.armLength;
  cuff.scale.set(0.78 * silhouette.limbWidth, 0.82, 0.78 * silhouette.limbWidth);
  elbow.add(cuff);

  const handMesh = mesh(geometries.hand, materials.skin, `${side}HandMesh`);
  handMesh.scale.setScalar(0.82 * silhouette.limbWidth);
  hand.add(handMesh);

  return { shoulder, elbow, hand };
}

function createLeg(
  side: LimbSide,
  geometries: GeometrySet,
  materials: MaterialSet,
  silhouette: CharacterSilhouette,
): LegRig {
  const sideSign = side === "left" ? -1 : 1;
  const hip = new THREE.Group();
  hip.name = `${side}Hip`;
  hip.position.set(sideSign * 0.145 * silhouette.legSpacing, -0.04, 0.02);

  const thigh = mesh(geometries.thigh, materials.pants, `${side}Thigh`);
  thigh.position.y = -0.21 * silhouette.legLength;
  thigh.scale.set(0.9 * silhouette.limbWidth, silhouette.legLength, 0.9 * silhouette.limbWidth);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.name = `${side}Knee`;
  knee.position.y = -0.42 * silhouette.legLength;
  hip.add(knee);

  const shin = mesh(geometries.shin, materials.boot, `${side}Shin`);
  shin.position.y = -0.19 * silhouette.legLength;
  shin.scale.set(0.88 * silhouette.limbWidth, silhouette.legLength, 0.88 * silhouette.limbWidth);
  knee.add(shin);

  const ankle = new THREE.Group();
  ankle.name = `${side}Ankle`;
  const baseAnkleY = -0.39 * silhouette.legLength;
  ankle.position.set(0, baseAnkleY, 0.1);
  knee.add(ankle);

  const bootCuff = mesh(geometries.cuff, materials.leather, `${side}BootCuff`);
  bootCuff.position.y = -0.31 * silhouette.legLength;
  bootCuff.scale.set(0.9 * silhouette.limbWidth, 0.9, 0.9 * silhouette.limbWidth);
  knee.add(bootCuff);

  const footMesh = mesh(geometries.foot, materials.boot, `${side}FootMesh`);
  footMesh.position.set(0, 0.035, 0.07);
  footMesh.scale.set(0.72 * silhouette.footWidth, 0.32, 1.34);
  ankle.add(footMesh);

  return { hip, knee, ankle, baseAnkleY };
}

function animateLeg(leg: LegRig, phase: number, blend: number, runBlend: number): void {
  const stride = Math.sin(phase);
  const swingWeight = stride >= 0 ? smoothStep(stride) : 0;
  const contactWeight = stride < 0 ? smoothStep(-stride) : 0;
  const swingProgress = THREE.MathUtils.clamp((1 - Math.cos(phase)) * 0.5, 0, 1);
  const plantProgress = THREE.MathUtils.clamp((1 + Math.cos(phase)) * 0.5, 0, 1);
  const lift = Math.sin(swingProgress * Math.PI) * swingWeight;
  const easedBlend = smoothStep(blend);
  const runEase = smoothStep(runBlend);
  const strideAmplitude = 0.27 + runEase * 0.11;
  const swingZ = THREE.MathUtils.lerp(-0.025, 0.04 + runEase * 0.016, swingProgress);
  const plantedZ = THREE.MathUtils.lerp(0.03 + runEase * 0.01, -0.032 - runEase * 0.012, plantProgress);
  const ankleZ = stride >= 0 ? swingZ : plantedZ;
  const heelStrike = contactWeight * (1 - plantProgress);
  const toePush = contactWeight * plantProgress;

  leg.hip.rotation.x = (stride * strideAmplitude - contactWeight * 0.035) * easedBlend;
  leg.hip.rotation.y = stride * (0.018 + runEase * 0.014) * easedBlend;
  leg.hip.rotation.z = stride * (0.012 + runEase * 0.007) * easedBlend;
  leg.knee.rotation.x = (0.024 + lift * (0.32 + runEase * 0.13) + contactWeight * 0.052) * easedBlend;
  leg.knee.rotation.y = -stride * 0.008 * easedBlend;
  leg.ankle.position.y = leg.baseAnkleY + lift * (0.062 + runEase * 0.034) * easedBlend - contactWeight * 0.002 * easedBlend;
  leg.ankle.position.z = 0.1 + ankleZ * easedBlend;
  leg.ankle.rotation.x = (-lift * (0.18 + runEase * 0.08) + heelStrike * 0.12 - toePush * 0.09) * easedBlend;
  leg.ankle.rotation.z = -stride * (0.018 + runEase * 0.012) * easedBlend;
}

function animateArm(arm: ArmRig, phase: number, blend: number, runBlend: number, sideSign: number): void {
  const stride = Math.sin(phase);
  const followThrough = Math.sin(phase - 0.28);
  const easedBlend = smoothStep(blend);
  const runEase = smoothStep(runBlend);

  arm.shoulder.rotation.x = followThrough * (0.18 + runEase * 0.12) * easedBlend;
  arm.shoulder.rotation.z = sideSign * (0.1 + 0.018 * easedBlend + runEase * 0.025);
  arm.elbow.rotation.x = (-0.1 - Math.max(0, -stride) * (0.1 + runEase * 0.08)) * easedBlend;
  arm.elbow.rotation.z = sideSign * Math.max(0, stride) * (0.014 + runEase * 0.016) * easedBlend;
  arm.hand.rotation.x = -Math.max(0, -stride) * (0.035 + runEase * 0.03) * easedBlend;
  arm.hand.rotation.z = sideSign * stride * (0.024 + runEase * 0.022) * easedBlend;
}

function getSilhouette(id: CharacterStyleId): CharacterSilhouette {
  switch (id) {
    case "sentinel":
      return {
        shoulderWidth: 1.22,
        torsoWidth: 1.12,
        torsoHeight: 1.02,
        torsoDepth: 1.08,
        hipWidth: 1.1,
        legSpacing: 1.16,
        armLength: 1,
        legLength: 0.98,
        limbWidth: 1.14,
        footWidth: 1.14,
        headScale: 1.02,
      };
    case "arcanist":
      return {
        shoulderWidth: 0.92,
        torsoWidth: 0.9,
        torsoHeight: 1.12,
        torsoDepth: 0.92,
        hipWidth: 0.94,
        legSpacing: 0.94,
        armLength: 1.06,
        legLength: 1.04,
        limbWidth: 0.92,
        footWidth: 0.94,
        headScale: 1,
      };
    case "warden":
      return {
        shoulderWidth: 1.06,
        torsoWidth: 1,
        torsoHeight: 0.98,
        torsoDepth: 1,
        hipWidth: 1.04,
        legSpacing: 1.04,
        armLength: 1,
        legLength: 1,
        limbWidth: 1.08,
        footWidth: 1.1,
        headScale: 0.98,
      };
    case "duelist":
      return {
        shoulderWidth: 0.96,
        torsoWidth: 0.94,
        torsoHeight: 1.02,
        torsoDepth: 0.92,
        hipWidth: 0.9,
        legSpacing: 0.9,
        armLength: 1.04,
        legLength: 1.05,
        limbWidth: 0.9,
        footWidth: 0.9,
        headScale: 0.96,
      };
    case "pathfinder":
    default:
      return {
        shoulderWidth: 1,
        torsoWidth: 1,
        torsoHeight: 1,
        torsoDepth: 1,
        hipWidth: 1,
        legSpacing: 1,
        armLength: 1,
        legLength: 1,
        limbWidth: 1,
        footWidth: 1,
        headScale: 1,
      };
  }
}

function resolveColors(preset: CharacterPreset, colorVariant: CharacterColorVariant): CharacterColors {
  return {
    ...preset.colors,
    ...colorVariant.colors,
  };
}

function baseColors(tunic: string, darkTunic: string, trim: string, pants: string): CharacterColors {
  return {
    tunic,
    darkTunic,
    trim,
    leather: "#60412a",
    boot: "#34261d",
    pants,
    skin: "#deb176",
    hair: "#35271e",
  };
}

function mesh(geometry: THREE.BufferGeometry, materialValue: THREE.Material, name: string): THREE.Mesh {
  const result = new THREE.Mesh(geometry, materialValue);
  result.name = name;
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

function material(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
}

function dampAngle(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-smoothing * deltaSeconds));
}

function smoothStep(value: number): number {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}
