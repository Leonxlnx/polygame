import * as THREE from "three";
import { createGameAudio } from "../../audio/createGameAudio";
import { biomeAt, terrainHeight } from "../../game/content/worldMap";
import { InputController } from "../../game/input/InputController";
import {
  GUIDE_NPC_POSITION,
  createGameState,
  type BuildingState,
  type EnemyState,
  type HarvestEvent,
} from "../../game/simulation/GameState";
import { updateQuest, updateSimulation } from "../../game/simulation/updateSimulation";
import { createHud } from "../../ui/hud";
import { CAMERA_OFFSET, createCamera, resizeCamera } from "./createCamera";
import { createRenderer } from "./createRenderer";
import { createScene } from "./createScene";
import {
  characterColorVariants,
  characterPresets,
  createPlayerCharacter,
  type CharacterEquipment,
  type CharacterColorId,
  type CharacterStyleId,
  type PlayerCharacter,
} from "../objects/createPlayerCharacter";
import { createTileWorld } from "../objects/createTileWorld";

type GamePhase = "menu" | "loading" | "characterSelect" | "playing";

type GameUi = {
  mainMenu: HTMLElement;
  loadingScreen: HTMLElement;
  characterSelect: HTMLElement;
  playButton: HTMLButtonElement;
  loadingProgress: HTMLElement;
  loadingCopy: HTMLElement;
  prevCharacter: HTMLButtonElement;
  nextCharacter: HTMLButtonElement;
  selectCharacter: HTMLButtonElement;
  characterName: HTMLElement;
  characterRole: HTMLElement;
  characterDescription: HTMLElement;
  characterIndex: HTMLElement;
  characterColorName: HTMLElement;
  colorPreview: HTMLElement;
  prevColor: HTMLButtonElement;
  nextColor: HTMLButtonElement;
  dialoguePanel: HTMLElement;
  dialogueSpeaker: HTMLElement;
  dialogueProgress: HTMLElement;
  dialogueText: HTMLElement;
  dialogueContinue: HTMLElement;
  settingsButton: HTMLButtonElement;
  hudSettingsButton: HTMLButtonElement;
  settingsPanel: HTMLElement;
  settingsClose: HTMLButtonElement;
  settingsAudio: HTMLInputElement;
  settingsMotion: HTMLInputElement;
};

type GameAppOptions = {
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  ui: GameUi;
  quickStart?: boolean;
  initialPhase?: Extract<GamePhase, "characterSelect">;
  debugSpawn?: { x: number; z: number };
};

type PreviewSlot = {
  wrapper: THREE.Group;
  character: PlayerCharacter;
};

type HarvestEffectView = {
  eventId: number;
  root: THREE.Group;
  age: number;
  duration: number;
  materials: THREE.Material[];
  parts: HarvestEffectPart[];
};

type HarvestEffectPart = {
  object: THREE.Object3D;
  origin: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  startScale: THREE.Vector3;
};

type StepDustView = {
  root: THREE.Group;
  age: number;
  duration: number;
  material: THREE.MeshBasicMaterial;
  pieces: THREE.Mesh[];
};

