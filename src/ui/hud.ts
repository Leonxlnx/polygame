import type { GameState } from "../game/simulation/GameState";
import { biomeLabel } from "../game/content/worldMap";

export type Hud = {
  update: (state: GameState) => void;
};

type TutorialStage = GameState["quest"]["tutorialStage"];

export function createHud(root: HTMLElement): Hud {
  const heartRow = requireElement(root, "#heart-row");
  const regionValue = requireElement(root, "#region-value");
  const resourceDock = requireElement(root, ".resource-dock");
  const regionChip = requireElement(root, ".region-chip");
  const woodChip = requireElement(root, ".resource-wood");
  const stoneChip = requireElement(root, ".resource-stone");
  const herbChip = requireElement(root, ".resource-herb");
  const coinChip = requireElement(root, ".resource-coin");
  const woodValue = requireElement(root, "#wood-value");
  const stoneValue = requireElement(root, "#stone-value");
  const herbValue = requireElement(root, "#herb-value");
  const coinValue = requireElement(root, "#coin-value");
  const objectiveValue = requireElement(root, "#objective-value");
  const questPanel = requireElement(root, "#quest-panel");
  const questList = requireElement(root, "#quest-list");
  const chapterValue = requireElement(root, "#chapter-value");
  const campMeter = requireElement(root, ".camp-meter");
  const campValue = requireElement(root, "#camp-value");
  const inventoryPanel = requireElement(root, "#inventory-panel");
  const inventorySummary = requireElement(root, "#inventory-summary");
  const interactPrompt = requireElement(root, "#interact-prompt");
  const harvestProgress = requireElement(root, "#harvest-progress");
  const harvestLabel = requireElement(root, "#harvest-label");
  const harvestPercent = requireElement(root, "#harvest-percent");
  const harvestFill = requireElement(root, "#harvest-fill");
  const toast = requireElement(root, "#toast");
  const chapterCard = requireElement(root, "#chapter-card");
  const chapterCardTitle = requireElement(root, "#chapter-card-title");
  const chapterCardText = requireElement(root, "#chapter-card-text");
  const hotbar = requireElement(root, ".hotbar");
  const handsSlot = requireElement(root, ".slot-hands");
  const toolSlot = requireElement(root, ".slot-tool");
  const buildSlot = requireElement(root, ".slot-build");
  const attackSlot = requireElement(root, ".slot-attack");
  const packSlot = requireElement(root, ".slot-pack");

  return {
    update: (state: GameState) => {
      heartRow.replaceChildren(...createHearts(state.player.health, state.player.maxHealth));
      regionValue.textContent = biomeLabel(state.world.currentBiome);
      woodValue.textContent = String(state.resources.wood);
      stoneValue.textContent = String(state.resources.stone);
      herbValue.textContent = String(state.resources.herb);
      coinValue.textContent = String(state.resources.coin);
      objectiveValue.textContent = state.quest.currentObjective;
      chapterValue.textContent = chapterLabel(state.quest.tutorialStage);
      campValue.textContent = String(state.quest.campLevel);
      const activeQuestItems = state.quest.checklist.filter((item) => !item.complete).slice(0, 3);
      const visibleQuestItems = activeQuestItems.length > 0 ? activeQuestItems : state.quest.checklist.slice(-1);
      questList.replaceChildren(...visibleQuestItems.map(createQuestItem));
      inventorySummary.replaceChildren(...createInventorySummary(state));
      inventoryPanel.classList.toggle("is-hidden", !state.ui.inventoryOpen);
      const campVisible = state.quest.campLevel > 0 || isAtLeast(state.quest.tutorialStage, "buildShelter");
      questPanel.classList.toggle("has-camp", campVisible);
      campMeter.classList.toggle("is-unavailable", !campVisible);

      const handsUnlocked = state.quest.tutorialStage !== "wakeInCove";
      const packUnlocked = handsUnlocked && totalResources(state) > 0;
      const toolUnlocked = state.quest.pickaxeCrafted;
      const buildUnlocked = state.quest.cabinBuilt || state.quest.tutorialStage === "buildShelter" || state.quest.tutorialStage === "buildCampfire";
      const attackUnlocked = state.quest.tutorialStage === "practiceSwing" || state.quest.combatUnlocked;
      const woodUnlocked = isAtLeast(state.quest.tutorialStage, "gatherWood") || state.resources.wood > 0;
      const stoneUnlocked = state.quest.pickaxeCrafted || isAtLeast(state.quest.tutorialStage, "mineStone") || state.resources.stone > 0;
      const herbUnlocked = isAtLeast(state.quest.tutorialStage, "gatherHerbs") || state.resources.herb > 0;
      const coinUnlocked = state.quest.combatUnlocked || state.resources.coin > 0;
      const anyResourceUnlocked = woodUnlocked || stoneUnlocked || herbUnlocked || coinUnlocked;

      resourceDock.classList.toggle("is-empty", !anyResourceUnlocked);
      regionChip.classList.toggle("is-unavailable", !anyResourceUnlocked);
      woodChip.classList.toggle("is-unavailable", !woodUnlocked);
      stoneChip.classList.toggle("is-unavailable", !stoneUnlocked);
      herbChip.classList.toggle("is-unavailable", !herbUnlocked);
      coinChip.classList.toggle("is-unavailable", !coinUnlocked);

      setSlot(handsSlot, handsUnlocked, true, state.ui.selectedSlot === "hands");
      setSlot(toolSlot, toolUnlocked, state.quest.pickaxeCrafted, state.ui.selectedSlot === "tool");
      setSlot(buildSlot, buildUnlocked, buildUnlocked, state.ui.selectedSlot === "build");
      setSlot(attackSlot, attackUnlocked, attackUnlocked, state.ui.selectedSlot === "attack");
      setSlot(packSlot, packUnlocked, packUnlocked, state.ui.selectedSlot === "pack");
      toolSlot.querySelector("strong")!.textContent = state.quest.axeCrafted ? "Axe" : state.quest.pickaxeCrafted ? "Pick" : "Tool";
      buildSlot.querySelector("strong")!.textContent = state.quest.tutorialStage === "buildCampfire" ? "Fire" : state.quest.tutorialStage === "repairBridge" ? "Bridge" : "Build";
      hotbar.classList.toggle("is-hidden", state.quest.tutorialStage === "wakeInCove");

      interactPrompt.textContent = state.action.prompt;
      interactPrompt.classList.toggle("is-hidden", state.action.prompt.length === 0);
      syncHarvestProgress(state, harvestProgress, harvestLabel, harvestPercent, harvestFill);

      toast.textContent = state.action.message;
      toast.classList.toggle("is-hidden", state.action.message.length === 0 || state.action.messageTimer <= 0);
      chapterCardTitle.textContent = state.action.chapterCueTitle;
      chapterCardText.textContent = state.action.chapterCueText;
      chapterCard.classList.toggle("is-hidden", state.action.chapterCueTimer <= 0);
    },
  };
}

