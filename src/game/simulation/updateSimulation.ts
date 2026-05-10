import type { InputVector } from "../input/InputController";
import { GUIDE_NPC_POSITION, requestDialogue, type EnemyState, type GameState, type HotbarSlot, type ResourceNode, type RouteChoice, type ToolMotion } from "./GameState";
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
    state.action.prompt = buildPrompt(state);
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
      return state.quest.pickaxeCrafted || state.quest.axeCrafted;
    case "build":
      return state.quest.cabinBuilt || state.quest.tutorialStage === "buildShelter" || state.quest.tutorialStage === "buildCampfire" || state.quest.tutorialStage === "repairBridge";
    case "attack":
      return state.quest.tutorialStage === "practiceSwing" || state.quest.tutorialStage === "clearGuardian" || state.quest.combatUnlocked;
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
  cueChapter(state, "First Trail", "Find Edda");
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

  if (state.quest.tutorialStage === "clearGuardian") {
    state.quest.attackPracticed = true;
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
    const coinReward = 3;
    state.resources.coin += coinReward;
    state.quest.enemyDefeated = true;
    pushEnemyRewardEvent(state, enemy, coinReward);
    if (state.quest.tutorialStage === "clearGuardian") {
      state.quest.tutorialStage = "returnGuardian";
      cueChapter(state, "Guardian Down", "Return to Camp");
      showMessage(state, "Guardian defeated. Return to Edda.");
    } else {
      showMessage(state, "Guardian defeated. You recovered 3 coins.");
    }
  } else {
    showMessage(state, "Hit landed.");
  }
}

