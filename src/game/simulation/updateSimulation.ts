import type { InputVector } from "../input/InputController";
import { GUIDE_NPC_POSITION, requestDialogue, type EnemyState, type GameState, type HotbarSlot, type ResourceNode, type ToolMotion } from "./GameState";
import type { WorldCollider } from "../content/worldProps";
import { biomeAt, biomeLabel } from "../content/worldMap";

export function updateSimulation(state: GameState, input: InputVector, deltaSeconds: number): void {
  tickTimers(state, deltaSeconds);

  const inputMagnitude = Math.hypot(input.x, input.z);
  const wantsSprint = input.sprint && inputMagnitude > 0.01 && state.player.stamina > 1;
  const targetSpeed = wantsSprint ? state.player.sprintSpeed : state.player.baseSpeed;
  const targetX = input.x * targetSpeed;
  const targetZ = input.z * targetSpeed;
  const damping = 1 - Math.exp(-18 * deltaSeconds);

  state.player.sprinting = wantsSprint;
  if (wantsSprint) {
    state.player.stamina = clamp(state.player.stamina - 26 * deltaSeconds, 0, state.player.maxStamina);
    state.player.staminaVisibleTimer = 1.15;
  } else {
    const recovery = inputMagnitude > 0.01 ? 15 : 24;
    state.player.stamina = clamp(state.player.stamina + recovery * deltaSeconds, 0, state.player.maxStamina);
    if (state.player.stamina < state.player.maxStamina) {
      state.player.staminaVisibleTimer = Math.max(state.player.staminaVisibleTimer, 0.45);
    }
  }

  state.player.velocity.x += (targetX - state.player.velocity.x) * damping;
  state.player.velocity.z += (targetZ - state.player.velocity.z) * damping;

  const previousX = state.player.position.x;
  const previousZ = state.player.position.z;
  state.player.position.x += state.player.velocity.x * deltaSeconds;
  state.player.position.z += state.player.velocity.z * deltaSeconds;
  state.player.distanceWalked += Math.hypot(state.player.position.x - previousX, state.player.position.z - previousZ);
  updateOpeningWalk(state);
  if (state.player.velocity.lengthSq() > 0.01) {
    state.player.facingYaw = Math.atan2(state.player.velocity.x, state.player.velocity.z);
  }

  resolveWorldCollisions(state);

  const limit = state.world.halfSize - state.player.radius;
  state.player.position.x = Math.max(-limit, Math.min(limit, state.player.position.x));
  state.player.position.z = Math.max(-limit, Math.min(limit, state.player.position.z));
  updateTimedHarvest(state);

  handlePlayerActions(state, input);
  updateEnemies(state, deltaSeconds);
  updateBiomeContext(state);
  updateQuest(state);
}

function tickTimers(state: GameState, deltaSeconds: number): void {
  state.action.attackCooldown = Math.max(0, state.action.attackCooldown - deltaSeconds);
  state.action.interactCooldown = Math.max(0, state.action.interactCooldown - deltaSeconds);
  state.action.buildCooldown = Math.max(0, state.action.buildCooldown - deltaSeconds);
  state.action.attackPulse = Math.max(0, state.action.attackPulse - deltaSeconds);
  state.action.gatherPulse = Math.max(0, state.action.gatherPulse - deltaSeconds);
  state.action.harvestingTimer = Math.max(0, state.action.harvestingTimer - deltaSeconds);
  state.action.messageTimer = Math.max(0, state.action.messageTimer - deltaSeconds);
  state.action.chapterCueTimer = Math.max(0, state.action.chapterCueTimer - deltaSeconds);
  state.player.invulnerable = Math.max(0, state.player.invulnerable - deltaSeconds);
  state.player.staminaVisibleTimer = Math.max(0, state.player.staminaVisibleTimer - deltaSeconds);
  state.world.enemies.forEach((enemy) => {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - deltaSeconds);
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - deltaSeconds);
  });
}

