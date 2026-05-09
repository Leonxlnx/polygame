export type InputVector = {
  x: number;
  z: number;
  sprint: boolean;
  attack: boolean;
  interact: boolean;
  build: boolean;
  inventory: boolean;
};

type InputAction = "left" | "right" | "up" | "down" | "sprint" | "attack" | "interact" | "build" | "inventory";

const keyToAction = new Map<string, InputAction>([
  ["KeyA", "left"],
  ["ArrowLeft", "left"],
  ["KeyD", "right"],
  ["ArrowRight", "right"],
  ["KeyW", "up"],
  ["ArrowUp", "up"],
  ["KeyS", "down"],
  ["ArrowDown", "down"],
  ["ShiftLeft", "sprint"],
  ["ShiftRight", "sprint"],
  ["Space", "attack"],
  ["KeyE", "interact"],
  ["KeyB", "build"],
  ["KeyI", "inventory"],
]);

export class InputController {
  private readonly pressed = new Set<string>();
  private readonly queuedActions = new Set<InputAction>();
  private disposed = false;

  constructor() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  getVector(): InputVector {
    let x = 0;
    let z = 0;

    if (this.pressed.has("left")) x -= 1;
    if (this.pressed.has("right")) x += 1;
    if (this.pressed.has("up")) z -= 1;
    if (this.pressed.has("down")) z += 1;

    if (x !== 0 && z !== 0) {
      const length = Math.hypot(x, z);
      x /= length;
      z /= length;
    }

    return {
      x,
      z,
      sprint: this.pressed.has("sprint"),
      attack: this.consumeAction("attack"),
      interact: this.consumeAction("interact"),
      build: this.consumeAction("build"),
      inventory: this.consumeAction("inventory"),
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.pressed.clear();
    this.queuedActions.clear();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const action = keyToAction.get(event.code);
    if (!action) return;
    event.preventDefault();
    this.pressed.add(action);
    if (action === "attack" || action === "interact" || action === "build" || action === "inventory") {
      this.queuedActions.add(action);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = keyToAction.get(event.code);
    if (!action) return;
    event.preventDefault();
    this.pressed.delete(action);
  };

  private readonly handleBlur = (): void => {
    this.pressed.clear();
    this.queuedActions.clear();
  };

  private consumeAction(action: InputAction): boolean {
    const active = this.queuedActions.has(action) || this.pressed.has(action);
    this.queuedActions.delete(action);
    return active;
  }
}
