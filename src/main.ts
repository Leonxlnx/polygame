import "./style.css";
import { GameApp } from "./render/app/GameApp";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
const hud = document.querySelector<HTMLElement>("#hud");
const mainMenu = document.querySelector<HTMLElement>("#main-menu");
const loadingScreen = document.querySelector<HTMLElement>("#loading-screen");
const characterSelect = document.querySelector<HTMLElement>("#character-select");
const playButton = document.querySelector<HTMLButtonElement>("#play-button");
const loadingProgress = document.querySelector<HTMLElement>("#loading-progress");
const loadingCopy = document.querySelector<HTMLElement>("#loading-copy");
const prevCharacter = document.querySelector<HTMLButtonElement>("#prev-character");
const nextCharacter = document.querySelector<HTMLButtonElement>("#next-character");
const selectCharacter = document.querySelector<HTMLButtonElement>("#select-character");
const characterName = document.querySelector<HTMLElement>("#character-name");
const characterRole = document.querySelector<HTMLElement>("#character-role");
const characterDescription = document.querySelector<HTMLElement>("#character-description");
const characterIndex = document.querySelector<HTMLElement>("#character-index");
const characterColorName = document.querySelector<HTMLElement>("#character-color-name");
const colorPreview = document.querySelector<HTMLElement>("#color-preview");
const prevColor = document.querySelector<HTMLButtonElement>("#prev-color");
const nextColor = document.querySelector<HTMLButtonElement>("#next-color");
const dialoguePanel = document.querySelector<HTMLElement>("#dialogue-panel");
const dialogueSpeaker = document.querySelector<HTMLElement>("#dialogue-speaker");
const dialogueProgress = document.querySelector<HTMLElement>("#dialogue-progress");
const dialogueText = document.querySelector<HTMLElement>("#dialogue-text");
const dialogueContinue = document.querySelector<HTMLElement>("#dialogue-continue");
const settingsButton = document.querySelector<HTMLButtonElement>("#settings-button");
const hudSettingsButton = document.querySelector<HTMLButtonElement>("#hud-settings-button");
const settingsPanel = document.querySelector<HTMLElement>("#settings-panel");
const settingsClose = document.querySelector<HTMLButtonElement>("#settings-close");
const settingsAudio = document.querySelector<HTMLInputElement>("#settings-audio");
const settingsMotion = document.querySelector<HTMLInputElement>("#settings-motion");

if (
  !canvas ||
  !hud ||
  !mainMenu ||
  !loadingScreen ||
  !characterSelect ||
  !playButton ||
  !loadingProgress ||
  !loadingCopy ||
  !prevCharacter ||
  !nextCharacter ||
  !selectCharacter ||
  !characterName ||
  !characterRole ||
  !characterDescription ||
  !characterIndex ||
  !characterColorName ||
  !colorPreview ||
  !prevColor ||
  !nextColor ||
  !dialoguePanel ||
  !dialogueSpeaker ||
  !dialogueProgress ||
  !dialogueText ||
  !dialogueContinue ||
  !settingsButton ||
  !hudSettingsButton ||
  !settingsPanel ||
  !settingsClose ||
  !settingsAudio ||
  !settingsMotion
) {
  throw new Error("Hearthwild could not find its required UI roots.");
}

const searchParams = new URLSearchParams(window.location.search);
const locationText = `${window.location.search} ${window.location.href} ${document.URL}`;
const quickStart = searchParams.get("playtest") === "1" || /(?:\?|&)playtest=1(?:&|$)/.test(locationText);
const initialPhase = searchParams.get("screen") === "character" ? "characterSelect" : undefined;
document.documentElement.classList.toggle("is-playtest", quickStart);
const hasDebugSpawn = searchParams.has("x") && searchParams.has("z");
const debugX = hasDebugSpawn ? Number(searchParams.get("x")) : Number.NaN;
const debugZ = hasDebugSpawn ? Number(searchParams.get("z")) : Number.NaN;
const debugSpawn = hasDebugSpawn && Number.isFinite(debugX) && Number.isFinite(debugZ)
  ? { x: debugX, z: debugZ }
  : undefined;

const app = new GameApp({
  canvas,
  hud,
  quickStart,
  initialPhase,
  debugSpawn,
  ui: {
    mainMenu,
    loadingScreen,
    characterSelect,
    playButton,
    loadingProgress,
    loadingCopy,
    prevCharacter,
    nextCharacter,
    selectCharacter,
    characterName,
    characterRole,
    characterDescription,
    characterIndex,
    characterColorName,
    colorPreview,
    prevColor,
    nextColor,
    dialoguePanel,
    dialogueSpeaker,
    dialogueProgress,
    dialogueText,
    dialogueContinue,
    settingsButton,
    hudSettingsButton,
    settingsPanel,
    settingsClose,
    settingsAudio,
    settingsMotion,
  },
});
app.start();