type ResourceFlyView = {
  element: HTMLElement;
  target?: HTMLElement;
  age: number;
  duration: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

type StaminaBarView = {
  root: THREE.Group;
  fill: THREE.Mesh;
};

type DialogueState = {
  active: boolean;
  speaker: string;
  lines: string[];
  lineIndex: number;
  visibleCharacters: number;
  lineComplete: boolean;
};

const loadingLines = [
  "Laying the first trail stones.",
  "Packing the morning tools.",
  "Warming the valley light.",
] as const;

export class GameApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly input = new InputController();
  private readonly state = createGameState();
  private readonly audio = createGameAudio();
  private readonly hud;
  private readonly hudRoot: HTMLElement;
  private readonly ui: GameUi;
  private readonly debugSpawn?: { x: number; z: number };
  private readonly clock = new THREE.Clock();
  private readonly tileWorld = createTileWorld();
  private readonly previewRoot = new THREE.Group();
  private readonly previewSlots: PreviewSlot[] = [];
  private readonly enemyRoot = new THREE.Group();
  private readonly enemyViews = new Map<string, THREE.Group>();
  private readonly buildingRoot = new THREE.Group();
  private readonly buildingViews = new Map<string, THREE.Group>();
  private readonly harvestRoot = new THREE.Group();
  private readonly stepRoot = new THREE.Group();
  private readonly resourceFlyRoot = document.createElement("div");
  private readonly staminaBar = createStaminaBar();
  private readonly buildPreview = createBuildPreview();
  private readonly hiddenPropIds = new Set<string>();
  private readonly harvestEffects: HarvestEffectView[] = [];
  private readonly stepDust: StepDustView[] = [];
  private readonly resourceFlyViews: ResourceFlyView[] = [];
  private readonly attackArc = createAttackArc();
  private readonly guideNpc: PlayerCharacter = createPlayerCharacter("warden", "ochre");
  private readonly cameraTarget = new THREE.Vector3();
  private readonly cameraOffset = CAMERA_OFFSET.clone();
  private readonly cameraLookDirection = new THREE.Vector3(0, 0, 0).sub(this.cameraOffset).normalize();
  private readonly dialogueCameraOffset = new THREE.Vector3(7.4, 9.6, 10.2);
  private readonly cameraLookTarget = new THREE.Vector3();
  private readonly menuLookTarget = new THREE.Vector3();
  private readonly dialogueFocus = new THREE.Vector3();
  private readonly presentationVelocity = new THREE.Vector3();
  private readonly selectCameraPosition = new THREE.Vector3(4.0, 5.0, 6.4);
  private readonly previewTargetPosition = new THREE.Vector3();
  private readonly previewTargetScale = new THREE.Vector3();
  private readonly previewIdleVelocity = new THREE.Vector3();
  private readonly dragState = { active: false, lastX: 0 };
  private renderedPlayerGroundY = 0;
  private lastHealth = this.state.player.health;
  private lastAttackPulse = 0;
  private lastActionMessage = "";
  private lastStepDistance = 0;
  private lastDialogueRequestId = 0;
  private readonly dialogueState: DialogueState = {
    active: false,
    speaker: "",
    lines: [],
    lineIndex: 0,
    visibleCharacters: 0,
    lineComplete: false,
  };
  private phase: GamePhase = "menu";
  private playerCharacter: PlayerCharacter = createPlayerCharacter("pathfinder", "forest");
  private selectedCharacterIndex = 0;
  private selectedColorIndex = 0;
  private previewRotation = 0.55;
  private cameraZoomPreference = 1;
  private processedHarvestEvents = 0;
  private loadingElapsed = 0;
  private loadingTimeout?: number;
  private loadingProgressTimeout?: number;
  private resizeObserver?: ResizeObserver;
  private running = false;

  constructor(options: GameAppOptions) {
    this.renderer = createRenderer(options.canvas);
    this.scene = createScene();
    this.camera = createCamera();
    this.hud = createHud(options.hud);
    this.hudRoot = options.hud;
    this.ui = options.ui;
    this.debugSpawn = options.debugSpawn;

    this.previewRoot.name = "CharacterSelectStage";
    this.previewRoot.visible = false;
    this.buildPreviewStage();
    this.enemyRoot.name = "Enemies";
    this.buildingRoot.name = "PlayerBuildings";
    this.stepRoot.name = "StepDust";
    this.attackArc.visible = false;
    this.buildPreview.visible = false;

    this.scene.add(this.tileWorld.root);
    this.scene.add(this.enemyRoot);
    this.scene.add(this.buildingRoot);
    this.scene.add(this.harvestRoot);
    this.scene.add(this.stepRoot);
    this.scene.add(this.staminaBar.root);
    this.scene.add(this.buildPreview);
    this.scene.add(this.attackArc);
    this.scene.add(this.previewRoot);
    this.scene.add(this.guideNpc.root);
    this.scene.add(this.playerCharacter.root);
    this.guideNpc.root.visible = false;
    this.playerCharacter.root.visible = false;
    this.resourceFlyRoot.className = "resource-fly-root";
    options.canvas.parentElement?.appendChild(this.resourceFlyRoot);

    this.bindUi();
    this.handleResize();
    if (options.quickStart) {
      this.startSelectedCharacter();
    } else if (options.initialPhase === "characterSelect") {
      this.phase = "characterSelect";
      this.previewRoot.visible = true;
      this.syncCharacterPanel();
      this.syncUi();
    } else {
      this.syncUi();
    }

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(options.canvas);
    options.canvas.addEventListener("pointerdown", this.handlePointerDown);
    options.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("keydown", this.handleMenuKeyDown);
    window.addEventListener("resize", this.handleResize);
    window.visualViewport?.addEventListener("resize", this.handleResize);
    options.canvas.addEventListener("webglcontextlost", this.handleContextLost);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(this.tick);
  }

  dispose(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver?.disconnect();
    this.input.dispose();
    this.tileWorld.dispose();
    this.playerCharacter.dispose();
    this.disposePreviewStage();
    disposeObjectTree(this.enemyRoot);
    disposeObjectTree(this.buildingRoot);
    disposeObjectTree(this.harvestRoot);
    disposeObjectTree(this.stepRoot);
    this.resourceFlyRoot.remove();
    disposeObjectTree(this.staminaBar.root);
    disposeObjectTree(this.buildPreview);
    disposeObjectTree(this.attackArc);
    this.guideNpc.dispose();
    this.clearLoadingTimers();
    this.ui.playButton.removeEventListener("click", this.beginLoading);
    this.ui.prevCharacter.removeEventListener("click", this.selectPreviousCharacter);
    this.ui.nextCharacter.removeEventListener("click", this.selectNextCharacter);
    this.ui.selectCharacter.removeEventListener("click", this.startSelectedCharacter);
    this.ui.prevColor.removeEventListener("click", this.selectPreviousColor);
    this.ui.nextColor.removeEventListener("click", this.selectNextColor);
    this.ui.dialoguePanel.removeEventListener("click", this.advanceDialogue);
    this.ui.settingsButton.removeEventListener("click", this.openSettings);
    this.ui.hudSettingsButton.removeEventListener("click", this.openSettings);
    this.ui.settingsClose.removeEventListener("click", this.closeSettings);
    this.ui.settingsAudio.removeEventListener("change", this.syncSettings);
    this.ui.settingsMotion.removeEventListener("change", this.syncSettings);
    this.renderer.domElement.removeEventListener("pointerdown", this.handlePointerDown);
    this.renderer.domElement.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("keydown", this.handleMenuKeyDown);
    window.removeEventListener("resize", this.handleResize);
    window.visualViewport?.removeEventListener("resize", this.handleResize);
    this.renderer.domElement.removeEventListener("webglcontextlost", this.handleContextLost);
    this.renderer.dispose();
  }

  private bindUi(): void {
    this.ui.playButton.addEventListener("click", this.beginLoading);
    this.ui.prevCharacter.addEventListener("click", this.selectPreviousCharacter);
    this.ui.nextCharacter.addEventListener("click", this.selectNextCharacter);
    this.ui.selectCharacter.addEventListener("click", this.startSelectedCharacter);
    this.ui.prevColor.addEventListener("click", this.selectPreviousColor);
    this.ui.nextColor.addEventListener("click", this.selectNextColor);
    this.ui.dialoguePanel.addEventListener("click", this.advanceDialogue);
    this.ui.settingsButton.addEventListener("click", this.openSettings);
    this.ui.hudSettingsButton.addEventListener("click", this.openSettings);
    this.ui.settingsClose.addEventListener("click", this.closeSettings);
    this.ui.settingsAudio.addEventListener("change", this.syncSettings);
    this.ui.settingsMotion.addEventListener("change", this.syncSettings);
  }

  private readonly openSettings = (): void => {
    this.ui.settingsPanel.classList.remove("is-hidden");
    this.audio.playSelect();
  };

  private readonly closeSettings = (): void => {
    this.ui.settingsPanel.classList.add("is-hidden");
    this.audio.playSelect();
  };

  private readonly syncSettings = (): void => {
    this.audio.setMuted(!this.ui.settingsAudio.checked);
    document.documentElement.classList.toggle("reduce-motion", this.ui.settingsMotion.checked);
  };

  private readonly beginLoading = (): void => {
    this.audio.unlock();
    this.audio.playStart();
    this.phase = "loading";
    this.loadingElapsed = 0;
    this.ui.loadingProgress.style.width = "0%";
    this.ui.loadingCopy.textContent = loadingLines[0];
    this.clearLoadingTimers();
    this.loadingProgressTimeout = window.setTimeout(() => {
      if (this.phase === "loading") {
        this.ui.loadingProgress.style.width = "100%";
        this.ui.loadingCopy.textContent = loadingLines[1];
      }
    }, 30);
    this.loadingTimeout = window.setTimeout(() => {
      if (this.phase === "loading") {
        this.completeLoading();
      }
    }, 1250);
    this.syncUi();
  };

  private readonly selectPreviousCharacter = (): void => {
    this.audio.unlock();
    this.audio.playSelect();
    this.selectedCharacterIndex = (this.selectedCharacterIndex + characterPresets.length - 1) % characterPresets.length;
    this.previewRotation = 0.55;
    this.syncCharacterPanel();
    this.triggerCharacterSwitch();
  };

  private readonly selectNextCharacter = (): void => {
    this.audio.unlock();
    this.audio.playSelect();
    this.selectedCharacterIndex = (this.selectedCharacterIndex + 1) % characterPresets.length;
    this.previewRotation = 0.55;
    this.syncCharacterPanel();
    this.triggerCharacterSwitch();
  };

  private readonly selectPreviousColor = (): void => {
    this.audio.unlock();
    this.audio.playSelect();
    this.selectedColorIndex = (this.selectedColorIndex + characterColorVariants.length - 1) % characterColorVariants.length;
    this.rebuildPreviewStage();
    this.syncCharacterPanel();
    this.triggerCharacterSwitch();
  };

  private readonly selectNextColor = (): void => {
    this.audio.unlock();
    this.audio.playSelect();
    this.selectedColorIndex = (this.selectedColorIndex + 1) % characterColorVariants.length;
    this.rebuildPreviewStage();
    this.syncCharacterPanel();
    this.triggerCharacterSwitch();
  };

  private readonly startSelectedCharacter = (): void => {
    this.audio.unlock();
    this.audio.playStart();
    const selected = characterPresets[this.selectedCharacterIndex];
    this.replacePlayableCharacter(selected.id, this.selectedColorId());
    const spawn = this.debugSpawn ?? this.state.player.spawn;
    this.state.player.position.set(spawn.x, 0.38, spawn.z);
    this.state.player.velocity.set(0, 0, 0);
    this.state.player.spawn.set(spawn.x, 0.38, spawn.z);
    this.state.world.currentBiome = biomeAt(spawn.x, spawn.z);
    this.renderedPlayerGroundY = terrainHeight(spawn.x, spawn.z);
    if (this.debugSpawn) {
      this.state.quest.combatUnlocked = true;
      this.state.quest.attackPracticed = true;
      this.state.quest.tutorialStage = "firstCampReady";
      this.state.quest.pickaxeCrafted = true;
      this.state.player.invulnerable = 3;
      this.state.action.message = "";
      this.state.action.messageTimer = 0;
    } else {
      this.state.quest.tutorialStage = "wakeInCove";
      this.state.player.stamina = this.state.player.maxStamina;
      this.state.player.staminaVisibleTimer = 0;
      this.state.player.distanceWalked = 0;
      this.state.action.message = "";
      this.state.action.messageTimer = 0;
      this.state.action.chapterCueTitle = "Chapter 1";
      this.state.action.chapterCueText = "Morning Cove";
      this.state.action.chapterCueTimer = 3.2;
    }
    this.phase = "playing";
    this.previewRoot.visible = false;
    this.playerCharacter.root.visible = true;
    this.syncPlayer(0);
    if (this.debugSpawn) {
      this.camera.position.copy(this.state.player.position).add(this.cameraOffset);
      this.cameraLookTarget.copy(this.camera.position).add(this.cameraLookDirection);
      this.camera.lookAt(this.cameraLookTarget);
      this.camera.updateProjectionMatrix();
    }
    updateQuest(this.state);
    this.syncUi();
    this.syncDialogue(0);
    this.hud.update(this.state);
  };

  private readonly tick = (): void => {
    const deltaSeconds = Math.min(this.clock.getDelta(), 1 / 30);

    if (this.phase === "loading") {
      this.updateLoading(deltaSeconds);
    }

    if (this.phase === "playing") {
      const input = this.input.getVector();
      if (this.dialogueState.active) {
        input.x = 0;
        input.z = 0;
        input.attack = false;
        input.interact = false;
        input.build = false;
        input.inventory = false;
      }
      updateSimulation(this.state, input, deltaSeconds);
      this.syncPlayer(deltaSeconds);
      this.syncWorldActors(deltaSeconds);
      this.syncDialogue(deltaSeconds);
      this.syncAudioFeedback();
      this.hud.update(this.state);
    } else {
      this.playerCharacter.root.visible = false;
      this.guideNpc.root.visible = false;
      this.syncDialogue(deltaSeconds);
      this.updatePreviewStage(deltaSeconds);
    }

    this.syncCamera(deltaSeconds);
    this.renderer.render(this.scene, this.camera);
  };

  private updateLoading(deltaSeconds: number): void {
    this.loadingElapsed += deltaSeconds;
    const progress = THREE.MathUtils.clamp(this.loadingElapsed / 1.25, 0, 1);
    this.ui.loadingProgress.style.width = `${Math.round(progress * 100)}%`;

    if (progress >= 1) {
      this.completeLoading();
    }
  }

  private completeLoading(): void {
    this.clearLoadingTimers();
    this.phase = "characterSelect";
    this.previewRoot.visible = true;
    this.syncCharacterPanel();
    this.syncUi();
  }

  private clearLoadingTimers(): void {
    if (this.loadingTimeout !== undefined) {
      window.clearTimeout(this.loadingTimeout);
      this.loadingTimeout = undefined;
    }
    if (this.loadingProgressTimeout !== undefined) {
      window.clearTimeout(this.loadingProgressTimeout);
      this.loadingProgressTimeout = undefined;
    }
  }

  private syncPlayer(deltaSeconds: number): void {
    const { position, velocity } = this.state.player;
    const targetGroundY = terrainHeight(position.x, position.z);
    const smooth = deltaSeconds <= 0 ? 1 : 1 - Math.exp(-18 * deltaSeconds);
    this.renderedPlayerGroundY = THREE.MathUtils.lerp(this.renderedPlayerGroundY, targetGroundY, smooth);
    this.playerCharacter.root.position.set(position.x, this.renderedPlayerGroundY, position.z);
    this.presentationVelocity.copy(velocity);
    if (this.dialogueState.active) {
      this.presentationVelocity.set(GUIDE_NPC_POSITION.x - position.x, 0, GUIDE_NPC_POSITION.z - position.z);
      if (this.presentationVelocity.lengthSq() > 0.001) {
        this.presentationVelocity.normalize().multiplyScalar(0.22);
      }
    }
    this.playerCharacter.update(
      deltaSeconds,
      this.presentationVelocity,
      this.clock.elapsedTime,
      this.state.action.attackPulse,
      this.state.action.gatherPulse,
      0,
      this.currentEquipment(),
    );

    const speed = Math.hypot(velocity.x, velocity.z);
    if (!this.dialogueState.active && speed > 1.05 && this.state.player.distanceWalked - this.lastStepDistance > 0.92) {
      this.lastStepDistance = this.state.player.distanceWalked;
      this.audio.playStep();
      const side = Math.sin(this.state.player.distanceWalked * 5.4) > 0 ? 1 : -1;
      const sidewaysX = Math.cos(this.state.player.facingYaw) * side * 0.18;
      const sidewaysZ = -Math.sin(this.state.player.facingYaw) * side * 0.18;
      const step = createStepDustView(position.x + sidewaysX, position.z + sidewaysZ, this.state.player.facingYaw, terrainHeight(position.x, position.z));
      this.stepDust.push(step);
      this.stepRoot.add(step.root);
    }

    this.syncStaminaBar();
  }

  private syncStaminaBar(): void {
    const visible = this.phase === "playing" && !this.dialogueState.active && this.state.player.staminaVisibleTimer > 0;
    this.staminaBar.root.visible = visible;
    if (!visible) return;

    const ratio = THREE.MathUtils.clamp(this.state.player.stamina / this.state.player.maxStamina, 0, 1);
    const { position } = this.state.player;
    this.staminaBar.root.position.set(position.x, this.renderedPlayerGroundY + 2.05, position.z);
    this.staminaBar.root.quaternion.copy(this.camera.quaternion);
    this.staminaBar.fill.scale.x = Math.max(0.02, ratio);
    this.staminaBar.fill.position.x = -0.33 * (1 - ratio);
  }

  private syncAudioFeedback(): void {
    if (this.state.action.attackPulse > this.lastAttackPulse) {
      this.audio.playAttack();
    }

    if (this.state.player.health < this.lastHealth) {
      this.audio.playDamage();
    }

    if (this.state.action.message && this.state.action.message !== this.lastActionMessage) {
      if (this.state.action.message.startsWith("Collected")) {
        this.audio.playGather();
      } else if (this.state.action.message.includes("placed") || this.state.action.message.includes("lit")) {
        this.audio.playBuild();
      } else if (this.state.action.message.startsWith("Entered")) {
        this.audio.playRegion();
      }
    }

    this.lastAttackPulse = this.state.action.attackPulse;
    this.lastHealth = this.state.player.health;
    this.lastActionMessage = this.state.action.message;
  }

  private syncWorldActors(deltaSeconds: number): void {
    this.syncGuideNpc(deltaSeconds);
    this.syncStepDust(deltaSeconds);
    this.syncHarvestedProps(deltaSeconds);
    this.syncResourceFly(deltaSeconds);
    this.syncEnemies(deltaSeconds);
    this.syncBuildings();
    this.syncBuildPreview();
    this.syncAttackArc();
  }

  private syncStepDust(deltaSeconds: number): void {
    for (let index = this.stepDust.length - 1; index >= 0; index -= 1) {
      const dust = this.stepDust[index];
      dust.age += deltaSeconds;
      const t = THREE.MathUtils.clamp(dust.age / dust.duration, 0, 1);
      dust.root.position.y += deltaSeconds * 0.02;
      dust.root.scale.setScalar(THREE.MathUtils.lerp(0.84, 1.42, t));
      dust.material.opacity = THREE.MathUtils.lerp(0.22, 0, t);
      dust.pieces.forEach((piece, pieceIndex) => {
        piece.position.x += Math.sin(pieceIndex * 1.9 + dust.age * 4) * deltaSeconds * 0.035;
        piece.position.z += Math.cos(pieceIndex * 1.7 + dust.age * 4) * deltaSeconds * 0.035;
      });

      if (t >= 1) {
        this.stepRoot.remove(dust.root);
        disposeObjectTree(dust.root);
        this.stepDust.splice(index, 1);
      }
    }
  }

  private syncHarvestedProps(deltaSeconds: number): void {
    const events = this.state.action.harvestEvents;
    while (this.processedHarvestEvents < events.length) {
      const event = events[this.processedHarvestEvents];
      this.processedHarvestEvents += 1;
      if (event.final) {
        this.hiddenPropIds.add(event.nodeId);
        this.spawnResourceFly(event);
      }
      this.harvestEffects.push(createHarvestEffectView(event));
      this.harvestRoot.add(this.harvestEffects[this.harvestEffects.length - 1].root);
    }

    this.tileWorld.setHiddenPropIds(this.hiddenPropIds);

    for (let index = this.harvestEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.harvestEffects[index];
      effect.age += deltaSeconds;
      const t = THREE.MathUtils.clamp(effect.age / effect.duration, 0, 1);
      const lift = Math.sin(t * Math.PI) * 0.08;
      effect.root.position.y = lift;
      effect.root.rotation.y += deltaSeconds * 0.24;
      effect.parts.forEach((part) => {
        const age = effect.age;
        part.object.position.set(
          part.origin.x + part.velocity.x * age,
          part.origin.y + part.velocity.y * age - age * age * 0.86,
          part.origin.z + part.velocity.z * age,
        );
        part.object.rotation.x += part.spin.x * deltaSeconds;
        part.object.rotation.y += part.spin.y * deltaSeconds;
        part.object.rotation.z += part.spin.z * deltaSeconds;
        part.object.scale.copy(part.startScale).multiplyScalar(THREE.MathUtils.lerp(1, 0.24, t));
      });
      effect.materials.forEach((material) => {
        if ("opacity" in material) {
          material.transparent = true;
          material.opacity = THREE.MathUtils.lerp(0.92, 0, t);
        }
      });

      if (t >= 1) {
        this.harvestRoot.remove(effect.root);
        disposeObjectTree(effect.root);
        this.harvestEffects.splice(index, 1);
      }
    }
  }

  private spawnResourceFly(event: HarvestEvent): void {
    if (event.resource === "lore") return;

    const start = this.worldToScreen(event.x, terrainHeight(event.x, event.z) + 0.82, event.z);
    const target = this.hudRoot.querySelector<HTMLElement>(`.resource-${event.resource}`);
    const targetRect = target?.getBoundingClientRect();
    const targetX = targetRect ? targetRect.left + targetRect.width * 0.62 : window.innerWidth - 78;
    const targetY = targetRect ? targetRect.top + targetRect.height * 0.48 : 34;
    const element = document.createElement("div");
    element.className = `resource-fly resource-fly-${event.resource}`;
    element.innerHTML = `<i aria-hidden="true"></i><span>+${Math.max(1, event.amount)}</span>`;
    this.resourceFlyRoot.appendChild(element);

    this.resourceFlyViews.push({
      element,
      target: target ?? undefined,
      age: 0,
      duration: 0.86,
      startX: start.x,
      startY: start.y,
      targetX,
      targetY,
    });
  }

  private syncResourceFly(deltaSeconds: number): void {
    for (let index = this.resourceFlyViews.length - 1; index >= 0; index -= 1) {
      const view = this.resourceFlyViews[index];
      view.age += deltaSeconds;
      const t = THREE.MathUtils.clamp(view.age / view.duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      const arc = Math.sin(t * Math.PI) * 84;
      const x = THREE.MathUtils.lerp(view.startX, view.targetX, eased);
      const y = THREE.MathUtils.lerp(view.startY, view.targetY, eased) - arc;
      const scale = THREE.MathUtils.lerp(0.78, 1.08, Math.sin(t * Math.PI));
      view.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
      view.element.style.opacity = `${THREE.MathUtils.lerp(1, 0.08, Math.max(0, (t - 0.78) / 0.22))}`;

      if (t >= 1) {
        view.target?.classList.add("is-bumped");
        window.setTimeout(() => view.target?.classList.remove("is-bumped"), 220);
        view.element.remove();
        this.resourceFlyViews.splice(index, 1);
      }
    }
  }

  private worldToScreen(x: number, y: number, z: number): { x: number; y: number } {
    const point = new THREE.Vector3(x, y, z).project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();

    return {
      x: rect.left + (point.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-point.y * 0.5 + 0.5) * rect.height,
    };
  }

  private syncGuideNpc(deltaSeconds: number): void {
    this.guideNpc.root.visible = !this.debugSpawn && this.phase === "playing";
    if (!this.guideNpc.root.visible) return;

    const guideY = terrainHeight(GUIDE_NPC_POSITION.x, GUIDE_NPC_POSITION.z);
    this.guideNpc.root.position.set(GUIDE_NPC_POSITION.x, guideY, GUIDE_NPC_POSITION.z);
    const talkAmount = this.dialogueState.active && this.dialogueState.speaker === "Edda" ? 1 : 0;
    this.guideNpc.update(deltaSeconds, this.previewIdleVelocity, this.clock.elapsedTime + 1.8, 0, 0, talkAmount, "hands");

    const facing = this.guideNpc.root.getObjectByName("CharacterRig");
    if (facing) {
      const dx = this.state.player.position.x - GUIDE_NPC_POSITION.x;
      const dz = this.state.player.position.z - GUIDE_NPC_POSITION.z;
      facing.rotation.y = Math.atan2(dx, dz);
    }
  }

  private syncEnemies(deltaSeconds: number): void {
    const enemiesVisible = this.state.quest.combatUnlocked;
    this.state.world.enemies.forEach((enemy) => {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = createEnemyView(enemy);
        this.enemyViews.set(enemy.id, view);
        this.enemyRoot.add(view);
      }

      view.visible = enemiesVisible && !enemy.defeated;
      if (!view.visible) return;

      const targetY = terrainHeight(enemy.position.x, enemy.position.z);
      view.position.set(enemy.position.x, targetY, enemy.position.z);
      const speed = enemy.velocity.length();
      if (speed > 0.02) {
        view.rotation.y = THREE.MathUtils.lerp(view.rotation.y, Math.atan2(enemy.velocity.x, enemy.velocity.z), 1 - Math.exp(-9 * deltaSeconds));
      }
      view.scale.setScalar(enemy.hurtFlash > 0 ? 1.08 : 1);
      const hitBurst = view.getObjectByName("EnemyHitBurst");
      if (hitBurst) {
        hitBurst.visible = enemy.hurtFlash > 0;
        hitBurst.rotation.y += deltaSeconds * 7;
        hitBurst.scale.setScalar(1 + (0.18 - enemy.hurtFlash) * 3.2);
      }
      const healthFill = view.getObjectByName("EnemyHealthFill");
      if (healthFill) {
        healthFill.scale.x = Math.max(0.05, enemy.health / enemy.maxHealth);
      }
    });
  }

  private syncBuildings(): void {
    this.state.world.buildings.forEach((building) => {
      let view = this.buildingViews.get(building.id);
      if (!view) {
        view = createBuildingView(building);
        this.buildingViews.set(building.id, view);
        this.buildingRoot.add(view);
      }

      if (building.kind === "campfire") {
        const flame = view.getObjectByName("CampfireFlame");
        const core = view.getObjectByName("CampfireCore");
        const flicker = 1 + Math.sin(this.clock.elapsedTime * 9.4 + building.position.x) * 0.055;
        flame?.scale.set(0.92 * flicker, 1.05 + (flicker - 1) * 1.2, 0.92 * flicker);
        core?.scale.set(0.82 + (flicker - 1) * 0.6, 1, 0.82 + (flicker - 1) * 0.6);
      }
    });
  }

  private syncBuildPreview(): void {
    const stage = this.state.quest.tutorialStage;
    const previewKind = stage === "buildShelter" ? "cabin" : stage === "buildCampfire" ? "campfire" : "";
    this.buildPreview.visible = previewKind.length > 0 && this.phase === "playing" && !this.dialogueState.active;
    if (!this.buildPreview.visible) return;

    const yaw = this.state.player.facingYaw;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const distance = previewKind === "campfire" ? 1.8 : 2.2;
    const x = this.state.player.position.x + forwardX * distance;
    const z = this.state.player.position.z + forwardZ * distance;
    const canAfford = previewKind === "campfire"
      ? this.state.resources.wood >= 2 && this.state.resources.stone >= 1 && this.state.resources.herb >= 1
      : this.state.resources.wood >= 2 && this.state.resources.stone >= 1;

    this.buildPreview.position.set(x, terrainHeight(x, z) + 0.035, z);
    this.buildPreview.rotation.y = yaw + Math.PI;
    this.buildPreview.getObjectByName("PreviewCabin")!.visible = previewKind === "cabin";
    this.buildPreview.getObjectByName("PreviewCampfire")!.visible = previewKind === "campfire";
    this.buildPreview.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (!material || Array.isArray(material)) return;
      const tintable = material as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
      if (tintable.color) {
        tintable.color.set(canAfford ? "#f2dda0" : "#d69a76");
      }
      if ("opacity" in tintable) {
        tintable.opacity = canAfford ? 0.48 : 0.28;
      }
    });
    const pulse = 1 + Math.sin(this.clock.elapsedTime * 4.1) * 0.025;
    this.buildPreview.scale.setScalar(pulse);
  }

  private syncAttackArc(): void {
    const pulse = this.state.action.attackPulse;
    this.attackArc.visible = pulse > 0;
    if (!this.attackArc.visible) return;

    const yaw = this.state.player.facingYaw;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const progress = THREE.MathUtils.clamp(1 - pulse / 0.34, 0, 1);
    const pulseScale = THREE.MathUtils.lerp(0.78, 1.48, progress);
    this.attackArc.position.set(
      this.state.player.position.x + forwardX * 1.05,
      terrainHeight(this.state.player.position.x, this.state.player.position.z) + 0.12,
      this.state.player.position.z + forwardZ * 1.05,
    );
    this.attackArc.rotation.y = yaw;
    this.attackArc.scale.setScalar(pulseScale);
    this.attackArc.traverse((object) => {
      const material = (object as THREE.Mesh).material;
      if (!material || Array.isArray(material)) return;
      if ("opacity" in material) {
        material.opacity = THREE.MathUtils.lerp(0.62, 0.04, progress);
      }
    });
  }

  private syncDialogue(deltaSeconds: number): void {
    const request = this.state.action.dialogueRequest;
    if (request.id !== this.lastDialogueRequestId) {
      this.lastDialogueRequestId = request.id;
      if (request.lines.length > 0) {
        this.dialogueState.active = true;
        this.dialogueState.speaker = request.speaker;
        this.dialogueState.lines = request.lines;
        this.dialogueState.lineIndex = 0;
        this.dialogueState.visibleCharacters = request.lines[0]?.length ? 1 : 0;
        this.dialogueState.lineComplete = false;
      }
    }

    this.ui.dialoguePanel.classList.toggle("is-hidden", !this.dialogueState.active || this.phase !== "playing");
    this.ui.dialoguePanel.classList.toggle("is-speaking", this.dialogueState.active && !this.dialogueState.lineComplete);
    if (!this.dialogueState.active || this.phase !== "playing") return;

    const line = this.dialogueState.lines[this.dialogueState.lineIndex] ?? "";
    this.dialogueState.visibleCharacters = Math.min(line.length, this.dialogueState.visibleCharacters + deltaSeconds * 46);
    const visibleLength = Math.floor(this.dialogueState.visibleCharacters);
    this.dialogueState.lineComplete = visibleLength >= line.length;
    this.ui.dialogueSpeaker.textContent = this.dialogueState.speaker;
    this.ui.dialogueProgress.textContent = `${String(this.dialogueState.lineIndex + 1).padStart(2, "0")} / ${String(this.dialogueState.lines.length).padStart(2, "0")}`;
    this.ui.dialogueText.textContent = line.slice(0, visibleLength);
    this.ui.dialogueContinue.textContent = this.dialogueState.lineComplete ? "Click" : "";
    this.ui.dialoguePanel.classList.toggle("is-complete", this.dialogueState.lineComplete);
    this.ui.dialoguePanel.classList.toggle("is-speaking", !this.dialogueState.lineComplete);
  }

  private readonly advanceDialogue = (): void => {
    if (this.phase !== "playing" || !this.dialogueState.active) return;

    const line = this.dialogueState.lines[this.dialogueState.lineIndex] ?? "";
    if (!this.dialogueState.lineComplete) {
      this.dialogueState.visibleCharacters = line.length;
      this.dialogueState.lineComplete = true;
      this.ui.dialogueText.textContent = line;
      this.ui.dialogueContinue.textContent = "Click";
      this.ui.dialoguePanel.classList.add("is-complete");
      return;
    }

    if (this.dialogueState.lineIndex < this.dialogueState.lines.length - 1) {
      this.dialogueState.lineIndex += 1;
      this.dialogueState.visibleCharacters = 0;
      this.dialogueState.lineComplete = false;
      this.ui.dialogueText.textContent = "";
      this.ui.dialogueContinue.textContent = "";
      this.ui.dialoguePanel.classList.remove("is-complete");
      this.audio.playSelect();
      return;
    }

    this.dialogueState.active = false;
    if (this.state.quest.tutorialStage === "intro") {
      this.state.quest.tutorialStage = "gatherWood";
      updateQuest(this.state);
      this.hud.update(this.state);
    }
    this.ui.dialoguePanel.classList.add("is-hidden");
    this.ui.dialoguePanel.classList.remove("is-speaking");
    this.audio.playSelect();
  };

  private syncCamera(deltaSeconds: number): void {
    const follow = 1 - Math.exp(-7.5 * deltaSeconds);

    if (this.phase === "playing") {
      const playerPosition = this.state.player.position;
      if (this.dialogueState.active) {
        this.dialogueFocus
          .set(
            (playerPosition.x + GUIDE_NPC_POSITION.x) * 0.5 + 0.1,
            0.9,
            (playerPosition.z + GUIDE_NPC_POSITION.z) * 0.5 + 0.12,
          );
        const desiredPosition = this.cameraTarget.copy(this.dialogueFocus).add(this.dialogueCameraOffset);
        this.camera.position.lerp(desiredPosition, 1 - Math.exp(-8.8 * deltaSeconds));
        this.camera.lookAt(this.dialogueFocus);
        this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, 1.62 * this.cameraZoomPreference, 1 - Math.exp(-8.8 * deltaSeconds));
        this.camera.updateProjectionMatrix();
        return;
      }

      const desiredPosition = this.cameraTarget.copy(playerPosition).add(this.cameraOffset);
      this.camera.position.lerp(desiredPosition, follow);
      this.cameraLookTarget.copy(this.camera.position).add(this.cameraLookDirection);
      this.camera.lookAt(this.cameraLookTarget);
      const baseZoom = this.state.quest.combatUnlocked ? 1.03 : 1.1;
      const targetZoom = baseZoom * this.cameraZoomPreference;
      this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, targetZoom, follow);
    } else if (this.phase === "characterSelect") {
      this.camera.position.lerp(this.selectCameraPosition, follow);
      this.camera.lookAt(0, 1.08, 0);
      this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, 2.04, follow);
    } else {
      const sway = Math.sin(this.clock.elapsedTime * 0.18) * 1.2;
      this.menuLookTarget.set(sway, 0, -1.2);
      this.camera.position.lerp(new THREE.Vector3(10.5 + sway * 0.2, 18, 10.5), follow);
      this.camera.lookAt(this.menuLookTarget);
      this.camera.zoom = THREE.MathUtils.lerp(this.camera.zoom, 1.02, follow);
    }

    this.camera.updateProjectionMatrix();
  }

  private buildPreviewStage(): void {
    characterPresets.forEach((preset, index) => {
      const wrapper = new THREE.Group();
      wrapper.name = `${preset.name}Preview`;

      const character = createPlayerCharacter(preset.id, this.selectedColorId());
      character.root.position.y = 0;
      wrapper.add(character.root);

      this.previewRoot.add(wrapper);
      this.previewSlots[index] = { wrapper, character };
    });
  }

  private updatePreviewStage(deltaSeconds: number): void {
    const elapsed = this.clock.elapsedTime;
    this.previewSlots.forEach((slot, index) => {
      const offset = shortestCarouselOffset(index - this.selectedCharacterIndex, characterPresets.length);
      const visible = this.phase === "characterSelect" && Math.abs(offset) <= 1.5;
      const side = Math.sign(offset);
      const distance = Math.abs(offset);
      const targetScale = offset === 0 ? 1.3 : 0.64;

      slot.wrapper.visible = visible;
      this.previewTargetPosition.set(offset * 2.1, 0, distance * 0.68);
      this.previewTargetScale.set(targetScale, targetScale, targetScale);
      slot.wrapper.position.lerp(this.previewTargetPosition, 1 - Math.exp(-12 * deltaSeconds));
      slot.wrapper.scale.lerp(this.previewTargetScale, 1 - Math.exp(-12 * deltaSeconds));
      const targetRotation = offset === 0 ? this.previewRotation : 0.55 + side * 0.72;
      slot.wrapper.rotation.y = dampAngle(slot.wrapper.rotation.y, targetRotation, 12, deltaSeconds);
      slot.wrapper.position.y = Math.sin(elapsed * 1.18 + index * 0.8) * (offset === 0 ? 0.012 : 0.006);
      slot.character.update(deltaSeconds, this.previewIdleVelocity, elapsed + index * 0.45);
    });
  }

  private syncUi(): void {
    this.setScreen(this.ui.mainMenu, this.phase === "menu");
    this.setScreen(this.ui.loadingScreen, this.phase === "loading");
    this.setScreen(this.ui.characterSelect, this.phase === "characterSelect");
    this.hudRoot.classList.toggle("is-hidden", this.phase !== "playing");
  }

  private syncCharacterPanel(): void {
    const selected = characterPresets[this.selectedCharacterIndex];
    const color = characterColorVariants[this.selectedColorIndex];
    this.ui.characterName.textContent = selected.name;
    this.ui.characterRole.textContent = selected.role;
    this.ui.characterDescription.textContent = selected.description;
    this.ui.characterIndex.textContent = `${String(this.selectedCharacterIndex + 1).padStart(2, "0")} / ${String(characterPresets.length).padStart(2, "0")}`;
    this.ui.characterColorName.textContent = color.name;
    this.ui.colorPreview.style.setProperty("--swatch-primary", color.colors.tunic);
    this.ui.colorPreview.style.setProperty("--swatch-secondary", color.colors.darkTunic);
    this.ui.colorPreview.style.setProperty("--swatch-accent", color.colors.trim);
  }

  private triggerCharacterSwitch(): void {
    const panel = this.ui.characterSelect.querySelector(".character-panel");
    if (!(panel instanceof HTMLElement)) return;
    panel.classList.remove("is-switching");
    void panel.offsetWidth;
    panel.classList.add("is-switching");
  }

  private setScreen(element: HTMLElement, visible: boolean): void {
    element.classList.toggle("is-hidden", !visible);
  }

  private replacePlayableCharacter(styleId: CharacterStyleId, colorId: CharacterColorId): void {
    this.scene.remove(this.playerCharacter.root);
    this.playerCharacter.dispose();
    this.playerCharacter = createPlayerCharacter(styleId, colorId);
    this.scene.add(this.playerCharacter.root);
  }

  private rebuildPreviewStage(): void {
    const wasVisible = this.previewRoot.visible;
    this.disposePreviewStage();
    this.buildPreviewStage();
    this.previewRoot.visible = wasVisible;
  }

  private disposePreviewStage(): void {
    this.previewSlots.forEach((slot) => {
      slot.character.dispose();
    });
    this.previewSlots.length = 0;
    this.previewRoot.clear();
  }

  private selectedColorId(): CharacterColorId {
    return characterColorVariants[this.selectedColorIndex]?.id ?? characterColorVariants[0].id;
  }

  private currentEquipment(): CharacterEquipment {
    if (this.state.action.attackPulse > 0) return "sword";
    if (this.state.action.gatherPulse > 0) return this.state.action.toolMotion;

    switch (this.state.ui.selectedSlot) {
      case "tool":
        return this.state.quest.pickaxeCrafted ? "pick" : "hands";
      case "build":
        return "build";
      case "attack":
        return "sword";
      case "hands":
      case "pack":
        return "hands";
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (this.phase !== "characterSelect") return;
    this.dragState.active = true;
    this.dragState.lastX = event.clientX;
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragState.active || this.phase !== "characterSelect") return;
    const deltaX = event.clientX - this.dragState.lastX;
    this.dragState.lastX = event.clientX;
    this.previewRotation += deltaX * 0.012;
  };

  private readonly handlePointerUp = (): void => {
    this.dragState.active = false;
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (this.phase !== "playing") return;
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    this.cameraZoomPreference = THREE.MathUtils.clamp(this.cameraZoomPreference - direction * 0.08, 0.82, 1.28);
  };

  private readonly handleMenuKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    if (this.phase === "playing" && this.dialogueState.active && (event.key === "Enter" || event.key === " " || event.key.toLowerCase() === "e")) {
      event.preventDefault();
      this.advanceDialogue();
      return;
    }

    if (this.phase === "menu" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      this.beginLoading();
      return;
    }

    if (this.phase !== "characterSelect") return;

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      this.selectPreviousCharacter();
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      this.selectNextCharacter();
    } else if (event.key.toLowerCase() === "q") {
      event.preventDefault();
      this.selectPreviousColor();
    } else if (event.key.toLowerCase() === "e") {
      event.preventDefault();
      this.selectNextColor();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.startSelectedCharacter();
    }
  };

  private readonly handleResize = (): void => {
    const canvas = this.renderer.domElement;
    const width = Math.max(
      1,
      Math.round(canvas.clientWidth),
      Math.round(window.innerWidth),
      Math.round(document.documentElement.clientWidth),
    );
    const height = Math.max(
      1,
      Math.round(canvas.clientHeight),
      Math.round(window.innerHeight),
      Math.round(document.documentElement.clientHeight),
    );

    resizeCamera(this.camera, width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.setSize(width, height, false);
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.running = false;
    this.renderer.setAnimationLoop(null);
  };
}

