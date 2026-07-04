import Phaser from 'phaser';

/**
 * Shared input plumbing for the modal panels, tuned for touch: finger-sized
 * close targets, tap-outside-to-close, and drag scrolling that works no
 * matter which child object the finger lands on.
 */

/** Dim + input-block the game behind; a clean tap outside the panel closes. */
export function addBackdrop(
  scene: Phaser.Scene,
  panel: Phaser.Geom.Rectangle,
  onClose: () => void,
): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale.gameSize;
  const blocker = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x14101c, 0.72)
    .setInteractive();
  // Only close for taps that STARTED on the backdrop. The finger press that
  // opened the panel releases over this very backdrop a moment later — that
  // release must not close what it just opened.
  let armed = false;
  blocker.on('pointerdown', () => {
    armed = true;
  });
  blocker.on('pointerup', (ptr: Phaser.Input.Pointer) => {
    if (!armed) return;
    armed = false;
    const moved = Math.hypot(ptr.upX - ptr.downX, ptr.upY - ptr.downY) > 12;
    if (!moved && !panel.contains(ptr.upX, ptr.upY)) onClose();
  });
  return blocker;
}

/** An X with a 48x48 invisible hit zone — bitmap glyphs are too small to tap. */
export function addCloseButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClose: () => void,
): void {
  scene.add.bitmapText(x, y, 'pix', 'X', 16).setOrigin(0.5, 0);
  scene.add
    .rectangle(x, y + 8, 48, 48, 0xffffff, 0.001)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', onClose);
}

/**
 * Scene-level drag scrolling: listens on the input plugin (not an object),
 * so drags that start on cards/buttons still scroll. Callers gate taps on
 * their buttons with a small movement threshold where needed.
 */
export function addDragScroll(
  scene: Phaser.Scene,
  area: Phaser.Geom.Rectangle,
  apply: (delta: number) => void,
): void {
  let dragging = false;
  let lastY = 0;
  scene.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
    if (!area.contains(ptr.x, ptr.y)) return;
    dragging = true;
    lastY = ptr.y;
  });
  scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
    if (!dragging || !ptr.isDown) return;
    apply(lastY - ptr.y);
    lastY = ptr.y;
  });
  const stop = (): void => {
    dragging = false;
  };
  scene.input.on('pointerup', stop);
  scene.input.on('pointerupoutside', stop);
}
