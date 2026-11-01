/** Label + control + hint. Use `as="div"` around composite controls (tag inputs, pickers). */
export default function Field({ label, hint, as: Tag = 'label', className = '', children }) {
  return (
    <Tag className={`block min-w-0 ${className}`}>
      {label && <span className="mb-1.5 block text-[13px] font-medium text-ink/80">{label}</span>}
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </Tag>
  );
}
