import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const COLORS = [
  '#000000', '#ffffff', '#808080', '#c0c0c0',
  '#800000', '#ff0000', '#ff8000', '#ffff00',
  '#008000', '#00ff00', '#008080', '#00ffff',
  '#000080', '#0000ff', '#800080', '#ff00ff',
];

function toHsv(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6
    : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return [(hue * 60 + 360) % 360, max === 0 ? 0 : delta / max, max];
}

function toHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
      .toString(16).padStart(2, '0');
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

interface RoomColorPickerProps {
  color: string | null;
  onChange: (color: string | null) => void;
  children?: ReactNode;
  className?: string;
  title?: string;
}

export function RoomColorPicker({ color, onChange, children, className, title }: RoomColorPickerProps) {
  const { t } = useTranslation('envs');
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => toHsv(color ?? '#888888'));
  const [hexDraft, setHexDraft] = useState(color ?? '#888888');
  const ref = useRef<HTMLDivElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);
  const draft = toHex(...hsv);

  const update = (next: [number, number, number]) => {
    setHsv(next);
    setHexDraft(toHex(...next));
  };
  const pickOnWheel = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
    update([(Math.atan2(y, x) * 180 / Math.PI + 360) % 360, Math.min(1, Math.hypot(x, y)), hsv[2]]);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const select = (value: string | null) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <div className="room-color-picker" ref={ref}>
      <button
        type="button"
        className={className ?? `env-pick-btn${color === null ? ' room-color-transparent' : ''}`}
        style={children ? undefined : { backgroundColor: color ?? 'transparent' }}
        title={title ?? t('color')}
        aria-label={title ?? t('color')}
        aria-expanded={open}
        onClick={() => {
          if (!open) update(toHsv(color ?? '#888888'));
          setOpen(value => !value);
        }}
      >
        {children}
      </button>
      {open && (
        <div className="room-color-popup" role="group" aria-label={t('color')}>
          <div className="room-color-detail">
            <div
              className="room-color-wheel"
              aria-label={t('colorWheel')}
              onPointerDown={event => {
                event.currentTarget.setPointerCapture(event.pointerId);
                pickOnWheel(event);
              }}
              onPointerMove={event => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) pickOnWheel(event);
              }}
              onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)}
              style={{ filter: `brightness(${hsv[2]})` }}
            >
              <span style={{
                left: `${50 + Math.cos(hsv[0] * Math.PI / 180) * hsv[1] * 50}%`,
                top: `${50 + Math.sin(hsv[0] * Math.PI / 180) * hsv[1] * 50}%`,
              }} />
            </div>
            <div className="room-color-controls">
              <div className="room-color-preview" style={{ backgroundColor: draft }} />
              {([
                ['hue', 0, 360],
                ['saturation', 1, 1],
                ['brightness', 2, 1],
              ] as const).map(([key, index, max]) => (
                <label key={key}>
                  {t(key)}
                  <input type="range" min={0} max={max} step={max === 360 ? 1 : 0.01}
                    aria-label={t(key)} value={hsv[index]}
                    onChange={event => {
                      const next: [number, number, number] = [...hsv];
                      next[index] = Number(event.target.value);
                      update(next);
                    }} />
                </label>
              ))}
              <input aria-label={t('hexColor')} value={hexDraft}
                onChange={event => {
                  const value = event.target.value;
                  setHexDraft(value);
                  if (/^#[0-9a-f]{6}$/i.test(value)) setHsv(toHsv(value));
                }}
                onBlur={() => setHexDraft(draft)}
              />
              <button type="button" onClick={() => nativeRef.current?.click()}>{t('moreColors')}</button>
              <input ref={nativeRef} className="room-color-native" type="color"
                aria-label={t('moreColors')} value={draft}
                onChange={event => update(toHsv(event.target.value))} />
              <button type="button" onClick={() => select(draft)}>{t('applyColor')}</button>
            </div>
          </div>
          <button
            type="button"
            className="room-color-transparent room-color-none"
            aria-pressed={color === null}
            onClick={() => select(null)}
          >
            {t('transparent')}
          </button>
          <div className="room-color-grid">
            {COLORS.map(value => (
              <button
                key={value}
                type="button"
                style={{ backgroundColor: value }}
                title={value}
                aria-label={value}
                aria-pressed={color?.toLowerCase() === value}
                onClick={() => select(value)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