function pushEnemyRewardEvent(state: GameState, enemy: EnemyState, amount: number): void {
  state.action.harvestEvents.push({
    id: state.action.harvestEvents.length + 1,
    nodeId: `reward-${enemy.id}`,
    kind: "chest",
    resource: "coin",
    x: enemy.position.x,
    z: enemy.position.z,
    final: true,
    hitIndex: 1,
    totalHits: 1,
    amount,
  });
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
    if (state.quest.tutorialStage === "craftAxe") {
      craftAxe(state);
      return;
    }

    if (state.quest.tutorialStage !== "craftPickaxe" || state.quest.pickaxeCrafted) {
      showMessage(state, state.quest.axeCrafted ? "The axe and wooden pick are ready." : state.quest.pickaxeCrafted ? "The wooden pick is ready." : "Edda will show you what to make first.");
      return;
    }

    craftPickaxe(state);
    return;
  }

  if (node.resource === "lore") {
    if (state.quest.tutorialStage === "firstCampReady" && node.kind === "marker" && node.z > 20) {
      state.quest.tutorialStage = "openTrailCache";
      node.active = false;
      pushHarvestEvent(state, node);
      cueChapter(state, "Chapter 2", "Old Trail Sign");
      showMessage(state, "The old marker points to a trail cache.");
      requestDialogue(state, "Trail Marker", [
        "Three notches face away from the morning camp.",
        "East: stone rise. West: reed water. North: cold pine.",
        "A small cache is buried beside this marker for travelers who reached it with their feet, not just their eyes.",
        "Open it, then choose which horizon should become the next problem.",
      ]);
      return;
    }

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

function craftPickaxe(state: GameState): void {
  if (state.resources.wood < 3) {
    showMessage(state, "A wooden pick needs 3 wood.");
    return;
  }

  state.resources.wood -= 3;
  state.action.gatherPulse = 0.42;
  state.action.toolMotion = "build";
  state.quest.pickaxeCrafted = true;
  state.quest.toolLevel = Math.max(state.quest.toolLevel, 1);
  state.quest.tutorialStage = "mineStone";
  cueChapter(state, "Tool Made", "Wooden Pick");
  showMessage(state, "Wooden pick crafted.");
  requestDialogue(state, "Edda", [
    "Good. Now the small grey stones along the bend will give way.",
    "Bring me three pieces of stone. After that, the camp can start to grow.",
    "Notice the rhythm: approach, start, commit, finish, then the world actually changes.",
  ]);
}

function craftAxe(state: GameState): void {
  if (state.quest.axeCrafted) {
    showMessage(state, "The camp axe is ready.");
    return;
  }

  if (state.resources.wood < 4 || state.resources.stone < 1) {
    showMessage(state, "A camp axe needs 4 wood and 1 stone.");
    return;
  }

  state.resources.wood -= 4;
  state.resources.stone -= 1;
  state.action.gatherPulse = 0.52;
  state.action.toolMotion = "build";
  state.quest.axeCrafted = true;
  state.quest.toolLevel = Math.max(state.quest.toolLevel, 2);
  state.quest.tutorialStage = "fellTree";
  cueChapter(state, "Tool Made", "Camp Axe");
  showMessage(state, "Camp axe crafted.");
  requestDialogue(state, "Edda", [
    "Now the living trees are no longer just walls.",
    "Do not clear the forest because you can. Choose one tree near the trail and fell it cleanly.",
    "A bigger tool should widen your choices, not erase the shape of the place.",
    "When it falls, bring the wood back. Then we repair the broken crossing below camp.",
  ]);
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

  if (isTreeNode(node)) {
    spawnFelledLog(state, node);
    if (state.quest.tutorialStage === "fellTree") {
      state.quest.treeChopped = true;
      cueChapter(state, "Tree Felled", "Collect the Timber");
      showMessage(state, "Tree down. Pick up the cut wood.");
      return;
    }
    showMessage(state, "Tree down. Cut wood is ready.");
    return;
  }

  state.resources[node.resource] += node.amount;

  if (isFelledLogNode(node) && state.quest.tutorialStage === "fellTree" && state.quest.treeChopped) {
    state.world.buildings = state.world.buildings.filter((building) => building.id !== droppedLogBuildingId(node.id));
    state.quest.tutorialStage = "returnTree";
    cueChapter(state, "Timber Ready", "Return to Edda");
    showMessage(state, "Cut wood packed. Return to Edda.");
    return;
  }

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

  if (advanceRouteSurveyAfterGather(state, node.resource)) {
    return;
  }

  if (node.resource === "coin" && node.kind === "chest" && state.quest.tutorialStage === "openTrailCache") {
    state.quest.tutorialStage = "chooseNextTrail";
    cueChapter(state, "Choice Opens", "Three Trails");
    showMessage(state, "Trail cache opened. The next routes are marked.");
    requestDialogue(state, "Trail Cache", [
      "Inside: a few coins, a folded map scrap, and three carved route marks.",
      "The east mark is heavy with stone dust.",
      "The west mark smells of wet reeds.",
      "The north mark carries pine resin and cold air.",
      "This is the shape of the next demo slice: one camp behind you, three readable directions ahead.",
    ]);
    return;
  }

  const label = node.resource === "coin" ? "coins" : node.resource;
  showMessage(state, `Collected ${node.amount} ${label}.`);
}

function advanceRouteSurveyAfterGather(state: GameState, resource: keyof GameState["resources"]): boolean {
  if (state.quest.tutorialStage === "stoneRoute" && resource === "stone" && routeResourceCount(state, "stone") >= 6) {
    state.quest.tutorialStage = "returnRoute";
    cueChapter(state, "Stone Report", "Return to Edda");
    showMessage(state, "Enough fresh stone surveyed. Return to Edda.");
    return true;
  }

  if (state.quest.tutorialStage === "reedRoute" && resource === "herb" && routeResourceCount(state, "reed") >= 5) {
    state.quest.tutorialStage = "returnRoute";
    cueChapter(state, "Reed Report", "Return to Edda");
    showMessage(state, "Enough useful plants gathered. Return to Edda.");
    return true;
  }

  if (state.quest.tutorialStage === "pineRoute" && resource === "wood" && routeResourceCount(state, "pine") >= 8) {
    state.quest.tutorialStage = "returnRoute";
    cueChapter(state, "Pine Report", "Return to Edda");
    showMessage(state, "Enough trail timber cut. Return to Edda.");
    return true;
  }

  return false;
}

function isTreeNode(node: ResourceNode): boolean {
  return node.kind === "pine" || node.kind === "oak" || node.kind === "birch" || node.kind === "willow";
}

function isFelledLogNode(node: ResourceNode): boolean {
  return node.kind === "log" && node.id.endsWith("-fallen-log");
}

function spawnFelledLog(state: GameState, node: ResourceNode): void {
  const dropId = `${node.id}-fallen-log`;
  if (state.world.resourceNodes.some((item) => item.id === dropId)) return;

  const fallYaw = Math.atan2(state.player.position.x - node.x, state.player.position.z - node.z) + Math.PI * 0.5;
  const dropX = node.x + Math.sin(fallYaw) * 0.72;
  const dropZ = node.z + Math.cos(fallYaw) * 0.72;
  state.world.resourceNodes.push({
    id: dropId,
    kind: "log",
    x: dropX,
    z: dropZ,
    radius: 1.15,
    active: true,
    resource: "wood",
    amount: node.amount,
    actionLabel: "Pick up cut wood",
    hitsRemaining: 1,
    maxHits: 1,
  });
  state.world.buildings.push({
    id: droppedLogBuildingId(dropId),
    kind: "felledLog",
    position: state.player.position.clone().set(dropX, 0, dropZ),
    rotation: fallYaw,
  });
}

function droppedLogBuildingId(nodeId: string): string {
  return `drop-${nodeId}`;
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
  if (state.quest.tutorialStage === "repairBridge") {
    repairTrailBridge(state);
    return;
  }

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
  cueChapter(state, "Camp Grows", "First Shelter");
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
  state.quest.tutorialStage = "craftAxe";
  state.quest.combatUnlocked = false;
  cueChapter(state, "Camp Grows", "First Fire");
  showMessage(state, "Campfire lit. Edda has the next tool plan.");
  requestDialogue(state, "Edda", [
    "Now the camp has smoke, shelter, tools, and a reason to return.",
    "That is the difference between wandering and exploring: a place behind you that still matters.",
    "We are not rushing to the lower trail yet. First we make the tool that changes how the forest answers you.",
    "Use the workbench again. Four wood and one stone will become a camp axe.",
    "Then we choose one tree, repair one crossing, and only then do we wake the guardian.",
  ]);
}

function repairTrailBridge(state: GameState): void {
  if (!canRepairBridge(state)) {
    showMessage(state, "Bridge repair needs 4 wood and 2 stone.");
    return;
  }

  const forwardX = Math.sin(state.player.facingYaw);
  const forwardZ = Math.cos(state.player.facingYaw);
  const x = state.player.position.x + forwardX * 2.45;
  const z = state.player.position.z + forwardZ * 2.45;

  state.resources.wood -= 4;
  state.resources.stone -= 2;
  state.action.toolMotion = "build";
  state.world.buildings.push({
    id: `bridge-${state.world.buildings.length + 1}`,
    kind: "bridge",
    position: state.player.position.clone().set(x, 0, z),
    rotation: state.player.facingYaw + Math.PI,
  });
  state.quest.bridgeRepaired = true;
  state.quest.campLevel = Math.max(state.quest.campLevel, 3);
  state.quest.tutorialStage = "clearGuardian";
  state.quest.combatUnlocked = true;
  cueChapter(state, "Lower Trail", "Crossing Repaired");
  showMessage(state, "Crossing repaired. The guardian hears you.");
  requestDialogue(state, "Edda", [
    "Good. That repair matters because it gives you a way back.",
    "The first guardian patrols below the bend. Do not chase it into the trees.",
    "Walk in, keep your feet under you, swing once, recover, and read the next step.",
    "If it pushes you back, that is not failure. It is the valley teaching force.",
  ]);
}

function canBuildShelter(state: GameState): boolean {
  return state.quest.tutorialStage === "buildShelter" && state.resources.wood >= 2 && state.resources.stone >= 1;
}

function canBuildCampfire(state: GameState): boolean {
  return state.quest.tutorialStage === "buildCampfire" && state.resources.wood >= 2 && state.resources.stone >= 1 && state.resources.herb >= 1;
}

function canRepairBridge(state: GameState): boolean {
  return state.quest.tutorialStage === "repairBridge" && state.resources.wood >= 4 && state.resources.stone >= 2;
}

function canBuildCurrentCampStructure(state: GameState): boolean {
  return canBuildShelter(state) || canBuildCampfire(state) || canRepairBridge(state);
}

function buildPrompt(state: GameState): string {
  if (state.quest.tutorialStage === "buildCampfire") return "B Build campfire";
  if (state.quest.tutorialStage === "repairBridge") return "B Repair crossing";
  return "B Build shelter";
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
    case "craftAxe":
      state.quest.currentObjective = "Craft a camp axe: 4 wood, 1 stone.";
      break;
    case "fellTree":
      state.quest.currentObjective = "Fell one trail tree with the axe.";
      break;
    case "returnTree":
      state.quest.currentObjective = "Return to Edda with the felled wood.";
      break;
    case "repairBridge":
      state.quest.currentObjective = "Repair the lower crossing: 4 wood, 2 stone.";
      break;
    case "clearGuardian":
      state.quest.currentObjective = "Defeat the first trail guardian.";
      break;
    case "returnGuardian":
      state.quest.currentObjective = "Return to Edda after the fight.";
      break;
    case "firstCampReady":
      state.quest.currentObjective = "Follow the lower trail and inspect the old marker.";
      break;
    case "openTrailCache":
      state.quest.currentObjective = "Open the trail cache beside the marker.";
      break;
    case "chooseNextTrail":
      state.quest.currentObjective = "Choose a future route: east stone, west reeds, or north pine.";
      break;
    case "stoneRoute":
      state.quest.currentObjective = `Survey Stone Rise: mine fresh stone (${routeResourceCount(state, "stone")} / 6).`;
      break;
    case "reedRoute":
      state.quest.currentObjective = `Survey Reedfen: gather useful plants (${routeResourceCount(state, "reed")} / 5).`;
      break;
    case "pineRoute":
      state.quest.currentObjective = `Survey Pinewood: cut trail timber (${routeResourceCount(state, "pine")} / 8).`;
      break;
    case "returnRoute":
      state.quest.currentObjective = "Return to Edda with the route report.";
      break;
  }
}

