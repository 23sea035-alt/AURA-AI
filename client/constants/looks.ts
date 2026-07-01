// Curated "Change look" gallery — mood/lighting variants of the SAME portrait (swap-not-upload,
// no new art, no outfit change). Deliberately BRIGHTNESS + SATURATION (+ one CONTRAST) only — no
// hue-rotate anywhere, so skin tone and hair color are mathematically untouched, not just visually
// subtle. Ops chain left-to-right, each operating on the previous op's output (same order CSS
// `filter: a() b() c()` would apply them).
export type LookOp =
  | { kind: 'saturate'; value: number }
  | { kind: 'brightness'; value: number }
  | { kind: 'contrast'; value: number };

export interface Look {
  id: string;
  label: string;
  ops: LookOp[];
}

export const LOOKS: Look[] = [
  { id: 'default', label: 'Default', ops: [] },
  {
    id: 'cozy',
    label: 'Cozy',
    ops: [
      { kind: 'saturate', value: 1.14 },
      { kind: 'brightness', value: 1.03 },
    ],
  },
  {
    id: 'evening',
    label: 'Evening',
    ops: [
      { kind: 'brightness', value: 0.9 },
      { kind: 'saturate', value: 0.96 },
    ],
  },
  {
    id: 'bright',
    label: 'Bright',
    ops: [
      { kind: 'brightness', value: 1.08 },
      { kind: 'saturate', value: 1.16 },
    ],
  },
  {
    id: 'quiet',
    label: 'Quiet',
    ops: [
      { kind: 'contrast', value: 0.93 },
      { kind: 'brightness', value: 1.05 },
      { kind: 'saturate', value: 0.92 },
    ],
  },
];

export const DEFAULT_LOOK_ID = 'default';

/** RGB-only scale (alpha untouched) — SVG feColorMatrix has no dedicated "brightness" type. */
function brightnessMatrix(b: number): number[] {
  // prettier-ignore
  return [
    b, 0, 0, 0, 0,
    0, b, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Standard contrast-around-midpoint matrix — luminance-only scaling, no hue component. */
function contrastMatrix(c: number): number[] {
  const i = 0.5 * (1 - c);
  // prettier-ignore
  return [
    c, 0, 0, 0, i,
    0, c, 0, 0, i,
    0, 0, c, 0, i,
    0, 0, 0, 1, 0,
  ];
}

/** One filter-primitive step, in the shape react-native-svg's <FeColorMatrix> expects. */
export interface ColorMatrixStep {
  type: 'saturate' | 'matrix';
  values: number[];
}

/** Resolve a look's ops into an ordered list of feColorMatrix steps (chain via in="…"/result="…"). */
export function stepsForLook(look: Look): ColorMatrixStep[] {
  return look.ops.map((op) => {
    if (op.kind === 'saturate') return { type: 'saturate', values: [op.value] };
    if (op.kind === 'brightness') return { type: 'matrix', values: brightnessMatrix(op.value) };
    return { type: 'matrix', values: contrastMatrix(op.value) };
  });
}
