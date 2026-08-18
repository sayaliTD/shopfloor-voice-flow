import { Delete } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumPad({ value, onChange, maxLength = 4 }: Props) {
  function press(key: string) {
    if (value.length >= maxLength) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="rounded-lg border-2 border-input bg-card py-4 text-2xl font-bold text-card-foreground active:bg-muted"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange("")}
        className="rounded-lg border-2 border-input bg-muted py-4 text-base font-bold text-muted-foreground active:bg-secondary"
      >
        C
      </button>
      <button
        type="button"
        onClick={() => press("0")}
        className="rounded-lg border-2 border-input bg-card py-4 text-2xl font-bold text-card-foreground active:bg-muted"
      >
        0
      </button>
      <button
        type="button"
        onClick={() => onChange(value.slice(0, -1))}
        aria-label="Backspace"
        className="flex items-center justify-center rounded-lg border-2 border-input bg-muted py-4 text-muted-foreground active:bg-secondary"
      >
        <Delete className="size-6" />
      </button>
    </div>
  );
}