function shortestCarouselOffset(offset: number, length: number): number {
  if (offset > length / 2) return offset - length;
  if (offset < -length / 2) return offset + length;
  return offset;
}

function dampAngle(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-smoothing * deltaSeconds));
}

function createHarvestEffectView(event: HarvestEvent): HarvestEffectView {
  const root = new THREE.Group();
  root.name = `HarvestEffect-${event.nodeId}`;
  root.position.set(event.x, terrainHeight(event.x, event.z) + 0.08, event.z);
  const materials: THREE.Material[] = [];
  const parts: HarvestEffectPart[] = [];
  const finalBoost = event.final ? 1 : 0.58;
  const progressLift = event.totalHits > 1 ? event.hitIndex / event.totalHits : 1;

  if (event.resource === "stone") {
    const stoneColors = ["#77796b", "#5d655b", "#8a8877"];
    const count = event.final ? 7 : 4;
    for (let index = 0; index < count; index += 1) {
      const material = new THREE.MeshStandardMaterial({ color: stoneColors[index % stoneColors.length], roughness: 0.96, flatShading: true, transparent: true, opacity: 0.92 });
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + index * 0.012, 0), material);
      const angle = index * 1.28 + event.x;
      shard.position.set(Math.sin(angle) * (0.12 + index * 0.035), 0.12 + index * 0.025, Math.cos(angle) * (0.1 + index * 0.03));
      shard.rotation.set(index * 0.4, angle, index * 0.2);
      registerHarvestPart(root, parts, shard, angle, (0.42 + index * 0.04) * finalBoost, (0.72 + index * 0.05) * finalBoost);
      materials.push(material);
    }
  } else if (event.resource === "wood") {
    const barkMaterial = new THREE.MeshStandardMaterial({ color: "#6b4529", roughness: 0.95, flatShading: true, transparent: true, opacity: 0.92 });
    const cutMaterial = new THREE.MeshStandardMaterial({ color: "#b9854f", roughness: 0.9, flatShading: true, transparent: true, opacity: 0.92 });
    materials.push(barkMaterial, cutMaterial);
    const count = event.final ? 6 : 3;
    for (let index = 0; index < count; index += 1) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.1 + (index % 2) * 0.035, 0.1, 0.28 + index * 0.018), index % 2 === 0 ? barkMaterial : cutMaterial);
      const angle = index * 1.57 + event.z;
      piece.position.set(Math.sin(angle) * (0.14 + index * 0.025), 0.16 + index * 0.025, Math.cos(angle) * (0.12 + index * 0.02));
      piece.rotation.set(0.5 + index * 0.18, angle, 0.24 - index * 0.1);
      registerHarvestPart(root, parts, piece, angle, (0.36 + index * 0.045) * finalBoost, (0.62 + index * 0.045) * finalBoost);
    }
  } else {
    const material = new THREE.MeshStandardMaterial({ color: event.resource === "coin" ? "#dfbd58" : "#e3c45d", roughness: 0.82, flatShading: true, transparent: true, opacity: 0.92 });
    materials.push(material);
    for (let index = 0; index < 4; index += 1) {
      const chip = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), material);
      const angle = index * 1.57;
      chip.position.set(Math.sin(angle) * 0.12, 0.16 + index * 0.02, Math.cos(angle) * 0.12);
      registerHarvestPart(root, parts, chip, angle, (0.28 + index * 0.03) * finalBoost, (0.54 + index * 0.03) * finalBoost);
    }
  }

  root.scale.setScalar(0.82 + progressLift * 0.18);

  return {
    eventId: event.id,
    root,
    age: 0,
    duration: event.final ? (event.resource === "wood" || event.resource === "stone" ? 0.72 : 0.56) : 0.46,
    materials,
    parts,
  };
}

