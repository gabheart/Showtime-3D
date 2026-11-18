export interface PlayerInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

export class InputController {
  readonly state: PlayerInputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false
  };

  private onInteractCallback: (() => void) | null = null;
  private onPingCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;

  constructor(
    onInteract?: () => void,
    onPing?: () => void,
    onRestart?: () => void
  ) {
    this.onInteractCallback = onInteract ?? null;
    this.onPingCallback = onPing ?? null;
    this.onRestartCallback = onRestart ?? null;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.reset);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.run = true;
        break;
      case 'KeyE':
        if (!e.repeat) this.onInteractCallback?.();
        break;
      case 'KeyQ':
        if (!e.repeat) this.onPingCallback?.();
        break;
      case 'KeyR':
        if (!e.repeat) {
          if (this.onRestartCallback) this.onRestartCallback();
          else window.location.reload();
        }
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.run = false;
        break;
    }
  };

  private reset = (): void => {
    this.state.forward = false;
    this.state.backward = false;
    this.state.left = false;
    this.state.right = false;
    this.state.run = false;
  };

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.reset);
  }
}