function handlePlayerActions(state: GameState, input: InputVector): void {
  if (input.selectedSlot !== undefined) {
    selectHotbarSlot(state, input.selectedSlot);
  }

  const nearestNode = findNearestResourceNode(state);
  const nearestEnemy = findNearestEnemy(state, 2.05);
  const guideNearby = isGuideNearby(state);

  if (state.action.harvestingNodeId) {
    state.action.prompt = "Working";
  } else if (nearestEnemy && state.quest.combatUnlocked) {
    state.action.prompt = "Space Attack";
  } else if (guideNearby && state.quest.tutorialStage !== "wakeInCove") {
    state.action.prompt = "E Talk";
  } else if (nearestNode && state.quest.tutorialStage !== "wakeInCove" && state.quest.tutorialStage !== "walkToGuide" && state.quest.tutorialStage !== "intro") {
    const hits = nearestNode.hitsRemaining > 1 ? ` ${nearestNode.maxHits - nearestNode.hitsRemaining + 1}/${nearestNode.maxHits}` : "";
    state.action.prompt = `E ${nearestNode.actionLabel}${hits}`;
  } else if (canBuildCurrentCampStructure(state)) {
    state.action.prompt = state.quest.tutorialStage === "buildCampfire" ? "B Build campfire" : "B Build shelter";
  } else {
    state.action.prompt = "";
  }

  if (state.action.harvestingNodeId) return;

  if (input.attack && state.action.attackCooldown <= 0) {
    state.ui.selectedSlot = "attack";
    performAttack(state);
  }

  if (input.interact && state.action.interactCooldown <= 0) {
    state.action.interactCooldown = 0.42;
    if (guideNearby && state.quest.tutorialStage !== "wakeInCove") {
      talkToGuide(state);
    } else if (nearestNode) {
      useResourceNode(state, nearestNode);
    } else if (state.quest.tutorialStage === "wakeInCove") {
      showMessage(state, "Keep moving up the only open path.");
    } else if (state.quest.tutorialStage === "walkToGuide") {
      showMessage(state, "Follow the path until you reach Edda.");
    } else {
      showMessage(state, "Move close to Edda, fallen wood, stones, or the workbench.");
    }
  }

  if (input.build && state.action.buildCooldown <= 0) {
    state.ui.selectedSlot = "build";
    state.action.buildCooldown = 0.55;
    buildCampStructure(state);
  }

  if (input.inventory && state.action.interactCooldown <= 0) {
    state.ui.selectedSlot = "pack";
    state.action.interactCooldown = 0.55;
    if (!canOpenPack(state)) {
      showMessage(state, "Your pack is still empty.");
      return;
    }
    state.ui.inventoryOpen = !state.ui.inventoryOpen;
    showMessage(state, state.ui.inventoryOpen ? "Pack opened." : "Pack closed.");
  }
}

function selectHotbarSlot(state: GameState, slotNumber: number): void {
  const slot = slotFromNumber(slotNumber);
  if (!slot) return;

  if (!isSlotUnlocked(state, slot)) {
    state.ui.selectedSlot = "hands";
    showMessage(state, `${slotLabel(slot)} is not ready yet. Follow the next step first.`);
    return;
  }

  state.ui.selectedSlot = slot;
  showMessage(state, `${slotLabel(slot)} selected.`);
}

function slotFromNumber(slotNumber: number): HotbarSlot | undefined {
  return (["hands", "tool", "build", "attack", "pack"] as const)[slotNumber - 1];
}

function isSlotUnlocked(state: GameState, slot: HotbarSlot): boolean {
  switch (slot) {
    case "hands":
      return state.quest.tutorialStage !== "wakeInCove";
    case "tool":
      return state.quest.pickaxeCrafted;
    case "build":
      return state.quest.cabinBuilt || state.quest.tutorialStage === "buildShelter" || state.quest.tutorialStage === "buildCampfire";
    case "attack":
      return state.quest.tutorialStage === "practiceSwing" || state.quest.combatUnlocked;
    case "pack":
      return canOpenPack(state);
  }
}

function slotLabel(slot: HotbarSlot): string {
  switch (slot) {
    case "hands":
      return "Hands";
    case "tool":
      return "Tool";
    case "build":
      return "Build";
    case "attack":
      return "Sword";
    case "pack":
      return "Pack";
  }
}

function updateOpeningWalk(state: GameState): void {
  if (state.quest.tutorialStage !== "wakeInCove" || state.player.distanceWalked < 4.5) return;

  state.quest.tutorialStage = "walkToGuide";
  showMessage(state, "A ridge camp sits ahead.");
  state.action.chapterCueTitle = "";
  state.action.chapterCueText = "";
  state.action.chapterCueTimer = 0;
}

