import { useState } from 'react';
import { hueOf, initials, mediaUrl } from '../../lib/format';

/** Relative luminance (WCAG) of an HSL colour: hue in degrees, saturation and lightness in percent. */
function luminance(hue, saturation, lightness) {
  const l = lightness / 100;
  const a = (saturation / 100) * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + hue / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

/** The initials' background: the name's own hue, darkened until white text passes WCAG AA (4.5:1) on it. */
function backgroundOf(name) {
  const hue = hueOf(name);
  let lightness = 42;
  while (lightness > 20 && 1.05 / (luminance(hue, 30, lightness) + 0.05) < 4.6) lightness -= 2;
  return `hsl(${hue} 30% ${lightness}%)`;
}

/**
 * A member's photo, or their initials on a colour of their own, also when the photo can't be loaded (a lost upload).
 * Decorative: the name always appears beside it.
 */
export default function Avatar({ user, size = 40, className = '' }) {
  const [failed, setFailed] = useState(null);
  const style = { width: size, height: size };
  if (user?.avatar && failed !== user.avatar) {
    return <img src={mediaUrl(user.avatar, size > 48 ? 256 : 96)} alt="" loading="lazy" data-fallback="own" onError={() => setFailed(user.avatar)} style={style} className={`shrink-0 rounded-full bg-line object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: size * 0.38, backgroundColor: backgroundOf(user?.name) }}
      className={`grid shrink-0 select-none place-items-center rounded-full font-display font-semibold text-white ${className}`}
    >
      {initials(user?.name) || '?'}
    </span>
  );
}