function isGuideNearby(state: GameState): boolean {
  return Math.hypot(state.player.position.x - GUIDE_NPC_POSITION.x, state.player.position.z - GUIDE_NPC_POSITION.z) < 1.9;
}

function routeResourceCount(state: GameState, route: RouteChoice): number {
  if (route === "stone") return Math.max(0, state.resources.stone - state.quest.routeStoneStart);
  if (route === "reed") return Math.max(0, state.resources.herb - state.quest.routeHerbStart);
  if (route === "pine") return Math.max(0, state.resources.wood - state.quest.routeWoodStart);
  return 0;
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
    case "craftAxe":
      requestDialogue(state, "Edda", [
        "The fire is alive. Good. Now make the tool that lets the forest answer back.",
        "Use the workbench: four wood and one stone for a camp axe.",
        "If you need more material, stay near the path edge. The opening should never ask you to wander blind.",
      ]);
      break;
    case "fellTree":
      requestDialogue(state, "Edda", [
        "Choose one tree near the lower trail.",
        "A clean chop is not a button mash. Plant your feet, let the axe bite, then recover.",
        "When the tree falls, the space it occupied must become real space. Walk through it and feel that the world kept track.",
      ]);
      break;
    case "returnTree":
      state.quest.treeChopped = true;
      state.quest.tutorialStage = "repairBridge";
      requestDialogue(state, "Edda", [
        "That is enough. We do not need a bare forest.",
        "Now repair the broken crossing below the camp. Four wood and two stone.",
        "A bridge is a promise in both directions: forward adventure, backward safety.",
        "Place it where your feet naturally want to continue.",
      ]);
      showMessage(state, "Crossing repair unlocked.");
      break;
    case "repairBridge":
      requestDialogue(state, "Edda", [
        "The crossing needs four wood and two stone.",
        "Build it near the lower trail, where the ground narrows.",
        "After that, the first guardian wakes. The fight should feel earned, not dumped on your head.",
      ]);
      break;
    case "clearGuardian":
      requestDialogue(state, "Edda", [
        "The guardian is awake below the bend.",
        "Do not fight in the trees. Keep the path at your back and the open grass to your side.",
        "One swing, recover, step. That is the whole lesson.",
      ]);
      break;
    case "returnGuardian":
      state.quest.tutorialStage = "firstCampReady";
      cueChapter(state, "Chapter Complete", "Trail Opens");
      requestDialogue(state, "Edda", [
        "You came back. That matters more than the coins.",
        "Now the camp has a loop: gather, craft, build, fight, return, improve.",
        "The valley opens from here in branches, not a straight line.",
        "East is stone and old signs. West is water and reeds. North is cold timber.",
        "Pick a direction when you are ready. The next chapter should begin because you chose it.",
      ]);
      showMessage(state, "Chapter complete. The lower trail is yours.");
      break;
    case "firstCampReady":
      requestDialogue(state, "Edda", [
        "The first lesson is done.",
        "From here the valley opens slowly: better tools, safer paths, and stories worth following.",
        "There are high stones east, wet reeds west, and colder trees beyond the morning trail.",
        "You do not need to clear everything. You need to understand what each place is asking from you.",
        "When you are ready, follow the lower trail to the old marker. It will point to the next useful choice.",
      ]);
      break;
    case "openTrailCache":
      requestDialogue(state, "Edda", [
        "The marker is old, but the cache should still be close.",
        "Open it before picking a direction. A good route begins with information, not speed.",
      ]);
      break;
    case "chooseNextTrail":
      requestDialogue(state, "Edda", [
        "Now we have the shape of the valley.",
        "East should teach climbing, mining, and old stone mechanisms.",
        "West should teach water, reeds, fishing, and soft ground.",
        "North should teach colder forest, better timber, and longer survival loops.",
        "The next build should choose one of those routes and make it deep instead of throwing all three at you at once.",
      ]);
      break;
    case "stoneRoute":
      requestDialogue(state, "Edda", [
        `Stone Rise report: ${routeResourceCount(state, "stone")} of 6 fresh stone.`,
        "Mine only what the ridge offers near the marked trail. Do not strip the whole slope.",
        "This route should become our first puzzle spine: pressure plates, cracked walls, and old stone doors.",
      ]);
      break;
    case "reedRoute":
      requestDialogue(state, "Edda", [
        `Reedfen report: ${routeResourceCount(state, "reed")} of 5 useful plants.`,
        "Soft ground teaches patience. Move around water, read the reeds, then gather what can heal the camp.",
        "Later this route should become fishing, herbs, boats, and quiet enemies you hear before you see.",
      ]);
      break;
    case "pineRoute":
      requestDialogue(state, "Edda", [
        `Pinewood report: ${routeResourceCount(state, "pine")} of 8 trail timber.`,
        "Take timber with intent. Fell a tree, collect the cut wood, and make sure the space you cleared can be crossed.",
        "This route should grow into cabins, cold nights, better tools, and survival loops.",
      ]);
      break;
    case "returnRoute":
      state.quest.routeComplete = true;
      state.quest.tutorialStage = "chooseNextTrail";
      state.quest.routeChoice = "";
      cueChapter(state, "Route Logged", "Valley Map Updated");
      requestDialogue(state, "Edda", [
        "Good. That is a real report, not sightseeing.",
        "The route now has a reason to exist: material, danger, and a future mechanic.",
        "We can deepen one branch next instead of making a noisy map full of things that do nothing.",
        "For now, choose another route or keep improving the camp. The valley should open because your actions made sense.",
      ]);
      showMessage(state, "Route report logged.");
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
      return [
        { label: `Wood ${woodCount}`, complete: state.quest.woodGathered || state.quest.woodDelivered },
        { label: "Return to Edda", complete: state.quest.woodDelivered },
      ];
    case "craftPickaxe":
      return [
        { label: `${Math.min(state.resources.wood, 3)} / 3 wood`, complete: state.resources.wood >= 3 || state.quest.pickaxeCrafted },
        { label: "Use workbench", complete: state.quest.pickaxeCrafted },
      ];
    case "mineStone":
    case "returnStone":
      return [
        { label: `Stone ${stoneCount}`, complete: state.quest.stoneGathered || state.quest.stoneDelivered },
        { label: "Return to Edda", complete: state.quest.stoneDelivered },
      ];
    case "buildShelter":
      return [
        { label: `${Math.min(state.resources.wood, 2)} / 2 wood`, complete: state.resources.wood >= 2 || state.quest.cabinBuilt },
        { label: `${Math.min(state.resources.stone, 1)} / 1 stone`, complete: state.resources.stone >= 1 || state.quest.cabinBuilt },
        { label: "Place shelter", complete: state.quest.cabinBuilt },
      ];
    case "practiceSwing":
      return [{ label: state.quest.attackPracticed ? "Swing practiced" : "Practice swing", complete: state.quest.attackPracticed }];
    case "gatherHerbs":
    case "returnHerbs":
      return [
        { label: `Herbs ${herbCount}`, complete: state.quest.herbsGathered || state.quest.herbsDelivered },
        { label: "Return to Edda", complete: state.quest.herbsDelivered },
      ];
    case "buildCampfire":
      return [
        { label: `${Math.min(state.resources.wood, 2)} / 2 wood`, complete: state.resources.wood >= 2 || state.quest.campfireBuilt },
        { label: `${Math.min(state.resources.stone, 1)} / 1 stone`, complete: state.resources.stone >= 1 || state.quest.campfireBuilt },
        { label: `${Math.min(state.resources.herb, 1)} / 1 herb`, complete: state.resources.herb >= 1 || state.quest.campfireBuilt },
      ];
    case "craftAxe":
      return [
        { label: `${Math.min(state.resources.wood, 4)} / 4 wood`, complete: state.resources.wood >= 4 || state.quest.axeCrafted },
        { label: `${Math.min(state.resources.stone, 1)} / 1 stone`, complete: state.resources.stone >= 1 || state.quest.axeCrafted },
        { label: "Use workbench", complete: state.quest.axeCrafted },
      ];
    case "fellTree":
      return state.quest.treeChopped
        ? [
            { label: "Tree felled", complete: true },
            { label: "Pick up cut wood", complete: false },
          ]
        : [{ label: "Fell one tree", complete: false }];
    case "returnTree":
      return [{ label: "Return with timber", complete: false }];
    case "repairBridge":
      return [
        { label: `${Math.min(state.resources.wood, 4)} / 4 wood`, complete: state.resources.wood >= 4 || state.quest.bridgeRepaired },
        { label: `${Math.min(state.resources.stone, 2)} / 2 stone`, complete: state.resources.stone >= 2 || state.quest.bridgeRepaired },
        { label: "Repair crossing", complete: state.quest.bridgeRepaired },
      ];
    case "clearGuardian":
      return [
        { label: "Draw sword", complete: state.quest.attackPracticed },
        { label: "Defeat guardian", complete: state.quest.enemyDefeated },
      ];
    case "returnGuardian":
      return [{ label: "Report back", complete: false }];
    case "firstCampReady":
      return [{ label: "Find old marker", complete: false }];
    case "openTrailCache":
      return [{ label: "Open trail cache", complete: false }];
    case "chooseNextTrail":
      return [
        { label: "East stone rise", complete: false },
        { label: "West reedfen", complete: false },
        { label: "North pinewood", complete: false },
      ];
    case "stoneRoute":
      return [
        { label: `Fresh stone ${Math.min(routeResourceCount(state, "stone"), 6)} / 6`, complete: routeResourceCount(state, "stone") >= 6 },
        { label: "Return report", complete: false },
      ];
    case "reedRoute":
      return [
        { label: `Useful plants ${Math.min(routeResourceCount(state, "reed"), 5)} / 5`, complete: routeResourceCount(state, "reed") >= 5 },
        { label: "Return report", complete: false },
      ];
    case "pineRoute":
      return [
        { label: `Trail timber ${Math.min(routeResourceCount(state, "pine"), 8)} / 8`, complete: routeResourceCount(state, "pine") >= 8 },
        { label: "Return report", complete: false },
      ];
    case "returnRoute":
      return [{ label: "Speak with Edda", complete: false }];
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

  if (state.quest.tutorialStage !== "chooseNextTrail") return;

  if (biome === "highland") {
    startRouteSurvey(state, "stone");
  } else if (biome === "wetland") {
    startRouteSurvey(state, "reed");
  } else if (biome === "pineForest") {
    startRouteSurvey(state, "pine");
  }
}

