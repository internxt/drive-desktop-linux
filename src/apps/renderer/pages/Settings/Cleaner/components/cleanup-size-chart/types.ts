export type ChartSegment = {
  color: string;
  percentage: number;
  size: number;
  selected: boolean;
};

export type SegmentArc = {
  path: string;
  color: string;
  selected: boolean;
};

/**
 * Controls the shape and layout of the semicircle donut chart.
 * All values are in SVG viewBox units (viewBox="0 0 200 100").
 *
 * The center point is derived automatically: x = viewBox width / 2, y = radius.
 */
export type SemicircleGeometry = {
  /** Outer radius of the donut arc — controls overall size */
  radius: number;
  /** Width of the donut band (innerRadius = radius - thickness) */
  thickness: number;
  /** Degrees of empty space between each segment */
  segmentGap: number;
  /** Corner rounding on segment ends */
  borderRadius: number;
  /** Minimum percentage a segment can occupy (ensures tiny segments remain visible) */
  minSegmentPercentage: number;
};

export const DEFAULT_GEOMETRY: SemicircleGeometry = {
  radius: 85,
  thickness: 9,
  segmentGap: 2,
  borderRadius: 2,
  minSegmentPercentage: 2,
};

export type RoundedArcParams = {
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius: number;
};

export const VIEWBOX_CENTER_X = 100;
