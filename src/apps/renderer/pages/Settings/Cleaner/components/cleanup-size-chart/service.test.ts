import { ChartSegment, DEFAULT_GEOMETRY, SemicircleGeometry } from './types';
import { calculateChartSegments, resizeSmallSegments } from './service';

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

describe('resizeSmallSegments', () => {
  const MIN = 2;

  it('returns segments unchanged when none are below the minimum', () => {
    const segments = [segment({ percentage: 50 }), segment({ percentage: 50 })];

    const result = resizeSmallSegments(segments, MIN);

    expect(result[0].percentage).toBe(50);
    expect(result[1].percentage).toBe(50);
  });

  it('returns segments unchanged when array is empty', () => {
    const result = resizeSmallSegments([], MIN);

    expect(result).toHaveLength(0);
  });

  it('boosts a small segment to the minimum and shrinks others proportionally', () => {
    const segments = [segment({ percentage: 0.5 }), segment({ percentage: 99.5 })];

    const result = resizeSmallSegments(segments, MIN);

    expect(result[0].percentage).toBe(MIN);
    expect(result[1].percentage).toBeCloseTo(98);
  });

  it('preserves total percentage after resizing', () => {
    const segments = [
      segment({ percentage: 0.1 }),
      segment({ percentage: 0.2 }),
      segment({ percentage: 60 }),
      segment({ percentage: 39.7 }),
    ];

    const result = resizeSmallSegments(segments, MIN);
    const total = result.reduce((sum, s) => sum + s.percentage, 0);

    expect(total).toBeCloseTo(100);
  });

  it('does not resize segments with zero percentage', () => {
    const segments = [segment({ percentage: 0 }), segment({ percentage: 100 })];

    const result = resizeSmallSegments(segments, MIN);

    expect(result[0].percentage).toBe(0);
    expect(result[1].percentage).toBe(100);
  });

  it('shrinks large segments proportionally to their size', () => {
    const segments = [segment({ percentage: 0.5 }), segment({ percentage: 30 }), segment({ percentage: 69.5 })];

    const result = resizeSmallSegments(segments, MIN);

    expect(result[0].percentage).toBe(MIN);
    const ratio = result[1].percentage / result[2].percentage;
    expect(ratio).toBeCloseTo(30 / 69.5);
  });
});