function registerHarvestPart(
  root: THREE.Group,
  parts: HarvestEffectPart[],
  object: THREE.Object3D,
  angle: number,
  speed: number,
  lift: number,
): void {
  object.castShadow = true;
  root.add(object);
  parts.push({
    object,
    origin: object.position.clone(),
    velocity: new THREE.Vector3(Math.sin(angle) * speed, lift, Math.cos(angle) * speed),
    spin: new THREE.Vector3(2.2 + speed, 3.4 + lift, 1.6 + speed * 0.7),
    startScale: object.scale.clone(),
  });
}

function createEnemyView(enemy: EnemyState): THREE.Group {
  const group = new THREE.Group();
  group.name = enemy.id;
  const style = enemyStyle(enemy);

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: style.body, roughness: 0.9, flatShading: true });
  const shellMaterial = new THREE.MeshStandardMaterial({ color: style.shell, roughness: 0.92, flatShading: true });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: style.eye, roughness: 0.78, emissive: style.eyeGlow, emissiveIntensity: 0.24, flatShading: true });
  const barBackMaterial = new THREE.MeshBasicMaterial({ color: "#1b211d" });
  const barFillMaterial = new THREE.MeshBasicMaterial({ color: style.health });

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), bodyMaterial);
  body.name = "EnemyBody";
  body.position.y = 0.48;
  body.scale.copy(style.bodyScale);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const shell = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.5, 6), shellMaterial);
  shell.name = "EnemyShell";
  shell.position.y = style.shellY;
  shell.rotation.y = Math.PI / 6;
  shell.scale.copy(style.shellScale);
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  [-1, 1].forEach((sideSign) => {
    const eye = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), eyeMaterial);
    eye.name = sideSign < 0 ? "LeftEnemyEye" : "RightEnemyEye";
    eye.position.set(sideSign * 0.16, 0.56, 0.38);
    eye.castShadow = true;
    group.add(eye);
  });

  if (enemy.kind === "boar") {
    const tuskMaterial = new THREE.MeshStandardMaterial({ color: "#e5d7b0", roughness: 0.82, flatShading: true });
    [-1, 1].forEach((sideSign) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 5), tuskMaterial);
      tusk.name = sideSign < 0 ? "LeftTusk" : "RightTusk";
      tusk.position.set(sideSign * 0.2, 0.44, 0.46);
      tusk.rotation.x = Math.PI / 2;
      tusk.rotation.z = sideSign * 0.32;
      tusk.castShadow = true;
      group.add(tusk);
    });
  }

  if (enemy.kind === "reedWisp") {
    const glowMaterial = new THREE.MeshStandardMaterial({ color: "#8edbd1", roughness: 0.48, emissive: "#3c8f91", emissiveIntensity: 0.42, flatShading: true });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), glowMaterial);
    core.name = "WispCore";
    core.position.y = 0.94;
    core.castShadow = true;
    group.add(core);
  }

  const bar = new THREE.Group();
  bar.name = "EnemyHealth";
  bar.position.set(0, 1.32, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.055, 0.035), barBackMaterial);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.035, 0.045), barFillMaterial);
  fill.name = "EnemyHealthFill";
  fill.position.z = 0.01;
  bar.add(back, fill);
  group.add(bar);

  const burst = new THREE.Group();
  burst.name = "EnemyHitBurst";
  burst.position.set(0, 0.86, 0.04);
  burst.visible = false;
  const burstMaterial = new THREE.MeshBasicMaterial({ color: "#f7d66e", transparent: true, opacity: 0.7, side: THREE.DoubleSide });
  for (let index = 0; index < 5; index += 1) {
    const spark = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 3), burstMaterial);
    spark.position.set(Math.cos(index * 1.256) * 0.22, Math.sin(index * 1.256) * 0.16, 0.42);
    spark.rotation.z = index * 1.256;
    spark.rotation.x = Math.PI / 2;
    burst.add(spark);
  }
  group.add(burst);

  return group;
}

