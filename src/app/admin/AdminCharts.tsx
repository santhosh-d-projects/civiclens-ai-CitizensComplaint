// Dashboard charts (recharts, real data only).
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#2563EB",
  low: "#059669",
};

export default function AdminCharts({
  byStatus,
  bySeverity,
  byDepartment,
}: {
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byDepartment: { name: string; count: number }[];
}) {
  const statusData = Object.entries(byStatus).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));
  const severityData = Object.entries(bySeverity).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  return (
    <>
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints by status</h2>
        {statusData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <defs>
                  <linearGradient id="barIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="url(#barIndigo)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints by severity</h2>
        {severityData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {severityData.map((d) => (
                    <Cell
                      key={d.name}
                      fill={SEVERITY_COLORS[d.name.toLowerCase()] ?? "#64748B"}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {byDepartment.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="text-sm font-bold">Top departments</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {byDepartment.slice(0, 5).map((d) => (
                <li key={d.name}>
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{d.name}</span>
                    <span className="tnum shrink-0 font-semibold">{d.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-indigo/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo to-violet"
                      style={{ width: `${Math.max(8, (d.count / byDepartment[0].count) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>
    </>
  );
}
