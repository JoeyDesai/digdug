// Keyboard input: arrows/WASD for movement, Space to pump, Enter to start, M to mute.
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'pump',
  Enter: 'start',
  KeyM: 'mute',
};

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();          // edge-triggered, cleared each frame
    this.dirStack = [];                // most-recent-direction-wins

    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (!this.held.has(action)) {
        this.held.add(action);
        this.pressed.add(action);
        if (this.isDir(action)) this.dirStack.push(action);
      }
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      this.held.delete(action);
      if (this.isDir(action)) {
        this.dirStack = this.dirStack.filter((d) => d !== action);
      }
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.dirStack = [];
    });
  }

  isDir(a) { return a === 'up' || a === 'down' || a === 'left' || a === 'right'; }

  // Latest direction still held, or null.
  get dir() {
    return this.dirStack.length ? this.dirStack[this.dirStack.length - 1] : null;
  }

  isHeld(action) { return this.held.has(action); }
  wasPressed(action) { return this.pressed.has(action); }
  endFrame() { this.pressed.clear(); }
}
