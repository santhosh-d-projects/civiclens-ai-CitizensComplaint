// City analytics (recharts, real data only).
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
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

import { GlassCard } from "@/components/ui";

const COLORS = ["#4F46E5", "#7C3AED", "#0D9488", "#2563EB", "#EA580C", "#DC2626", "#64748B"];

function entries(obj: Record<string, number>) {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export default function AnalyticsCharts({
  byCategory,
  byWard,
  byDepartment,
  byDay,
  aiBySource,
}: {
  byCategory: Record<string, number>;
  byWard: Record<string, number>;
  byDepartment: Record<string, number>;
  byDay: Record<string, number>;
  aiBySource: Record<string, number>;
}) {
  const catData = entries(byCategory);
  const wardData = entries(byWard).slice(0, 8);
  const deptData = entries(byDepartment);
  const dayData = Object.entries(byDay)
    .map(([date, value]) => ({ date: date.slice(5), value }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
  const aiData = entries(aiBySource);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints by category</h2>
        {catData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0D9488" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints by ward (top 8)</h2>
        {wardData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData}>
                <defs>
                  <linearGradient id="barIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} interval={0} angle={-20} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="url(#barIndigo)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints by department</h2>
        {deptData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {deptData.map((d, i) => (
                    <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
      <GlassCard className="p-5">
        <h2 className="text-base font-bold">Complaints per day (last 30 days)</h2>
        {dayData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={{ fill: "#7C3AED", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
      <GlassCard className="p-5 lg:col-span-2">
        <h2 className="text-base font-bold">AI analysis: model vs keyword fallback</h2>
        {aiData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No analyses logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {aiData.map((d) => {
              const total = aiData.reduce((a, b) => a + b.value, 0) || 1;
              return (
                <li key={d.name}>
                  <div className="flex justify-between gap-2">
                    <span>{d.name === "model" ? "AI model" : "Keyword fallback"}</span>
                    <span className="tnum font-semibold">{d.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-indigo/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo to-violet"
                      style={{ width: `${Math.max(8, (d.value / total) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