function requireElement(root: HTMLElement, selector: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`HUD element is missing: ${selector}`);
  }
  return element;
}

function setSlot(slot: HTMLElement, unlocked: boolean, ready: boolean, selected: boolean): void {
  slot.classList.toggle("is-hidden", !unlocked);
  slot.classList.toggle("is-unlocked", unlocked);
  slot.classList.toggle("is-ready", unlocked && ready);
  slot.classList.toggle("is-locked", !ready);
  slot.classList.toggle("is-selected", selected && unlocked);
}

function syncHarvestProgress(
  state: GameState,
  panel: HTMLElement,
  label: HTMLElement,
  percent: HTMLElement,
  fill: HTMLElement,
): void {
  const active = state.action.harvestingNodeId.length > 0 && state.action.harvestingDuration > 0;
  panel.classList.toggle("is-hidden", !active);
  if (!active) return;

  const node = state.world.resourceNodes.find((item) => item.id === state.action.harvestingNodeId);
  const progress = 1 - state.action.harvestingTimer / state.action.harvestingDuration;
  const clamped = Math.max(0, Math.min(1, progress));
  label.textContent = node?.actionLabel ?? "Working";
  percent.textContent = `${Math.round(clamped * 100)}%`;
  fill.style.width = `${Math.round(clamped * 100)}%`;
}

