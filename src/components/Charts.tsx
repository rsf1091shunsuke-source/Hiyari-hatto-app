"use client";

/**
 * TrendChart（BarChart/LineChartのラップ） / Heatmap
 * 参照：詳細設計書 2章 コンポーネント設計
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TrendPoint {
  label: string;
  value: number;
}

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#0A84FF" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function TrendBarChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="value" fill="#0A84FF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface HeatmapProps {
  matrixData: number[][];
  xLabels: string[];
  yLabels: string[];
}

export function Heatmap({ matrixData, xLabels, yLabels }: HeatmapProps) {
  const max = Math.max(1, ...matrixData.flat());
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th />
            {xLabels.map((x) => (
              <th key={x} className="px-2 py-1 font-normal text-label-secondary">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yLabels.map((y, yi) => (
            <tr key={y}>
              <td className="pr-2 text-right text-label-secondary">{y}</td>
              {xLabels.map((_, xi) => {
                const v = matrixData[yi]?.[xi] ?? 0;
                const intensity = v / max;
                return (
                  <td key={xi} className="p-1" title={`${v}件`}>
                    <div
                      className="h-6 w-6 rounded"
                      style={{
                        backgroundColor: `rgba(255,59,48,${intensity})`,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
