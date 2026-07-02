import type { ChangeEvent } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function SliderRow({ label, value, onChange }: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <div className="slider-row">
      <div className="slider-row-top">
        <span>{label}</span>
        <strong>{value}/10</strong>
      </div>
      <input type="range" min="0" max="10" step="1" value={value} onChange={handleChange} />
    </div>
  );
}