function isAtLeast(current: TutorialStage, target: TutorialStage): boolean {
  return stageRank(current) >= stageRank(target);
}

function stageRank(stage: TutorialStage): number {
  const order: TutorialStage[] = [
    "wakeInCove",
    "walkToGuide",
    "intro",
    "gatherWood",
    "returnWood",
    "craftPickaxe",
    "mineStone",
    "returnStone",
    "buildShelter",
    "practiceSwing",
    "gatherHerbs",
    "returnHerbs",
    "buildCampfire",
    "craftAxe",
    "fellTree",
    "returnTree",
    "repairBridge",
    "clearGuardian",
    "returnGuardian",
    "firstCampReady",
  ];
  return order.indexOf(stage);
}

function totalResources(state: GameState): number {
  return state.resources.wood + state.resources.stone + state.resources.herb + state.resources.coin;
}

function chapterLabel(stage: TutorialStage): string {
  switch (stage) {
    case "wakeInCove":
    case "walkToGuide":
    case "intro":
      return "Morning Cove";
    case "gatherWood":
    case "returnWood":
      return "First Wood";
    case "craftPickaxe":
    case "mineStone":
    case "returnStone":
      return "First Tool";
    case "buildShelter":
    case "practiceSwing":
      return "First Shelter";
    case "gatherHerbs":
    case "returnHerbs":
    case "buildCampfire":
      return "First Fire";
    case "craftAxe":
    case "fellTree":
    case "returnTree":
      return "First Axe";
    case "repairBridge":
      return "Lower Crossing";
    case "clearGuardian":
    case "returnGuardian":
      return "First Guardian";
    case "firstCampReady":
      return "Trail Opens";
  }
}

function createHearts(health: number, maxHealth: number): HTMLElement[] {
  const count = Math.ceil(maxHealth / 2);
  return Array.from({ length: count }, (_, index) => {
    const heart = document.createElement("span");
    const filledUnits = Math.max(0, Math.min(2, health - index * 2));
    heart.className = `heart ${filledUnits === 2 ? "is-full" : filledUnits === 1 ? "is-half" : "is-empty"}`;
    return heart;
  });
}

function createQuestItem(item: { label: string; complete: boolean }): HTMLElement {
  const row = document.createElement("div");
  row.className = `quest-item${item.complete ? " is-complete" : ""}`;

  const mark = document.createElement("span");
  mark.className = "quest-mark";

  const label = document.createElement("span");
  label.textContent = item.label;

  row.append(mark, label);
  return row;
}

function createInventorySummary(state: GameState): HTMLElement[] {
  const rows = [
    ["Wood", state.resources.wood],
    ["Stone", state.resources.stone],
    ["Herbs", state.resources.herb],
    ["Coins", state.resources.coin],
    ["Pick", state.quest.pickaxeCrafted ? "Ready" : "Missing"],
    ["Camp", `Level ${state.quest.campLevel}`],
    ["Fire", state.quest.campfireBuilt ? "Lit" : "Unlit"],
  ] as const;

  return rows.map(([label, value]) => {
    const row = document.createElement("div");
    row.className = "inventory-row";

    const name = document.createElement("span");
    name.textContent = label;

    const amount = document.createElement("strong");
    amount.textContent = String(value);

    row.append(name, amount);
    return row;
  });
}
