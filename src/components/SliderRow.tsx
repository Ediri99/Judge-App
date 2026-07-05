import type { ChangeEvent } from 'react';

type Props = {
  label: string;
  value: number;
  max?: number;
  onChange: (value: number) => void;
};

export function SliderRow({ label, value, max = 10, onChange }: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <div className="slider-row">
      <div className="slider-row-top">
        <span>{label}</span>
        <strong>{value}/{max}</strong>
      </div>
      <input
        type="range"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={handleChange}
        aria-label={label}
        aria-valuetext={`${value} out of ${max}`}
      />
    </div>
  );
}
