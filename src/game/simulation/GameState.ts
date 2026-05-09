import * as THREE from "three";
import { worldColliders, type WorldCollider } from "../content/worldProps";
import { worldProps, type WorldProp, type WorldPropKind } from "../content/worldProps";
import { biomeAt, OPENING_PATH_START_Z, pathCenterX, type BiomeId, WORLD_SIZE } from "../content/worldMap";

export type ResourceKind = "wood" | "stone" | "herb" | "coin";
export type EnemyKind = "trailGuardian" | "boar" | "stoneSentinel" | "reedWisp";
export type HotbarSlot = "hands" | "tool" | "build" | "attack" | "pack";
export type ToolMotion = "hands" | "pick" | "axe" | "sword" | "build";
export type TutorialStage =
  | "wakeInCove"
  | "walkToGuide"
  | "intro"
  | "gatherWood"
  | "returnWood"
  | "craftPickaxe"
  | "mineStone"
  | "returnStone"
  | "buildShelter"
  | "practiceSwing"
  | "gatherHerbs"
  | "returnHerbs"
  | "buildCampfire"
  | "craftAxe"
  | "fellTree"
  | "returnTree"
  | "repairBridge"
  | "clearGuardian"
  | "returnGuardian"
  | "firstCampReady";

export const GUIDE_NPC_POSITION = { x: -6.35, z: -0.55 } as const;
const START_SPAWN_Z = OPENING_PATH_START_Z + 1.15;
const START_SPAWN_X = pathCenterX(START_SPAWN_Z);

export type DialogueRequest = {
  id: number;
  speaker: string;
  lines: string[];
};

export type HarvestEvent = {
  id: number;
  nodeId: string;
  kind: WorldPropKind;
  resource: ResourceKind | "lore";
  x: number;
  z: number;
  final: boolean;
  hitIndex: number;
  totalHits: number;
  amount: number;
};

export type ResourceNode = {
  id: string;
  kind: WorldPropKind;
  x: number;
  z: number;
  radius: number;
  active: boolean;
  resource: ResourceKind | "lore" | "craft";
  amount: number;
  actionLabel: string;
  hitsRemaining: number;
  maxHits: number;
};

export type EnemyState = {
  id: string;
  kind: EnemyKind;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spawn: THREE.Vector3;
  health: number;
  maxHealth: number;
  radius: number;
  attackCooldown: number;
  hurtFlash: number;
  defeated: boolean;
};

export type BuildingState = {
  id: string;
  kind: "cabin" | "campfire" | "bridge";
  position: THREE.Vector3;
  rotation: number;
};

export type GameState = {
  player: {
    position: THREE.Vector3;
    spawn: THREE.Vector3;
    velocity: THREE.Vector3;
    distanceWalked: number;
    radius: number;
    baseSpeed: number;
    sprintSpeed: number;
    stamina: number;
    maxStamina: number;
    sprinting: boolean;
    staminaVisibleTimer: number;
    health: number;
    maxHealth: number;
    invulnerable: number;
    facingYaw: number;
  };
  world: {
    halfSize: number;
    currentBiome: BiomeId;
    colliders: WorldCollider[];
    resourceNodes: ResourceNode[];
    enemies: EnemyState[];
    buildings: BuildingState[];
  };
  resources: Record<ResourceKind, number>;
  ui: {
    inventoryOpen: boolean;
    selectedSlot: HotbarSlot;
  };
  quest: {
    tutorialStage: TutorialStage;
    woodTarget: number;
    stoneTarget: number;
    herbTarget: number;
    woodGathered: boolean;
    woodDelivered: boolean;
    stoneGathered: boolean;
    stoneDelivered: boolean;
    herbsGathered: boolean;
    herbsDelivered: boolean;
    pickaxeCrafted: boolean;
    axeCrafted: boolean;
    cabinBuilt: boolean;
    campfireBuilt: boolean;
    treeChopped: boolean;
    bridgeRepaired: boolean;
    attackPracticed: boolean;
    enemyDefeated: boolean;
    combatUnlocked: boolean;
    campLevel: number;
    toolLevel: number;
    currentObjective: string;
    checklist: Array<{ label: string; complete: boolean }>;
  };
  action: {
    prompt: string;
    message: string;
    messageTimer: number;
    attackCooldown: number;
    interactCooldown: number;
    buildCooldown: number;
    attackPulse: number;
    gatherPulse: number;
    harvestingNodeId: string;
    harvestingTimer: number;
    harvestingDuration: number;
    toolMotion: ToolMotion;
    harvestEvents: HarvestEvent[];
    dialogueRequest: DialogueRequest;
    chapterCueTitle: string;
    chapterCueText: string;
    chapterCueTimer: number;
  };
};

