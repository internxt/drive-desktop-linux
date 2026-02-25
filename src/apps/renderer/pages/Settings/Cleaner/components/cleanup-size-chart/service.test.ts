import { ChartSegment, DEFAULT_GEOMETRY, SemicircleGeometry } from './types';
import { calculateChartSegments } from './service';

function segment(overrides: Partial<ChartSegment> = {}): ChartSegment {
  return { color: '#000', percentage: 25, size: 100, selected: false, ...overrides };
}

function geometry(overrides: Partial<SemicircleGeometry> = {}): SemicircleGeometry {
  return { ...DEFAULT_GEOMETRY, ...overrides };
}

describe('calculateChartSegments', () => {
  it('should return a single fallback arc when segments array is empty', () => {
    const result = calculateChartSegments({ segments: [], geometry: geometry() });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ color: '', selected: false });
  });

  it('should return one arc per segment', () => {
    const segments = [segment({ percentage: 50, color: '#FF0000' }), segment({ percentage: 50, color: '#00FF00' })];

    const result = calculateChartSegments({ segments, geometry: geometry() });

    expect(result).toHaveLength(2);
  });

  it('should preserve color and selected state from each segment', () => {
    const segments = [
      segment({ color: '#FF0000', selected: true, percentage: 60 }),
      segment({ color: '#00FF00', selected: false, percentage: 40 }),
    ];

    const result = calculateChartSegments({ segments, geometry: geometry() });

    expect(result[0]).toMatchObject({ color: '#FF0000', selected: true });
    expect(result[1]).toMatchObject({ color: '#00FF00', selected: false });
  });

  it('should generate a valid SVG path for each arc', () => {
    const segments = [segment({ percentage: 30 }), segment({ percentage: 70 })];

    const result = calculateChartSegments({ segments, geometry: geometry() });

    for (const arc of result) {
      expect(arc.path).toMatch(/^M .* Z$/);
    }
  });

  it('should handle a single segment spanning the full semicircle', () => {
    const segments = [segment({ percentage: 100 })];

    const result = calculateChartSegments({ segments, geometry: geometry() });

    expect(result).toHaveLength(1);
    expect(result[0].color).toBe('#000');
  });

  it('should produce different arcs when gap angle changes', () => {
    const segments = [segment({ percentage: 50 }), segment({ percentage: 50 })];

    const withSmallGap = calculateChartSegments({ segments, geometry: geometry({ segmentGap: 2 }) });
    const withLargeGap = calculateChartSegments({ segments, geometry: geometry({ segmentGap: 10 }) });

    expect(withSmallGap[0].path).not.toBe(withLargeGap[0].path);
    expect(withSmallGap[1].path).not.toBe(withLargeGap[1].path);
  });
});
