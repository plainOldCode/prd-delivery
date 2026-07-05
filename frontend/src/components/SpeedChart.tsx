// src/components/SpeedChart.tsx — Live token speed line chart (SVG)
import { useMemo } from 'react';

interface DataPoint {
  time: number;
  promptTps: number;
  genTps: number;
}

interface Props {
  data: DataPoint[];
  width?: number;
  height?: number;
}

export default function SpeedChart({ data, width = 600, height = 200 }: Props) {
  const chart = useMemo(() => {
    if (data.length < 2) return null;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const maxTime = Math.max(...data.map((d) => d.time), 1);
    const maxTps = Math.max(
      ...data.flatMap((d) => [d.promptTps, d.genTps]).filter((v) => v > 0),
      1,
    );

    const xScale = (t: number) => padding.left + (t / maxTime) * plotW;
    const yScale = (v: number) => padding.top + plotH - (v / maxTps) * plotH;

    const promptPath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time).toFixed(1)} ${yScale(d.promptTps).toFixed(1)}`)
      .join(' ');

    const genPath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.time).toFixed(1)} ${yScale(d.genTps).toFixed(1)}`)
      .join(' ');

    // Grid lines
    const yTicks = 5;
    const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
      const v = (maxTps / yTicks) * i;
      const y = yScale(v);
      return (
        <line
          key={`grid-${i}`}
          x1={padding.left}
          y1={y}
          x2={width - padding.right}
          y2={y}
          stroke="#262626"
          strokeWidth={1}
        />
      );
    });

    // Y-axis labels
    const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
      const v = Math.round((maxTps / yTicks) * i);
      return (
        <text
          key={`ylbl-${i}`}
          x={padding.left - 8}
          y={yScale(v) + 4}
          textAnchor="end"
          className="text-[10px] fill-gray-500"
        >
          {v}
        </text>
      );
    });

    // X-axis label
    const xLabel = (
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="text-[10px] fill-gray-500"
      >
        Time (s)
      </text>
    );

    return { promptPath, genPath, gridLines, yLabels, xLabel, plotW, plotH, padding };
  }, [data, width, height]);

  if (!chart || data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        Chart will appear during benchmark execution…
      </div>
    );
  }

  const { padding } = chart;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      role="img"
      aria-label="Token speed chart"
    >
      {/* Grid */}
      {chart.gridLines}
      {chart.yLabels}
      {chart.xLabel}

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#404040"
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#404040"
        strokeWidth={1}
      />

      {/* Prompt TPS line (red) */}
      <path
        d={chart.promptPath}
        fill="none"
        stroke="#ef4444"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Gen TPS line (blue) */}
      <path
        d={chart.genPath}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Legend */}
      <rect x={width - 160} y={8} width={150} height={36} rx={4} fill="#171717" stroke="#262626" />
      <line x1={width - 150} y1={20} x2={width - 130} y2={20} stroke="#ef4444" strokeWidth={2} />
      <text x={width - 125} y={24} className="text-[10px] fill-gray-300">Prompt TPS</text>
      <line x1={width - 150} y1={32} x2={width - 130} y2={32} stroke="#3b82f6" strokeWidth={2} />
      <text x={width - 125} y={36} className="text-[10px] fill-gray-300">Gen TPS</text>
    </svg>
  );
}