function enemyStyle(enemy: EnemyState): {
  body: string;
  shell: string;
  eye: string;
  eyeGlow: string;
  health: string;
  bodyScale: THREE.Vector3;
  shellScale: THREE.Vector3;
  shellY: number;
} {
  switch (enemy.kind) {
    case "boar":
      return {
        body: "#6f4a37",
        shell: "#4e3228",
        eye: "#d76742",
        eyeGlow: "#40130b",
        health: "#d64a3f",
        bodyScale: new THREE.Vector3(1.34, 0.72, 1.04),
        shellScale: new THREE.Vector3(0.86, 0.66, 0.86),
        shellY: 0.76,
      };
    case "stoneSentinel":
      return {
        body: "#6a6f62",
        shell: "#4f584e",
        eye: "#8ed0cb",
        eyeGlow: "#24656a",
        health: "#d0b96f",
        bodyScale: new THREE.Vector3(1.18, 1.02, 1.1),
        shellScale: new THREE.Vector3(1.08, 0.82, 1.08),
        shellY: 0.94,
      };
    case "reedWisp":
      return {
        body: "#4d786d",
        shell: "#6f874b",
        eye: "#b7ede6",
        eyeGlow: "#2b797d",
        health: "#76c9bf",
        bodyScale: new THREE.Vector3(0.88, 0.76, 0.88),
        shellScale: new THREE.Vector3(0.62, 0.86, 0.62),
        shellY: 0.76,
      };
    case "trailGuardian":
    default:
      return {
        body: "#5b5f5d",
        shell: "#2f3f39",
        eye: "#c95b46",
        eyeGlow: "#3b0f0b",
        health: "#d64a3f",
        bodyScale: new THREE.Vector3(1.2, 0.82, 1.0),
        shellScale: new THREE.Vector3(1, 1, 1),
        shellY: 0.82,
      };
  }
}