function performAttack(state: GameState): void {
  state.action.attackCooldown = 0.54;
  state.action.attackPulse = 0.34;
  state.action.toolMotion = "sword";
  state.quest.attackPracticed = true;

  if (state.quest.tutorialStage === "practiceSwing") {
    state.quest.tutorialStage = "gatherHerbs";
    showMessage(state, "Swing checked. Edda wants three herbs next.");
    requestDialogue(state, "Edda", [
      "Good. That swing had a beginning, a strike, and an end. That matters more than speed.",
      "A wild trail punishes panic. If your feet chase the sword, you lose the ground.",
      "From now on, every tool has a rhythm: pick up, wind up, strike, recover, read the world again.",
      "Before the lower trail opens, gather three valley herbs from the path edge.",
      "The pale flowers are not treasure. They are proof that you can notice small things while moving.",
      "We will light a small campfire after that. A warm camp tells travelers they can return.",
    ]);
    return;
  }

  if (!state.quest.combatUnlocked) {
    showMessage(state, "Edda will call for weapon practice when the camp is set.");
    return;
  }

  const enemy = findNearestEnemy(state, 2.25);

  if (!enemy) {
    showMessage(state, "Step into range before you swing.");
    return;
  }

  const forwardX = Math.sin(state.player.facingYaw);
  const forwardZ = Math.cos(state.player.facingYaw);
  enemy.health -= 1;
  enemy.hurtFlash = 0.18;
  enemy.velocity.x += forwardX * 5.6;
  enemy.velocity.z += forwardZ * 5.6;
  enemy.position.x += forwardX * 0.42;
  enemy.position.z += forwardZ * 0.42;

  if (enemy.health <= 0) {
    enemy.defeated = true;
    state.resources.coin += 3;
    state.quest.enemyDefeated = true;
    showMessage(state, "Guardian defeated. You recovered 3 coins.");
  } else {
    showMessage(state, "Hit landed.");
  }
}

function updateTimedHarvest(state: GameState): void {
  if (!state.action.harvestingNodeId) return;

  const node = state.world.resourceNodes.find((item) => item.id === state.action.harvestingNodeId);
  if (!node || !node.active) {
    clearHarvestAction(state);
    return;
  }

  const distance = Math.hypot(state.player.position.x - node.x, state.player.position.z - node.z);
  if (distance > node.radius + 0.95) {
    clearHarvestAction(state);
    showMessage(state, "Action cancelled.");
    return;
  }

  if (state.action.harvestingTimer > 0) return;

  clearHarvestAction(state);
  finishResourceNodeUse(state, node);
}

function clearHarvestAction(state: GameState): void {
  state.action.harvestingNodeId = "";
  state.action.harvestingTimer = 0;
  state.action.harvestingDuration = 0;
}

function useResourceNode(state: GameState, node: ResourceNode): void {
  if (!node.active) return;
  if (state.action.harvestingNodeId) return;

  if (node.resource === "craft") {
    if (state.quest.tutorialStage !== "craftPickaxe" || state.quest.pickaxeCrafted) {
      showMessage(state, state.quest.pickaxeCrafted ? "The wooden pick is ready." : "Edda will show you what to make first.");
      return;
    }

    if (state.resources.wood < 3) {
      showMessage(state, "A wooden pick needs 3 wood.");
      return;
    }

    state.resources.wood -= 3;
    state.action.gatherPulse = 0.42;
    state.quest.pickaxeCrafted = true;
    state.quest.toolLevel = Math.max(state.quest.toolLevel, 1);
    state.quest.tutorialStage = "mineStone";
    showMessage(state, "Wooden pick crafted.");
    requestDialogue(state, "Edda", [
      "Good. Now the small grey stones along the bend will give way.",
      "Bring me three pieces of stone. After that, the camp can start to grow.",
    ]);
    return;
  }

  if (node.resource === "lore") {
    showMessage(state, "Old trail note: the valley starts slowly, one useful task at a time.");
    node.active = false;
    pushHarvestEvent(state, node);
    return;
  }

  if (node.resource === "wood" && (state.quest.tutorialStage === "wakeInCove" || state.quest.tutorialStage === "walkToGuide" || state.quest.tutorialStage === "intro")) {
    showMessage(state, state.quest.tutorialStage === "wakeInCove" ? "The path comes first." : "Meet Edda at the ridge first.");
    return;
  }

  if (node.resource === "stone" && !state.quest.pickaxeCrafted) {
    showMessage(state, "The stone is too hard. Craft a wooden pick first.");
    return;
  }

  if (node.resource === "herb" && state.quest.tutorialStage !== "gatherHerbs" && !state.quest.herbsDelivered) {
    showMessage(state, "Leave the herbs for now. Edda will explain them after weapon practice.");
    return;
  }

  if (isTreeNode(node) && !canChopTrees(state)) {
    showMessage(state, "You need an axe before a living tree can be felled. Use fallen wood first.");
    return;
  }

  const duration = harvestDurationForNode(node);
  state.action.toolMotion = toolMotionForNode(node);
  state.action.harvestingNodeId = node.id;
  state.action.harvestingTimer = duration;
  state.action.harvestingDuration = duration;
  state.action.gatherPulse = Math.max(state.action.gatherPulse, duration);
  showMessage(state, harvestStartMessage(node));
}

function toolMotionForNode(node: ResourceNode): ToolMotion {
  if (node.kind === "rock" || node.kind === "ore" || node.kind === "boulder" || node.kind === "crystal") return "pick";
  if (isTreeNode(node) || node.kind === "stump") return "axe";
  return "hands";
}

