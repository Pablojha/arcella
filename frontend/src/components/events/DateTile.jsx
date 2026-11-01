export default function DateTile({ date, size = 'md' }) {
  const value = new Date(date);
  const small = size === 'sm';
  return (
    <span className={`grid shrink-0 overflow-hidden rounded-xl border border-line bg-card text-center ${small ? 'w-11' : 'w-14'}`}>
      <span className={`bg-accent font-semibold uppercase tracking-wider text-on-accent ${small ? 'text-[9px]' : 'py-0.5 text-[10px]'}`}>{value.toLocaleDateString('en-IN', { month: 'short' })}</span>
      <span className={`font-display font-bold ${small ? 'py-0.5 text-base' : 'py-1 text-xl'}`}>{value.getDate()}</span>
    </span>
  );
}