export function createGameState(): GameState {
  return {
    player: {
      position: new THREE.Vector3(START_SPAWN_X, 0.38, START_SPAWN_Z),
      spawn: new THREE.Vector3(START_SPAWN_X, 0.38, START_SPAWN_Z),
      velocity: new THREE.Vector3(),
      distanceWalked: 0,
      radius: 0.38,
      baseSpeed: 4.2,
      sprintSpeed: 6.4,
      stamina: 100,
      maxStamina: 100,
      sprinting: false,
      staminaVisibleTimer: 0,
      health: 6,
      maxHealth: 6,
      invulnerable: 0,
      facingYaw: 0,
    },
    world: {
      halfSize: WORLD_SIZE / 2,
      currentBiome: biomeAt(START_SPAWN_X, START_SPAWN_Z),
      colliders: [
        ...worldColliders,
        { type: "circle", x: GUIDE_NPC_POSITION.x, z: GUIDE_NPC_POSITION.z, radius: 0.34 },
      ],
      resourceNodes: createResourceNodes(),
      enemies: createEnemies(),
      buildings: [],
    },
    resources: {
      wood: 0,
      stone: 0,
      herb: 0,
      coin: 0,
    },
    ui: {
      inventoryOpen: false,
      selectedSlot: "hands",
    },
    quest: {
      tutorialStage: "wakeInCove",
      woodTarget: 5,
      stoneTarget: 3,
      herbTarget: 3,
      woodGathered: false,
      woodDelivered: false,
      stoneGathered: false,
      stoneDelivered: false,
      herbsGathered: false,
      herbsDelivered: false,
      pickaxeCrafted: false,
      axeCrafted: false,
      cabinBuilt: false,
      campfireBuilt: false,
      treeChopped: false,
      bridgeRepaired: false,
      attackPracticed: false,
      enemyDefeated: false,
      combatUnlocked: false,
      campLevel: 0,
      toolLevel: 0,
      currentObjective: "Walk out of the cove.",
      checklist: [],
    },
    action: {
      prompt: "",
      message: "",
      messageTimer: 0,
      attackCooldown: 0,
      interactCooldown: 0,
      buildCooldown: 0,
      attackPulse: 0,
      gatherPulse: 0,
      harvestingNodeId: "",
      harvestingTimer: 0,
      harvestingDuration: 0,
      toolMotion: "hands",
      harvestEvents: [],
      dialogueRequest: {
        id: 0,
        speaker: "",
        lines: [],
      },
      chapterCueTitle: "",
      chapterCueText: "",
      chapterCueTimer: 0,
    },
  };
}

export function requestDialogue(state: GameState, speaker: string, lines: string[]): void {
  state.action.dialogueRequest = {
    id: state.action.dialogueRequest.id + 1,
    speaker,
    lines,
  };
}