function finishResourceNodeUse(state: GameState, node: ResourceNode): void {
  node.hitsRemaining = Math.max(0, node.hitsRemaining - 1);
  state.action.gatherPulse = Math.max(state.action.gatherPulse, 0.34);
  const finished = node.hitsRemaining <= 0;
  pushHarvestEvent(state, node, finished);

  if (!finished) {
    showMessage(state, `${node.actionLabel}: ${node.hitsRemaining} good hit${node.hitsRemaining === 1 ? "" : "s"} left.`);
    return;
  }

  node.active = false;
  if (!isResourceKind(node.resource)) return;
  state.resources[node.resource] += node.amount;

  if (node.resource === "wood" && state.resources.wood >= state.quest.woodTarget) {
    state.quest.woodGathered = true;
    if (state.quest.tutorialStage === "gatherWood") {
      state.quest.tutorialStage = "returnWood";
      showMessage(state, "Wood ready. Return to Edda.");
      return;
    }
  }

  if (node.resource === "stone" && state.resources.stone >= state.quest.stoneTarget) {
    state.quest.stoneGathered = true;
    if (state.quest.tutorialStage === "mineStone") {
      state.quest.tutorialStage = "returnStone";
      showMessage(state, "Stone ready. Return to Edda.");
      return;
    }
  }

  if (node.resource === "herb" && state.resources.herb >= state.quest.herbTarget) {
    state.quest.herbsGathered = true;
    if (state.quest.tutorialStage === "gatherHerbs") {
      state.quest.tutorialStage = "returnHerbs";
      showMessage(state, "Herbs ready. Return to Edda.");
      return;
    }
  }

  const label = node.resource === "coin" ? "coins" : node.resource;
  showMessage(state, `Collected ${node.amount} ${label}.`);
}

function isTreeNode(node: ResourceNode): boolean {
  return node.kind === "pine" || node.kind === "oak" || node.kind === "birch" || node.kind === "willow";
}

function isResourceKind(resource: ResourceNode["resource"]): resource is keyof GameState["resources"] {
  return resource === "wood" || resource === "stone" || resource === "herb" || resource === "coin";
}

function canChopTrees(state: GameState): boolean {
  return state.quest.toolLevel >= 2;
}

function harvestDurationForNode(node: ResourceNode): number {
  switch (node.kind) {
    case "log":
    case "flower":
    case "bush":
    case "fern":
    case "reed":
    case "mushroom":
      return 0.32;
    case "rock":
    case "stump":
      return 0.62;
    case "ore":
    case "boulder":
    case "crystal":
      return 0.82;
    case "pine":
    case "oak":
    case "birch":
    case "willow":
      return 1.05;
    default:
      return 0.48;
  }
}

function harvestStartMessage(node: ResourceNode): string {
  if (node.kind === "log") return "Picking up fallen wood...";
  if (node.kind === "rock" || node.kind === "ore" || node.kind === "boulder") return "Mining...";
  if (node.kind === "flower" || node.kind === "bush" || node.kind === "fern") return "Gathering...";
  if (isTreeNode(node)) return "Chopping...";
  return "Working...";
}

function pushHarvestEvent(state: GameState, node: ResourceNode, final = true): void {
  if (node.resource === "craft") return;

  state.action.harvestEvents.push({
    id: state.action.harvestEvents.length + 1,
    nodeId: node.id,
    kind: node.kind,
    resource: node.resource,
    x: node.x,
    z: node.z,
    final,
    hitIndex: node.maxHits - node.hitsRemaining,
    totalHits: node.maxHits,
    amount: final && isResourceKind(node.resource) ? node.amount : 0,
  });
}

function buildCampStructure(state: GameState): void {
  if (state.quest.tutorialStage === "buildCampfire") {
    buildCampfire(state);
    return;
  }

  if (!canBuildShelter(state)) {
    showMessage(state, state.quest.tutorialStage === "buildShelter" ? "Shelter needs 2 wood and 1 stone." : "Edda will show where to build first.");
    return;
  }

  const forwardX = Math.sin(state.player.facingYaw);
  const forwardZ = Math.cos(state.player.facingYaw);
  const x = state.player.position.x + forwardX * 2.2;
  const z = state.player.position.z + forwardZ * 2.2;

  state.resources.wood -= 2;
  state.resources.stone -= 1;
  state.action.toolMotion = "build";
  state.world.buildings.push({
    id: `cabin-${state.world.buildings.length + 1}`,
    kind: "cabin",
    position: state.player.position.clone().set(x, 0, z),
    rotation: state.player.facingYaw + Math.PI,
  });
  state.world.colliders.push({ type: "circle", x, z, radius: 0.9 });
  state.quest.cabinBuilt = true;
  state.quest.campLevel = Math.max(state.quest.campLevel, 1);
  state.quest.tutorialStage = "practiceSwing";
  showMessage(state, "Shelter placed.");
  requestDialogue(state, "Edda", [
    "That gives the camp a center. Not a city yet. Just a place the valley can remember.",
    "The first rule of building out here is simple: never build so much that you stop seeing the path.",
    "A roof means rest. A camp means return. Return means you can risk going farther.",
    "Before the trail opens, practice one clean swing. Just one. Feet forward, weight low.",
    "You are not trying to look heroic. You are trying to stay balanced when the world pushes back.",
  ]);
}

