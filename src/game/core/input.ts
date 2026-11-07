// Keyboard + dynamic virtual joystick input.

export class Input {
  private keys = new Set<string>();
  // joystick (CSS pixels relative to the canvas)
  joy = { active: false, id: -1, bx: 0, by: 0, x: 0, y: 0 };
  readonly joyRadius = 52;
  private el: HTMLElement;
  onPause: (() => void) | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', this.clear);
    el.addEventListener('pointerdown', this.pd);
    window.addEventListener('pointermove', this.pm);
    window.addEventListener('pointerup', this.pu);
    window.addEventListener('pointercancel', this.pu);
  }

  destroy() {
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    window.removeEventListener('blur', this.clear);
    this.el.removeEventListener('pointerdown', this.pd);
    window.removeEventListener('pointermove', this.pm);
    window.removeEventListener('pointerup', this.pu);
    window.removeEventListener('pointercancel', this.pu);
  }

  clear = () => {
    this.keys.clear();
    this.joy.active = false;
    this.joy.id = -1;
  };

  private kd = (e: KeyboardEvent) => {
    const k = e.code;
    if (k === 'Escape' || k === 'KeyP') {
      this.onPause?.();
      return;
    }
    if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
    this.keys.add(k);
  };
  private ku = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private pd = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.joy.active) return;
    const rect = this.el.getBoundingClientRect();
    this.joy.active = true;
    this.joy.id = e.pointerId;
    this.joy.bx = e.clientX - rect.left;
    this.joy.by = e.clientY - rect.top;
    this.joy.x = this.joy.bx;
    this.joy.y = this.joy.by;
  };
  private pm = (e: PointerEvent) => {
    if (!this.joy.active || e.pointerId !== this.joy.id) return;
    const rect = this.el.getBoundingClientRect();
    this.joy.x = e.clientX - rect.left;
    this.joy.y = e.clientY - rect.top;
    // drag the base along when pulled past the radius so direction changes feel instant
    const dx = this.joy.x - this.joy.bx;
    const dy = this.joy.y - this.joy.by;
    const d = Math.hypot(dx, dy);
    const max = this.joyRadius * 1.25;
    if (d > max) {
      this.joy.bx = this.joy.x - (dx / d) * max;
      this.joy.by = this.joy.y - (dy / d) * max;
    }
  };
  private pu = (e: PointerEvent) => {
    if (e.pointerId !== this.joy.id) return;
    this.joy.active = false;
    this.joy.id = -1;
  };

  /** Returns a movement vector with length <= 1. */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    if (this.joy.active) {
      const dx = this.joy.x - this.joy.bx;
      const dy = this.joy.y - this.joy.by;
      const d = Math.hypot(dx, dy);
      if (d < 6) return { x: 0, y: 0 };
      const m = Math.min(1, d / this.joyRadius);
      return { x: (dx / d) * m, y: (dy / d) * m };
    }
    return { x: 0, y: 0 };
  }
}
