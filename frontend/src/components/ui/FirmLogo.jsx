import { hueOf, initials, mediaUrl } from '../../lib/format';

export default function FirmLogo({ logo, name, size = 48, className = '' }) {
  const style = { width: size, height: size };
  if (logo) return <img src={mediaUrl(logo, size > 48 ? 256 : 96)} alt="" loading="lazy" style={style} className={`shrink-0 rounded-xl border border-line bg-card object-cover ${className}`} />;
  return (
    <span style={{ ...style, fontSize: size * 0.36, backgroundColor: `hsl(${hueOf(name)} 25% 92%)`, color: `hsl(${hueOf(name)} 35% 30%)` }} className={`grid shrink-0 place-items-center rounded-xl font-display font-bold ${className}`}>
      {initials(name) || '·'}
    </span>
  );
}