function buildCampfire(state: GameState): void {
  if (!canBuildCampfire(state)) {
    showMessage(state, "Build campfire needs 2 wood, 1 stone, and 1 herb.");
    return;
  }

  const forwardX = Math.sin(state.player.facingYaw);
  const forwardZ = Math.cos(state.player.facingYaw);
  const x = state.player.position.x + forwardX * 1.8;
  const z = state.player.position.z + forwardZ * 1.8;

  state.resources.wood -= 2;
  state.resources.stone -= 1;
  state.resources.herb -= 1;
  state.action.toolMotion = "build";
  state.world.buildings.push({
    id: `campfire-${state.world.buildings.length + 1}`,
    kind: "campfire",
    position: state.player.position.clone().set(x, 0, z),
    rotation: state.player.facingYaw + Math.PI,
  });
  state.world.colliders.push({ type: "circle", x, z, radius: 0.42 });
  state.quest.campfireBuilt = true;
  state.quest.campLevel = Math.max(state.quest.campLevel, 2);
  state.quest.tutorialStage = "firstCampReady";
  state.quest.combatUnlocked = true;
  showMessage(state, "Campfire lit. The lower trail is open.");
  requestDialogue(state, "Edda", [
    "Now the camp has smoke, shelter, tools, and a reason to return.",
    "That is the difference between wandering and exploring: a place behind you that still matters.",
    "The lower trail is open. You can follow it, ignore it, circle the rocks, or come back with better tools.",
    "Fight only when you choose the angle. Gather when the path offers something useful. Build when the land asks for a mark.",
    "If the valley feels quiet, good. Quiet means you can hear what changed.",
  ]);
}

function canBuildShelter(state: GameState): boolean {
  return state.quest.tutorialStage === "buildShelter" && state.resources.wood >= 2 && state.resources.stone >= 1;
}

function canBuildCampfire(state: GameState): boolean {
  return state.quest.tutorialStage === "buildCampfire" && state.resources.wood >= 2 && state.resources.stone >= 1 && state.resources.herb >= 1;
}

function canBuildCurrentCampStructure(state: GameState): boolean {
  return canBuildShelter(state) || canBuildCampfire(state);
}

function findNearestResourceNode(state: GameState): ResourceNode | undefined {
  let nearest: ResourceNode | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  state.world.resourceNodes.forEach((node) => {
    if (!node.active && node.resource !== "craft") return;
    const dx = state.player.position.x - node.x;
    const dz = state.player.position.z - node.z;
    const distance = Math.hypot(dx, dz);
    if (distance < node.radius && distance < bestDistance) {
      nearest = node;
      bestDistance = distance;
    }
  });

  return nearest;
}

function findNearestEnemy(state: GameState, range: number): EnemyState | undefined {
  if (!state.quest.combatUnlocked) return undefined;

  let nearest: EnemyState | undefined;
  let bestDistance = range;

  state.world.enemies.forEach((enemy) => {
    if (enemy.defeated) return;
    const distance = Math.hypot(state.player.position.x - enemy.position.x, state.player.position.z - enemy.position.z);
    if (distance < bestDistance) {
      nearest = enemy;
      bestDistance = distance;
    }
  });

  return nearest;
}

function updateEnemies(state: GameState, deltaSeconds: number): void {
  if (!state.quest.combatUnlocked) return;

  state.world.enemies.forEach((enemy) => {
    if (enemy.defeated) return;

    const toPlayerX = state.player.position.x - enemy.position.x;
    const toPlayerZ = state.player.position.z - enemy.position.z;
    const distanceToPlayer = Math.hypot(toPlayerX, toPlayerZ);
    let targetX = enemy.spawn.x + Math.sin(performance.now() * 0.0004 + enemy.spawn.x) * 1.1;
    let targetZ = enemy.spawn.z + Math.cos(performance.now() * 0.00035 + enemy.spawn.z) * 1.1;

    if (distanceToPlayer < 7) {
      targetX = state.player.position.x;
      targetZ = state.player.position.z;
    }

    const dx = targetX - enemy.position.x;
    const dz = targetZ - enemy.position.z;
    const distance = Math.hypot(dx, dz) || 1;
    const chaseSpeed = enemy.kind === "boar" ? 2.15 : enemy.kind === "stoneSentinel" ? 1.35 : enemy.kind === "reedWisp" ? 1.95 : 1.75;
    const patrolSpeed = enemy.kind === "stoneSentinel" ? 0.55 : enemy.kind === "reedWisp" ? 0.9 : 0.75;
    const speed = distanceToPlayer < 7 ? chaseSpeed : patrolSpeed;
    enemy.velocity.x += ((dx / distance) * speed - enemy.velocity.x) * (1 - Math.exp(-5 * deltaSeconds));
    enemy.velocity.z += ((dz / distance) * speed - enemy.velocity.z) * (1 - Math.exp(-5 * deltaSeconds));
    enemy.position.x += enemy.velocity.x * deltaSeconds;
    enemy.position.z += enemy.velocity.z * deltaSeconds;

    if (distanceToPlayer < state.player.radius + enemy.radius + 0.2 && enemy.attackCooldown <= 0 && state.player.invulnerable <= 0) {
      enemy.attackCooldown = 1.3;
      damagePlayer(state);
    }
  });
}

