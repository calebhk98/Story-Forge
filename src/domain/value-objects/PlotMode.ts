/**
 * @fileoverview Plot mode value object: strict, guided, or emergent.
 */

/** All valid plot modes. */
export const PLOT_MODES = ['strict', 'guided', 'emergent'] as const;

/** A valid plot mode string. */
export type PlotMode = (typeof PLOT_MODES)[number];

/**
 * Returns true if the value is a valid PlotMode.
 * @param value - The value to check.
 * @returns True if value is a PlotMode.
 */
export function isPlotMode(value: unknown): value is PlotMode {
  return PLOT_MODES.includes(value as PlotMode);
}
