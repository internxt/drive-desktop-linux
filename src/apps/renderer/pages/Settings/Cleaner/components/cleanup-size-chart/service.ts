import { ChartSegment, RoundedArcParams, SegmentArc, SemicircleGeometry, VIEWBOX_CENTER_X } from './types';

export function polarToCartesian({ cx, cy, r, angleDeg }: { cx: number; cy: number; r: number; angleDeg: number }) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function fitCornerRadius(cornerRadius: number, outerRadius: number, sweepAngle: number, thickness: number): number {
  const maxByThickness = thickness / 2;
  const maxByArcLength = (sweepAngle * Math.PI * outerRadius) / 360;
  return Math.min(cornerRadius, maxByThickness, maxByArcLength);
}

export function generateSvgPathSegment({
  cx,
  cy,
  outerRadius,
  innerRadius,
  startAngle,
  endAngle,
  cornerRadius,
}: RoundedArcParams): string {
  const sweepAngle = endAngle - startAngle;
  const thickness = outerRadius - innerRadius;
  const fittedCornerRadius = fitCornerRadius(cornerRadius, outerRadius, sweepAngle, thickness);

  const outerCornerAngle = (fittedCornerRadius / outerRadius) * (180 / Math.PI);
  const innerCornerAngle = (fittedCornerRadius / innerRadius) * (180 / Math.PI);

  const outerArcStart = startAngle + outerCornerAngle;
  const outerArcEnd = endAngle - outerCornerAngle;
  const innerArcStart = startAngle + innerCornerAngle;
  const innerArcEnd = endAngle - innerCornerAngle;

  const outerStart = polarToCartesian({ cx, cy, r: outerRadius, angleDeg: outerArcStart });
  const outerEnd = polarToCartesian({ cx, cy, r: outerRadius, angleDeg: outerArcEnd });
  const innerStart = polarToCartesian({ cx, cy, r: innerRadius, angleDeg: innerArcStart });
  const innerEnd = polarToCartesian({ cx, cy, r: innerRadius, angleDeg: innerArcEnd });

  const outerStartCorner = polarToCartesian({ cx, cy, r: outerRadius, angleDeg: startAngle });
  const innerStartCorner = polarToCartesian({ cx, cy, r: innerRadius, angleDeg: startAngle });
  const outerEndCorner = polarToCartesian({ cx, cy, r: outerRadius, angleDeg: endAngle });
  const innerEndCorner = polarToCartesian({ cx, cy, r: innerRadius, angleDeg: endAngle });

  const startEdgeOuter = polarToCartesian({ cx, cy, r: outerRadius - fittedCornerRadius, angleDeg: startAngle });
  const startEdgeInner = polarToCartesian({ cx, cy, r: innerRadius + fittedCornerRadius, angleDeg: startAngle });
  const endEdgeOuter = polarToCartesian({ cx, cy, r: outerRadius - fittedCornerRadius, angleDeg: endAngle });
  const endEdgeInner = polarToCartesian({ cx, cy, r: innerRadius + fittedCornerRadius, angleDeg: endAngle });

  const outerSweep = outerArcEnd - outerArcStart;
  const outerLargeArc = outerSweep > 180 ? 1 : 0;
  const innerSweep = innerArcEnd - innerArcStart;
  const innerLargeArc = innerSweep > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${outerLargeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `Q ${outerEndCorner.x} ${outerEndCorner.y} ${endEdgeOuter.x} ${endEdgeOuter.y}`,
    `L ${endEdgeInner.x} ${endEdgeInner.y}`,
    `Q ${innerEndCorner.x} ${innerEndCorner.y} ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${innerLargeArc} 0 ${innerStart.x} ${innerStart.y}`,
    `Q ${innerStartCorner.x} ${innerStartCorner.y} ${startEdgeInner.x} ${startEdgeInner.y}`,
    `L ${startEdgeOuter.x} ${startEdgeOuter.y}`,
    `Q ${outerStartCorner.x} ${outerStartCorner.y} ${outerStart.x} ${outerStart.y}`,
    'Z',
  ].join(' ');
}

function createSegmentArc(
  segment: ChartSegment,
  startAngle: number,
  endAngle: number,
  geometry: SemicircleGeometry,
): SegmentArc {
  return {
    path: generateSvgPathSegment({
      cx: VIEWBOX_CENTER_X,
      cy: geometry.radius,
      outerRadius: geometry.radius,
      innerRadius: geometry.radius - geometry.thickness,
      startAngle,
      endAngle,
      cornerRadius: geometry.borderRadius,
    }),
    color: segment.color,
    selected: segment.selected,
  };
}

function cumulativeAngleUpTo(
  segments: ChartSegment[],
  index: number,
  usableArcAngle: number,
  gapAngle: number,
): number {
  return segments.slice(0, index).reduce((sum, s) => sum + (s.percentage / 100) * usableArcAngle + gapAngle, 0);
}

export function layoutSegmentArcs(
  segments: ChartSegment[],
  usableArcAngle: number,
  geometry: SemicircleGeometry,
): SegmentArc[] {
  return segments.map((segment, i) => {
    const startAngle = 180 + cumulativeAngleUpTo(segments, i, usableArcAngle, geometry.segmentGap);
    const endAngle = startAngle + (segment.percentage / 100) * usableArcAngle;

    return createSegmentArc(segment, startAngle, endAngle, geometry);
  });
}

export function calculateChartSegments({
  segments,
  geometry,
}: {
  segments: ChartSegment[];
  geometry: SemicircleGeometry;
}): SegmentArc[] {
  const totalGapAngle = geometry.segmentGap * (segments.length - 1);
  const usableArcAngle = 180 - totalGapAngle;

  if (segments.length === 0 || usableArcAngle <= 0) {
    return [createSegmentArc({ color: '', percentage: 100, size: 0, selected: false }, 180, 360, geometry)];
  }

  return layoutSegmentArcs(segments, usableArcAngle, geometry);
}