function damagePlayer(state: GameState): void {
  state.player.health -= 1;
  state.player.invulnerable = 0.75;

  if (state.player.health <= 0) {
    state.player.health = state.player.maxHealth;
    state.player.position.copy(state.player.spawn);
    state.player.velocity.set(0, 0, 0);
    showMessage(state, "You were pushed back to camp. Regroup and try again.");
  } else {
    showMessage(state, "You took damage.");
  }
}

export function updateQuest(state: GameState): void {
  const woodCount = `${Math.min(state.resources.wood, state.quest.woodTarget)} / ${state.quest.woodTarget}`;
  const stoneCount = `${Math.min(state.resources.stone, state.quest.stoneTarget)} / ${state.quest.stoneTarget}`;
  const herbCount = `${Math.min(state.resources.herb, state.quest.herbTarget)} / ${state.quest.herbTarget}`;
  state.quest.checklist = activeChecklist(state, woodCount, stoneCount, herbCount);

  if (state.quest.combatUnlocked && !state.quest.enemyDefeated) {
    state.quest.currentObjective = state.quest.attackPracticed
      ? "Face the guardian beyond camp."
      : "Practice one swing before you engage.";
    return;
  }

  switch (state.quest.tutorialStage) {
    case "wakeInCove":
      state.quest.currentObjective = "Walk out of the cove.";
      break;
    case "walkToGuide":
      state.quest.currentObjective = "Follow the ridge path to Edda.";
      break;
    case "intro":
      state.quest.currentObjective = "Speak with Edda at the ridge.";
      break;
    case "gatherWood":
      state.quest.currentObjective = `Gather fallen wood (${woodCount}).`;
      break;
    case "returnWood":
      state.quest.currentObjective = "Return to Edda with the wood.";
      break;
    case "craftPickaxe":
      state.quest.currentObjective = "Use the workbench to make a wooden pick.";
      break;
    case "mineStone":
      state.quest.currentObjective = `Mine small stones (${stoneCount}).`;
      break;
    case "returnStone":
      state.quest.currentObjective = "Bring the stone back to Edda.";
      break;
    case "buildShelter":
      state.quest.currentObjective = "Build a small shelter beside the ridge.";
      break;
    case "practiceSwing":
      state.quest.currentObjective = "Practice one clean swing.";
      break;
    case "gatherHerbs":
      state.quest.currentObjective = `Gather valley herbs (${herbCount}).`;
      break;
    case "returnHerbs":
      state.quest.currentObjective = "Return to Edda with the herbs.";
      break;
    case "buildCampfire":
      state.quest.currentObjective = "Build a campfire: 2 wood, 1 stone, 1 herb.";
      break;
    case "firstCampReady":
      state.quest.currentObjective = "Follow the lower trail when ready.";
      break;
  }
}

function isGuideNearby(state: GameState): boolean {
  return Math.hypot(state.player.position.x - GUIDE_NPC_POSITION.x, state.player.position.z - GUIDE_NPC_POSITION.z) < 1.9;
}