function createBuildingView(building: BuildingState): THREE.Group {
  return building.kind === "campfire" ? createCampfireView(building) : createCabinView(building);
}

function createCabinView(building: BuildingState): THREE.Group {
  const group = new THREE.Group();
  group.name = building.id;
  group.position.set(building.position.x, terrainHeight(building.position.x, building.position.z), building.position.z);
  group.rotation.y = building.rotation;

  const wallMaterial = new THREE.MeshStandardMaterial({ color: "#b68d62", roughness: 0.9, flatShading: true });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: "#6d3c2e", roughness: 0.9, flatShading: true });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: "#d0b06b", roughness: 0.84, flatShading: true });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: "#3e2a20", roughness: 0.88, flatShading: true });

  const walls = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.05, 1.35), wallMaterial);
  walls.position.y = 0.54;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.66, 4), roofMaterial);
  roof.position.y = 1.36;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.06), doorMaterial);
  door.position.set(0, 0.34, 0.7);
  door.castShadow = true;
  group.add(door);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.12, 0.08), trimMaterial);
  trim.position.set(0, 1.04, 0.72);
  trim.castShadow = true;
  group.add(trim);

  return group;
}

function createCampfireView(building: BuildingState): THREE.Group {
  const group = new THREE.Group();
  group.name = building.id;
  group.position.set(building.position.x, terrainHeight(building.position.x, building.position.z), building.position.z);
  group.rotation.y = building.rotation;

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: "#777261", roughness: 0.94, flatShading: true });
  const logMaterial = new THREE.MeshStandardMaterial({ color: "#5f3a21", roughness: 0.92, flatShading: true });
  const flameMaterial = new THREE.MeshStandardMaterial({ color: "#e88433", roughness: 0.68, emissive: "#7b2b0a", emissiveIntensity: 0.6, flatShading: true });
  const coreMaterial = new THREE.MeshStandardMaterial({ color: "#f1ce63", roughness: 0.64, emissive: "#8d430e", emissiveIntensity: 0.72, flatShading: true });

  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI * 0.25;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (index % 2) * 0.02, 0), stoneMaterial);
    stone.position.set(Math.sin(angle) * 0.46, 0.08, Math.cos(angle) * 0.42);
    stone.rotation.set(index * 0.2, angle, index * 0.11);
    stone.castShadow = true;
    stone.receiveShadow = true;
    group.add(stone);
  }

  for (let index = 0; index < 3; index += 1) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.72, 6), logMaterial);
    log.position.y = 0.13;
    log.rotation.set(Math.PI / 2, 0, index * Math.PI / 3);
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);
  }

  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.58, 5), flameMaterial);
  flame.name = "CampfireFlame";
  flame.position.y = 0.48;
  flame.rotation.y = Math.PI / 5;
  flame.castShadow = true;
  group.add(flame);

  const core = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 5), coreMaterial);
  core.name = "CampfireCore";
  core.position.y = 0.5;
  core.rotation.y = -Math.PI / 7;
  group.add(core);

  const light = new THREE.PointLight("#ffb45f", 0.65, 5.2, 2.2);
  light.position.y = 0.72;
  group.add(light);

  return group;
}

