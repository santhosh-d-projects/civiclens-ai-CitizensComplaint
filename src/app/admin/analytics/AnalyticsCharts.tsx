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

const COLORS = ["#17324D", "#087F8C", "#2563EB", "#D97706", "#16845B", "#B42318", "#64748B"];

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
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints by category</h2>
        {catData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#087F8C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints by ward (top 8)</h2>
        {wardData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#17324D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints by department</h2>
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
      </div>
      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="text-base font-semibold">Complaints per day (last 30 days)</h2>
        {dayData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No complaints yet.</p>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#087F8C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-lg border border-line bg-white p-5 lg:col-span-2">
        <h2 className="text-base font-semibold">AI analysis: model vs keyword fallback</h2>
        {aiData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-muted">No analyses logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-1 text-sm">
            {aiData.map((d) => (
              <li key={d.name} className="flex justify-between">
                <span>{d.name === "model" ? "AI model" : "Keyword fallback"}</span>
                <span className="tnum font-semibold">{d.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
