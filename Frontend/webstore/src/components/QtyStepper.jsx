export default function QtyStepper({ value, onChange, min = 1, max, disabled }) {
  const clamp = (n) => {
    let v = Math.max(min, Math.round(Number(n)) || min);
    if (max != null) v = Math.min(v, max);
    return v;
  };
  return (
    <div className="ws-qty-stepper" aria-disabled={disabled || undefined}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        −
      </button>
      <input
        type="number"
        className="ws-qty-input"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(clamp(e.target.value))}
        aria-label="Quantity"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(clamp(value + 1))}
      >
        +
      </button>
    </div>
  );
}