function createBuildPreview(): THREE.Group {
  const group = new THREE.Group();
  group.name = "BuildPreview";
  const material = new THREE.MeshBasicMaterial({ color: "#f2dda0", transparent: true, opacity: 0.42, depthWrite: false });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#f2dda0", transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });

  const cabin = new THREE.Group();
  cabin.name = "PreviewCabin";
  const footprint = new THREE.Mesh(new THREE.RingGeometry(0.74, 1.05, 5), ringMaterial);
  footprint.rotation.x = -Math.PI / 2;
  const block = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.72, 1.05), material);
  block.position.y = 0.42;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.94, 0.42, 4), material);
  roof.position.y = 0.96;
  roof.rotation.y = Math.PI / 4;
  cabin.add(footprint, block, roof);

  const campfire = new THREE.Group();
  campfire.name = "PreviewCampfire";
  const fireRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.62, 8), ringMaterial);
  fireRing.rotation.x = -Math.PI / 2;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.48, 5), material);
  flame.position.y = 0.42;
  campfire.add(fireRing, flame);

  group.add(cabin, campfire);
  return group;
}

function createStaminaBar(): StaminaBarView {
  const root = new THREE.Group();
  root.name = "PlayerStaminaBar";
  root.visible = false;

  const backMaterial = new THREE.MeshBasicMaterial({ color: "#111813", transparent: true, opacity: 0.72, depthWrite: false });
  const fillMaterial = new THREE.MeshBasicMaterial({ color: "#d8c76f", transparent: true, opacity: 0.94, depthWrite: false });
  const rimMaterial = new THREE.MeshBasicMaterial({ color: "#f4e7ad", transparent: true, opacity: 0.4, depthWrite: false });

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 0.025), backMaterial);
  const fill = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.045, 0.03), fillMaterial);
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.43, 24, 1), rimMaterial);
  back.name = "StaminaBack";
  fill.name = "StaminaFill";
  rim.name = "StaminaRim";
  fill.position.z = 0.018;
  rim.position.z = -0.01;
  rim.scale.y = 0.18;

  root.add(rim, back, fill);
  return { root, fill };
}