function talkToGuide(state: GameState): void {
  switch (state.quest.tutorialStage) {
    case "walkToGuide":
      state.quest.tutorialStage = "intro";
      requestDialogue(state, "Edda", [
        "You found the ridge path. Good. Most people look for a signpost and miss the road under them.",
        "This valley is old enough to look empty on purpose.",
        "Before we build anything, learn the ground under your feet.",
        "Loose wood first. Fallen wood, not living trees. We do not take from the forest before we can replace it.",
        "Gather five pieces from the path edge, then come back.",
        "If something blocks your feet after it is gone, tell me. The world should keep its promises.",
      ]);
      showMessage(state, "Edda marked the first task.");
      break;
    case "intro":
      state.quest.tutorialStage = "gatherWood";
      requestDialogue(state, "Edda", [
        "Morning. The ridge kept the valley quiet through the night.",
        "Quiet is not safe. It just gives you space to think.",
        "Start simple: gather five pieces of fallen wood from the edge of the path, then come back to me.",
        "Do not chase every flower, stone, and shadow yet. A good trail teaches one useful verb at a time.",
        "Wood is the first verb. Pick it up, hear the pack answer, watch the resource move home.",
      ]);
      showMessage(state, "Edda marked the first task.");
      break;
    case "gatherWood":
      requestDialogue(state, "Edda", [
        `You have ${Math.min(state.resources.wood, state.quest.woodTarget)} of ${state.quest.woodTarget} wood.`,
        "Stay near the path. Fallen logs are enough for the first tool.",
        "The living trees can wait until we have an axe and a reason.",
        "If you want freedom, earn clean tools first. Then the valley opens without becoming noise.",
      ]);
      break;
    case "returnWood":
      state.quest.woodDelivered = true;
      state.quest.tutorialStage = "craftPickaxe";
      requestDialogue(state, "Edda", [
        "Good. Keep the wood in your pack. A pack is not a menu; it is memory you can spend.",
        "Use the workbench beside the ridge. Three pieces will become a wooden pick.",
        "The pick will not make you strong. It gives your hand a better question to ask stone.",
        "Press the tool slot when it appears. The slot should answer you now.",
      ]);
      showMessage(state, "Workbench unlocked.");
      break;
    case "craftPickaxe":
      requestDialogue(state, "Edda", [
        "The workbench is ready.",
        "Make the wooden pick before you try the stones.",
        "The valley has rules. Good rules are not walls; they tell you what would make sense next.",
      ]);
      break;
    case "mineStone":
      requestDialogue(state, "Edda", [
        `You have ${Math.min(state.resources.stone, state.quest.stoneTarget)} of ${state.quest.stoneTarget} stone.`,
        "Only the small loose stones for now. The larger ridge can wait.",
        "A stone should shrink, crack, and then stop blocking the path when it is gone.",
        "If the pick feels slow, that is deliberate. A strike without recovery is just noise.",
      ]);
      break;
    case "returnStone":
      state.quest.stoneDelivered = true;
      state.quest.tutorialStage = "buildShelter";
      requestDialogue(state, "Edda", [
        "Good. Stone anchors what wood begins.",
        "Now we stop collecting for a moment and change the world on purpose.",
        "Use two wood and one stone to place a small shelter beside the ridge.",
        "A camp needs a first shape. Not a perfect shape. A useful one.",
        "Build close enough to return to, but not so close that you trip over your own work.",
      ]);
      showMessage(state, "Shelter plan unlocked.");
      break;
    case "buildShelter":
      requestDialogue(state, "Edda", [
        "Place the shelter close enough to the ridge that the wind breaks around it.",
        "Two wood. One stone. Keep it simple.",
        "Good building is boring until the moment you need it. Then it feels like magic.",
      ]);
      break;
    case "practiceSwing":
      requestDialogue(state, "Edda", [
        "Not a fight. Just one clean swing.",
        "Lean into the motion, then recover. That is how you stay on your feet.",
        "Watch your right hand. If the sword appears, the game is finally telling the truth.",
      ]);
      break;
    case "gatherHerbs":
      requestDialogue(state, "Edda", [
        `You have ${Math.min(state.resources.herb, state.quest.herbTarget)} of ${state.quest.herbTarget} herbs.`,
        "Look for the pale flowers and low green patches along the path edge.",
        "Herbs are the first quiet reward. They do not shout like coins, but they keep a camp alive.",
      ]);
      break;
    case "returnHerbs":
      state.quest.herbsDelivered = true;
      state.quest.tutorialStage = "buildCampfire";
      requestDialogue(state, "Edda", [
        "Good. The herb smoke keeps the night insects away.",
        "Now build a small campfire: two wood, one stone, one herb.",
        "If you spent the wood, gather more from fallen logs. A good system lets you recover from waste.",
        "When the fire is lit, the lower trail opens. That is when choice starts to matter.",
      ]);
      showMessage(state, "Campfire plan unlocked.");
      break;
    case "buildCampfire":
      requestDialogue(state, "Edda", [
        "A campfire is not decoration. It marks safety, warmth, and a place to return.",
        "Use two wood, one stone, and one herb.",
        "The flame is the first promise: leave, risk something, come back changed.",
      ]);
      break;
    case "firstCampReady":
      requestDialogue(state, "Edda", [
        "The first lesson is done.",
        "From here the valley opens slowly: better tools, safer paths, and stories worth following.",
        "There are high stones east, wet reeds west, and colder trees beyond the morning trail.",
        "You do not need to clear everything. You need to understand what each place is asking from you.",
        "When you are ready, follow the lower trail and choose the angle before the guardian chooses it for you.",
      ]);
      break;
  }
}

