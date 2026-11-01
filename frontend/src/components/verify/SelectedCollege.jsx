import FirmLogo from '../ui/FirmLogo';

export default function SelectedCollege({ college, onChange }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <FirmLogo name={college.short || college.name} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{college.name}</p>
        <p className="text-xs text-muted">
          {college.city}, {college.state}
        </p>
      </div>
      {onChange && (
        <button type="button" onClick={onChange} className="shrink-0 text-sm font-medium text-brand hover:underline">
          Change
        </button>
      )}
    </div>
  );
}