function startRouteSurvey(state: GameState, route: Exclude<RouteChoice, "">): void {
  state.quest.routeChoice = route;
  state.quest.routeWoodStart = state.resources.wood;
  state.quest.routeStoneStart = state.resources.stone;
  state.quest.routeHerbStart = state.resources.herb;
  state.quest.routeComplete = false;

  if (route === "stone") {
    state.quest.tutorialStage = "stoneRoute";
    cueChapter(state, "Route Chosen", "Stone Rise");
    requestDialogue(state, "Trail Notes", [
      "The ground hardens under your feet.",
      "Goal: mine six fresh pieces of stone from this route, then return to Edda.",
      "Later this branch should become the place for climbing, cracked walls, and stone puzzles.",
    ]);
    return;
  }

  if (route === "reed") {
    state.quest.tutorialStage = "reedRoute";
    cueChapter(state, "Route Chosen", "Reedfen");
    requestDialogue(state, "Trail Notes", [
      "The air turns wet and quiet.",
      "Goal: gather five useful plants from this route, then return to Edda.",
      "Later this branch should teach water, fishing, boats, and soft-ground danger.",
    ]);
    return;
  }

  state.quest.tutorialStage = "pineRoute";
  cueChapter(state, "Route Chosen", "Pinewood");
  requestDialogue(state, "Trail Notes", [
    "The forest grows colder and taller.",
    "Goal: cut eight fresh timber from this route, then return to Edda.",
    "Later this branch should unlock cabins, cold nights, better axes, and survival systems.",
  ]);
}

function showMessage(state: GameState, message: string): void {
  state.action.message = message;
  state.action.messageTimer = 4.2;
}

function cueChapter(state: GameState, title: string, text: string, duration = 2.9): void {
  state.action.chapterCueTitle = title;
  state.action.chapterCueText = text;
  state.action.chapterCueTimer = duration;
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
