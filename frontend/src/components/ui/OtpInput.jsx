/** Six boxes over one real input, so paste and SMS/email autofill work natively. */
export default function OtpInput({ value, onChange, length = 6 }) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        className="absolute inset-0 z-10 w-full cursor-text opacity-0"
        autoFocus
      />
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length }, (_, index) => (
          <div
            key={index}
            className={`grid h-13 place-items-center rounded-xl border bg-card font-display text-2xl font-semibold transition ${index === Math.min(value.length, length - 1) ? 'border-brand ring-4 ring-brand/15' : 'border-line'}`}
          >
            {value[index] ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}