function activeChecklist(state: GameState, woodCount: string, stoneCount: string, herbCount: string): Array<{ label: string; complete: boolean }> {
  switch (state.quest.tutorialStage) {
    case "wakeInCove":
      return [{ label: "Move forward", complete: false }];
    case "walkToGuide":
      return [{ label: "Reach Edda", complete: false }];
    case "intro":
      return [{ label: "Listen", complete: false }];
    case "gatherWood":
    case "returnWood":
      return [{ label: state.quest.woodDelivered ? "Wood delivered" : `Wood ${woodCount}`, complete: state.quest.woodDelivered }];
    case "craftPickaxe":
      return [{ label: state.quest.pickaxeCrafted ? "Wooden pick made" : "Craft wooden pick", complete: state.quest.pickaxeCrafted }];
    case "mineStone":
    case "returnStone":
      return [{ label: state.quest.stoneDelivered ? "Stone delivered" : `Stone ${stoneCount}`, complete: state.quest.stoneDelivered }];
    case "buildShelter":
      return [{ label: state.quest.cabinBuilt ? "Shelter placed" : "Build shelter", complete: state.quest.cabinBuilt }];
    case "practiceSwing":
      return [{ label: state.quest.attackPracticed ? "Swing practiced" : "Practice swing", complete: state.quest.attackPracticed }];
    case "gatherHerbs":
    case "returnHerbs":
      return [{ label: state.quest.herbsDelivered ? "Herbs checked" : `Herbs ${herbCount}`, complete: state.quest.herbsDelivered }];
    case "buildCampfire":
      return [{ label: state.quest.campfireBuilt ? "Campfire lit" : "Build campfire", complete: state.quest.campfireBuilt }];
    case "firstCampReady":
      return [{ label: "Trail unlocked", complete: true }];
  }
}

function canOpenPack(state: GameState): boolean {
  return state.resources.wood + state.resources.stone + state.resources.herb + state.resources.coin > 0;
}

function updateBiomeContext(state: GameState): void {
  const biome = biomeAt(state.player.position.x, state.player.position.z);
  if (biome === state.world.currentBiome) return;

  state.world.currentBiome = biome;
  showMessage(state, `Entered ${biomeLabel(biome)}.`);
}

function showMessage(state: GameState, message: string): void {
  state.action.message = message;
  state.action.messageTimer = 4.2;
}

function resolveWorldCollisions(state: GameState): void {
  state.world.colliders.forEach((collider) => {
    if (collider.propId && isInactivePropCollider(state, collider.propId)) return;

    if (collider.type === "circle") {
      resolveCircleCollision(state, collider);
    } else {
      resolveCapsuleCollision(state, collider);
    }
  });
}

function isInactivePropCollider(state: GameState, propId: string): boolean {
  const node = state.world.resourceNodes.find((item) => item.id === propId);
  return node ? !node.active : false;
}

function resolveCircleCollision(state: GameState, collider: Extract<WorldCollider, { type: "circle" }>): void {
  resolveAgainstPoint(state, collider.x, collider.z, collider.radius);
}

function resolveCapsuleCollision(state: GameState, collider: Extract<WorldCollider, { type: "capsule" }>): void {
  const player = state.player;
  const axisX = Math.sin(collider.rotation);
  const axisZ = Math.cos(collider.rotation);
  const relativeX = player.position.x - collider.x;
  const relativeZ = player.position.z - collider.z;
  const projected = clamp(relativeX * axisX + relativeZ * axisZ, -collider.halfLength, collider.halfLength);
  const closestX = collider.x + axisX * projected;
  const closestZ = collider.z + axisZ * projected;

  resolveAgainstPoint(state, closestX, closestZ, collider.radius);
}

function resolveAgainstPoint(state: GameState, obstacleX: number, obstacleZ: number, obstacleRadius: number): void {
  const player = state.player;
  const dx = player.position.x - obstacleX;
  const dz = player.position.z - obstacleZ;
  const minDistance = player.radius + obstacleRadius;
  const distanceSquared = dx * dx + dz * dz;

  if (distanceSquared >= minDistance * minDistance) return;

  const distance = Math.sqrt(distanceSquared) || 0.0001;
  const normalX = dx / distance;
  const normalZ = dz / distance;
  const push = minDistance - distance;

  player.position.x += normalX * push;
  player.position.z += normalZ * push;

  const inwardSpeed = player.velocity.x * normalX + player.velocity.z * normalZ;
  if (inwardSpeed < 0) {
    player.velocity.x -= normalX * inwardSpeed;
    player.velocity.z -= normalZ * inwardSpeed;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