function createResourceNodes(): ResourceNode[] {
  return worldProps.flatMap((prop, index) => {
    const spec = resourceSpecForProp(prop);
    if (!spec) return [];

    const maxHits = hitsForProp(prop);

    return [{
      id: `${prop.kind}-${index}`,
      kind: prop.kind,
      x: prop.x,
      z: prop.z,
      radius: Math.max(0.8, prop.radius + 0.55),
      active: true,
      resource: spec.resource,
      amount: spec.amount,
      actionLabel: spec.actionLabel,
      hitsRemaining: maxHits,
      maxHits,
    }];
  });
}

function hitsForProp(prop: WorldProp): number {
  switch (prop.kind) {
    case "pine":
    case "oak":
    case "birch":
    case "willow":
      return 5;
    case "boulder":
      return 4;
    case "ore":
    case "ruin":
    case "shrine":
    case "pillar":
    case "runestone":
      return 3;
    case "log":
      return 1;
    case "stump":
    case "rock":
    case "crate":
    case "barrel":
    case "haystack":
      return 2;
    default:
      return 1;
  }
}

function resourceSpecForProp(prop: WorldProp): Pick<ResourceNode, "resource" | "amount" | "actionLabel"> | undefined {
  switch (prop.kind) {
    case "pine":
    case "oak":
    case "birch":
    case "willow":
      return { resource: "wood", amount: 3, actionLabel: "Chop tree" };
    case "log":
      return { resource: "wood", amount: 2, actionLabel: "Pick up wood" };
    case "stump":
      return { resource: "wood", amount: 1, actionLabel: "Break stump" };
    case "rock":
    case "ore":
    case "ruin":
    case "boulder":
    case "crystal":
    case "pillar":
    case "shrine":
    case "runestone":
      return { resource: "stone", amount: prop.kind === "ore" || prop.kind === "boulder" ? 2 : 1, actionLabel: "Mine stone" };
    case "flower":
    case "bush":
    case "farm":
    case "fern":
    case "reed":
    case "mushroom":
      return { resource: "herb", amount: prop.kind === "farm" ? 2 : 1, actionLabel: "Gather herbs" };
    case "chest":
      return { resource: "coin", amount: 8, actionLabel: "Open cache" };
    case "workbench":
      return { resource: "craft", amount: 0, actionLabel: "Use workbench" };
    case "marker":
    case "totem":
    case "well":
      return { resource: "lore", amount: 0, actionLabel: "Inspect" };
    case "house":
    case "bridge":
    case "dock":
    case "campTent":
    case "campfire":
    case "fence":
    case "barrel":
    case "crate":
    case "haystack":
    case "torch":
      return undefined;
  }
}

function createEnemies(): EnemyState[] {
  return [
    makeEnemy("trail-guardian-a", 13.8, -18.5, "trailGuardian", 3, 0.48),
    makeEnemy("trail-guardian-b", 21.6, -27.4, "trailGuardian", 3, 0.48),
    makeEnemy("trail-guardian-c", -22.8, 31.6, "trailGuardian", 3, 0.48),
    makeEnemy("forest-boar-a", -30.5, -86.2, "boar", 4, 0.54),
    makeEnemy("forest-boar-b", -14.4, -103.5, "boar", 4, 0.54),
    makeEnemy("highland-sentinel-a", 88.4, 65.2, "stoneSentinel", 5, 0.62),
    makeEnemy("highland-sentinel-b", 116.8, 112.2, "stoneSentinel", 5, 0.62),
    makeEnemy("wetland-wisp-a", -104.4, 90.8, "reedWisp", 3, 0.42),
    makeEnemy("wetland-wisp-b", -62.2, 121.5, "reedWisp", 3, 0.42),
  ];
}

function makeEnemy(id: string, x: number, z: number, kind: EnemyKind, maxHealth: number, radius: number): EnemyState {
  return {
    id,
    kind,
    position: new THREE.Vector3(x, 0, z),
    velocity: new THREE.Vector3(),
    spawn: new THREE.Vector3(x, 0, z),
    health: maxHealth,
    maxHealth,
    radius,
    attackCooldown: 0,
    hurtFlash: 0,
    defeated: false,
  };
}