function createStepDustView(x: number, z: number, yaw: number, y: number): StepDustView {
  const root = new THREE.Group();
  root.name = "StepDust";
  root.position.set(x, y + 0.04, z);
  root.rotation.y = yaw;
  const material = new THREE.MeshBasicMaterial({ color: "#d8c783", transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const pieces: THREE.Mesh[] = [];

  for (let index = 0; index < 4; index += 1) {
    const piece = new THREE.Mesh(new THREE.CircleGeometry(0.05 + index * 0.012, 5), material);
    piece.rotation.x = -Math.PI / 2;
    piece.position.set((index - 1.5) * 0.035, 0, -0.04 + index * 0.026);
    piece.scale.set(1.2, 0.62, 1);
    pieces.push(piece);
    root.add(piece);
  }

  return { root, age: 0, duration: 0.46, material, pieces };
}

function createAttackArc(): THREE.Group {
  const group = new THREE.Group();
  group.name = "AttackArc";
  const material = new THREE.MeshBasicMaterial({ color: "#f4d36c", transparent: true, opacity: 0.62, side: THREE.DoubleSide });
  const innerMaterial = new THREE.MeshBasicMaterial({ color: "#fff0ad", transparent: true, opacity: 0.34, side: THREE.DoubleSide });
  const geometry = new THREE.RingGeometry(0.52, 1.18, 24, 1, Math.PI * 0.14, Math.PI * 0.7);
  const slash = new THREE.Mesh(geometry, material);
  slash.name = "AttackSlash";
  slash.rotation.x = -Math.PI / 2;
  const flash = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.34, 12, 1), innerMaterial);
  flash.name = "AttackFlash";
  flash.position.set(0, 0.015, 0.46);
  flash.rotation.x = -Math.PI / 2;
  group.add(slash, flash);
  return group;
}

function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else {
      material?.dispose();
    }
  });
}
