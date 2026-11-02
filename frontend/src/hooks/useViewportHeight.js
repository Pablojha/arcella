import { useEffect } from 'react';

/**
 * Keeps --app-height/--app-top on <html> equal to the visible area above the on-screen keyboard, and sets
 * data-keyboard while it is open, so full-screen layouts like the chat stay pinned above the keyboard.
 * Pass `active = false` to switch it off (e.g. while a sheet with a text box is closed).
 */
export function useViewportHeight(active = true) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!active || !viewport) return undefined;
    const root = document.documentElement;
    let tallest = viewport.height;
    const update = () => {
      tallest = Math.max(tallest, viewport.height);
      root.style.setProperty('--app-height', `${viewport.height}px`);
      root.style.setProperty('--app-top', `${viewport.offsetTop}px`);
      root.toggleAttribute('data-keyboard', viewport.height < tallest - 120);
    };
    const reset = () => {
      tallest = 0;
      update();
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', reset);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', reset);
      ['--app-height', '--app-top'].forEach((name) => root.style.removeProperty(name));
      root.removeAttribute('data-keyboard');
    };
  }, [active]);
}
