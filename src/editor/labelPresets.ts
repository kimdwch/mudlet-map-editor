import type { MudletColor, MudletMap } from '../mapIO';
import { DEFAULT_LABEL_FONT, type Command, type LabelFont, type LabelPadding, type LabelSnapshot, type LabelStyleParams, type LabelTextAlign } from './types';
import { generateLabelPixmap, labelSizeForText } from './labelPixmap';

/** A colour in a preset: `#rrggbb`, `#rrggbbaa`, or a raw Mudlet colour. */
export type LabelColorInput = string | MudletColor;

/**
 * A named bundle of label appearance settings, applied to a label in one step
 * (one undo entry). Plugins contribute these through the `labelPresets()` hook.
 *
 * Every field is optional and only the ones present are written, so a preset
 * can be as narrow as "make it red" or as complete as a full house style.
 */
export interface LabelPreset {
  /** Stable id; also remembered as the preset new labels start from. */
  id: string;
  /** Name shown on the preset button in the label panel. */
  name: string;
  /** Text colour. */
  fgColor?: LabelColorInput;
  /** Background fill; use an `aa` of `00` for a fully transparent label. */
  bgColor?: LabelColorInput;
  /** Text outline colour, or `null` to clear any outline. */
  outlineColor?: LabelColorInput | null;
  /** Border around the label; `color` defaults to the label's text colour, `null` removes the border. */
  border?: { width: number; color?: LabelColorInput } | null;
  /** Font fields to override — family, size, bold, italic, underline, strikeout. */
  font?: Partial<LabelFont>;
  /** Registered {@link import('./labelStyles').LabelStyle} id, or 'plain'. */
  styleId?: string;
  /** Values for the style's own settings (see `LabelStyle.params`). A preset that sets
   *  `styleId` replaces the label's settings with these; params left out take their defaults. */
  styleParams?: LabelStyleParams;
  textAlign?: LabelTextAlign;
  /** Inner padding in pixmap px — one value for all sides, or `[horizontal, vertical]`. */
  padding?: LabelPadding;
  /** Fixed box size in map units. Any axis `fitToText` covers wins over it. */
  size?: [number, number];
  /** Size the box to the label's own text: both axes, or just one — 'width'
   *  keeps the height from `size` (or the label's), which is how a preset gets
   *  a fixed row height with a width that follows the text. */
  fitToText?: boolean | 'width' | 'height';
  noScaling?: boolean;
  showOnTop?: boolean;
}

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Normalise a preset colour to a Mudlet colour. Unparseable input is opaque black. */
export function toMudletColor(input: LabelColorInput): MudletColor {
  if (typeof input !== 'string') return { ...input };
  const m = HEX.exec(input.trim());
  const hex = m ? m[1] : '000000';
  return {
    spec: 1,
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    alpha: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
    pad: 0,
  };
}

/**
 * Apply a preset to a label snapshot, returning the updated snapshot. The
 * pixmap is left alone — callers regenerate it once, after the box size they
 * want is settled.
 */
export function applyLabelPreset(label: LabelSnapshot, preset: LabelPreset): LabelSnapshot {
  const next: LabelSnapshot = { ...label };

  if (preset.fgColor !== undefined) next.fgColor = toMudletColor(preset.fgColor);
  if (preset.bgColor !== undefined) next.bgColor = toMudletColor(preset.bgColor);
  if (preset.outlineColor !== undefined) {
    next.outlineColor = preset.outlineColor === null ? undefined : toMudletColor(preset.outlineColor);
  }
  if (preset.font) next.font = { ...next.font, ...preset.font };
  if (preset.styleId !== undefined) {
    next.styleId = preset.styleId === 'plain' ? undefined : preset.styleId;
    // Settings belong to a style, so a preset naming one brings its own.
    next.styleParams = preset.styleParams ? { ...preset.styleParams } : undefined;
  } else if (preset.styleParams) {
    next.styleParams = { ...next.styleParams, ...preset.styleParams };
  }
  if (preset.textAlign !== undefined) next.textAlign = preset.textAlign === 'center' ? undefined : preset.textAlign;
  if (preset.padding !== undefined) next.padding = preset.padding;
  if (preset.noScaling !== undefined) next.noScaling = preset.noScaling;
  if (preset.showOnTop !== undefined) next.showOnTop = preset.showOnTop;
  if (preset.border !== undefined) {
    // A border with no colour of its own follows the text colour.
    next.border = preset.border === null
      ? undefined
      : { width: preset.border.width, color: preset.border.color !== undefined ? toMudletColor(preset.border.color) : { ...next.fgColor } };
  }

  const fit = preset.fitToText === true ? 'both' : preset.fitToText || null;
  const base = preset.size ?? next.size;
  if (fit) {
    const fitted = labelSizeForText(next);
    next.size = fit === 'both' ? fitted : fit === 'width' ? [fitted[0], base[1]] : [base[0], fitted[1]];
  } else if (preset.size) {
    next.size = [...preset.size] as [number, number];
  }

  return next;
}

