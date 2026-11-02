import { useRef } from 'react';

const HOLD_MS = 450;
const DOUBLE_TAP_MS = 280;
const SLOP = 10;

/**
 * Tap, double-tap and long-press on one element. A tap waits briefly in case a second one follows; moving the finger
 * cancels the press, so scrolling never triggers anything. Right-click counts as a long-press with a mouse.
 */
export function usePressGestures({ onTap, onDoubleTap, onLongPress }) {
  const press = useRef({ lastTap: 0 });

  const cancel = () => {
    clearTimeout(press.current.hold);
    press.current.start = null;
  };

  return {
    onPointerDown(event) {
      const element = event.currentTarget;
      press.current.start = { x: event.clientX, y: event.clientY };
      press.current.held = false;
      press.current.hold = setTimeout(() => {
        press.current.held = true;
        onLongPress?.(element);
      }, HOLD_MS);
    },
    onPointerMove(event) {
      const { start } = press.current;
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP) cancel();
    },
    onPointerUp() {
      const { start, held, lastTap } = press.current;
      cancel();
      if (!start || held) return;
      if (Date.now() - lastTap < DOUBLE_TAP_MS) {
        clearTimeout(press.current.tap);
        press.current.lastTap = 0;
        onDoubleTap?.();
      } else {
        press.current.lastTap = Date.now();
        if (onTap) press.current.tap = setTimeout(onTap, DOUBLE_TAP_MS);
      }
    },
    onPointerCancel: cancel,
    onContextMenu(event) {
      event.preventDefault();
      if (!press.current.held) onLongPress?.(event.currentTarget);
      cancel();
    },
  };
}
