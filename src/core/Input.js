// Keyboard + mouse input with pointer-lock mouse-look.
export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDZ = 0; // dy reused for pitch
    this.mouseDown = false;
    this.rightDown = false;
    this.justPressed = new Set();
    this.locked = false;
    this.enabled = false;

    // Callbacks the game can subscribe to.
    this.onFire = null; // left click
    this.onAimDown = null;
    this.onAimUp = null;
    this.onPause = null;
    this.onLockChange = null;
    this.lastSway = { x: 0, y: 0 };

    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.justPressed.add(e.code);
      if (e.code === 'Escape' && this.onPause) this.onPause();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    this.dom.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked) {
        this.dom.requestPointerLock?.();
        return;
      }
      if (e.button === 0) {
        this.mouseDown = true;
        this.onFire?.();
      } else if (e.button === 2) {
        this.rightDown = true;
        this.onAimDown?.();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
      else if (e.button === 2) {
        this.rightDown = false;
        this.onAimUp?.();
      }
    });

    this.dom.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.onLockChange?.(this.locked);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDZ += e.movementY || 0;
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  // Consumes the accumulated mouse movement since last call.
  takeMouseDelta() {
    const d = { x: this.mouseDX, y: this.mouseDZ };
    this.mouseDX = 0;
    this.mouseDZ = 0;
    return d;
  }

  wasPressed(code) {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  // Clear per-frame state at the end of an update.
  endFrame() {
    this.justPressed.clear();
  }

  lock() {
    this.dom.requestPointerLock?.();
  }

  unlock() {
    document.exitPointerLock?.();
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) {
      this.keys.clear();
      this.mouseDown = false;
      this.rightDown = false;
    }
  }
}
