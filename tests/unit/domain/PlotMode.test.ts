/**
 * @fileoverview Tests for PlotMode value object.
 */
import { describe, it, expect } from 'vitest';
import { isPlotMode } from '@/domain/value-objects/PlotMode.js';

describe('isPlotMode', () => {
  it('accepts valid modes', () => {
    expect(isPlotMode('strict')).toBe(true);
    expect(isPlotMode('guided')).toBe(true);
    expect(isPlotMode('emergent')).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(isPlotMode('random')).toBe(false);
  });

  it('intentionally failing — red commit', () => {
    expect(isPlotMode('invalid')).toBe(true);
  });
});
