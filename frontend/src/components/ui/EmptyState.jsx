export default function EmptyState({ icon: Icon, title, text, action, className = '' }) {
  return (
    <div className={`card flex flex-col items-center px-6 py-12 text-center ${className}`}>
      <span className="mb-4 grid size-14 place-items-center rounded-2xl border border-dashed border-ink/25 text-muted">
        <Icon size={24} />
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
