import { hueOf, initials, mediaUrl } from '../../lib/format';

export default function Avatar({ user, size = 40, className = '' }) {
  const style = { width: size, height: size };
  if (user?.avatar) return <img src={mediaUrl(user.avatar, size > 48 ? 256 : 96)} alt="" loading="lazy" style={style} className={`shrink-0 rounded-full bg-line object-cover ${className}`} />;
  return (
    <span
      style={{ ...style, fontSize: size * 0.38, backgroundColor: `hsl(${hueOf(user?.name)} 30% 42%)` }}
      className={`grid shrink-0 select-none place-items-center rounded-full font-display font-semibold text-white ${className}`}
    >
      {initials(user?.name) || '?'}
    </span>
  );
}