/** A throwaway label carrying a preset's look, for previews and swatches. */
export function labelPresetSample(preset: LabelPreset, text: string): LabelSnapshot {
  const base: LabelSnapshot = {
    id: -1,
    pos: [0, 0, 0],
    size: [4, 1],
    text,
    fgColor: { spec: 1, alpha: 255, r: 255, g: 255, b: 255, pad: 0 },
    bgColor: { spec: 1, alpha: 128, r: 0, g: 0, b: 0, pad: 0 },
    noScaling: false,
    showOnTop: false,
    font: { ...DEFAULT_LABEL_FONT },
    pixMap: '',
  };
  // The sample hugs its text horizontally; a preset's own fixed height still applies.
  return applyLabelPreset(base, { ...preset, fitToText: preset.fitToText === 'height' ? true : 'width' });
}

/** Render a preset preview as a PNG data URL — the preset's look, drawn around `text`. */
export function renderLabelPresetPreview(preset: LabelPreset, text: string): string {
  return generateLabelPixmap(labelPresetSample(preset, text));
}

let registry: LabelPreset[] = [];

/** Replace the registered presets. Called with every plugin's `labelPresets()` output. */
export function registerLabelPresets(presets: LabelPreset[]): void {
  registry = [...presets];
}

/** All registered presets, in plugin order. */
export function getLabelPresets(): LabelPreset[] {
  return registry;
}

/** Resolve a preset by id. Last match wins, so a later plugin can override an earlier one. */
export function getLabelPreset(id: string | null | undefined): LabelPreset | null {
  if (!id) return null;
  for (let i = registry.length - 1; i >= 0; i--) {
    if (registry[i].id === id) return registry[i];
  }
  return null;
}

/** Where a preset was applied from. */
export type LabelPresetSource = 'panel' | 'newLabel' | 'script';

/** What {@link import('./plugin').EditorPlugin.onLabelPresetApplied} is told about one application of a preset. */
export interface LabelPresetAppliedContext {
  preset: LabelPreset;
  areaId: number;
  labelId: number;
  /** The label before the preset, or `null` for a label the preset is creating. */
  before: LabelSnapshot | null;
  /** The label as the preset leaves it. */
  after: LabelSnapshot;
  source: LabelPresetSource;
  /** The map as it stands before the preset's own commands are applied. */
  map: MudletMap;
}

export type LabelPresetAppliedHandler = (ctx: LabelPresetAppliedContext) => Command[] | void;

let appliedHandlers: LabelPresetAppliedHandler[] = [];

/** Replace the handlers told about preset applications. Called with every plugin's `onLabelPresetApplied`. */
export function registerLabelPresetAppliedHandlers(handlers: LabelPresetAppliedHandler[]): void {
  appliedHandlers = [...handlers];
}

/**
 * The extra commands plugins want recorded alongside a preset application, in
 * plugin order. They go in the same undo step as the preset. A handler that
 * throws is logged and skipped, so one plugin can't block applying a preset.
 */
export function labelPresetAppliedCommands(ctx: LabelPresetAppliedContext): Command[] {
  const out: Command[] = [];
  for (const handler of appliedHandlers) {
    try {
      const cmds = handler(ctx);
      if (cmds) out.push(...cmds);
    } catch (err) {
      console.error('[labelPresets] onLabelPresetApplied handler failed:', err);
    }
  }
  return out;
}
