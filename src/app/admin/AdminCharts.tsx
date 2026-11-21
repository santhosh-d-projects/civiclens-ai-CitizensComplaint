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
} from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#B42318",
  high: "#D97706",
  medium: "#2563EB",
  low: "#16845B",
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
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints by status</h2>
        {statusData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#17324D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints by severity</h2>
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
            <h3 className="text-sm font-semibold">Top departments</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {byDepartment.slice(0, 5).map((d) => (
                <li key={d.name} className="flex justify-between">
                  <span>{d.name}</span>
                  <span className="tnum font-semibold">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
