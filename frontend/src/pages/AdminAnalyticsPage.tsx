import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = [
  "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#f472b6",
  "#38bdf8", "#fb923c", "#34d399", "#e879f9", "#facc15",
  "#60a5fa", "#f87171", "#2dd4bf", "#c084fc", "#fbbf24",
];

interface DataPoint {
  profileId: string;
  time: string;
  count: number;
}

function buildChartData(
  raw: DataPoint[],
  profileNames: Record<string, string>,
  formatLabel: (iso: string) => string
) {
  const profileIds = [...new Set(raw.map((d) => d.profileId))];
  const timeMap = new Map<string, Record<string, number>>();

  for (const d of raw) {
    const label = formatLabel(d.time);
    if (!timeMap.has(label)) timeMap.set(label, {});
    const row = timeMap.get(label)!;
    row[d.profileId] = (row[d.profileId] || 0) + d.count;
  }

  const data = Array.from(timeMap.entries()).map(([label, counts]) => ({
    label,
    ...counts,
  }));

  return { data, profileIds, profileNames };
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" },
  labelStyle: { color: "#999" },
};

function MultiLineChart({
  title,
  raw,
  profileNames,
  formatter,
  height = 280,
}: {
  title: string;
  raw: DataPoint[];
  profileNames: Record<string, string>;
  formatter: (iso: string) => string;
  height?: number;
}) {
  const { data, profileIds } = useMemo(
    () => buildChartData(raw, profileNames, formatter),
    [raw, profileNames, formatter]
  );

  if (data.length === 0) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
        <div className="flex items-center justify-center text-dark-text-secondary text-sm" style={{ height }}>
          אין נתונים עדיין
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#999", fontSize: 10 }}
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: "#333" }}
          />
          <YAxis
            tick={{ fill: "#999", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip {...tooltipStyle} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#ccc" }}
            formatter={(value: string) => profileNames[value] || value}
          />
          {profileIds.map((id, i) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              name={profileNames[id] || id}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileViewsHourly, setProfileViewsHourly] = useState<DataPoint[]>([]);
  const [profileViewsDaily, setProfileViewsDaily] = useState<DataPoint[]>([]);
  const [mediaClicksDaily, setMediaClicksDaily] = useState<DataPoint[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      navigate("/admin");
      return;
    }
    api
      .adminGetAnalytics()
      .then((data) => {
        setProfileViewsHourly(data.profileViewsHourly);
        setProfileViewsDaily(data.profileViewsDaily);
        setMediaClicksDaily(data.mediaClicksDaily);
        setProfileNames(data.profileNames);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [navigate]);

  const barData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of profileViewsDaily) {
      totals.set(d.profileId, (totals.get(d.profileId) || 0) + d.count);
    }
    return Array.from(totals.entries())
      .map(([id, total]) => ({ name: profileNames[id] || id, total, id }))
      .sort((a, b) => b.total - a.total);
  }, [profileViewsDaily, profileNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">אנליטיקס</h1>
          <button
            onClick={() => navigate("/admin")}
            className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border px-4 py-2 rounded-lg text-sm transition cursor-pointer"
          >
            חזרה לפאנל
          </button>
        </div>

        <MultiLineChart
          title="צפיות בפרופילים - לפי שעה (7 ימים)"
          raw={profileViewsHourly}
          profileNames={profileNames}
          formatter={formatHour}
        />

        <MultiLineChart
          title="צפיות בפרופילים - לפי יום (30 ימים)"
          raw={profileViewsDaily}
          profileNames={profileNames}
          formatter={formatDay}
        />

        <MultiLineChart
          title="צפיות בתוכן - לפי יום (30 ימים)"
          raw={mediaClicksDaily}
          profileNames={profileNames}
          formatter={formatDay}
        />

        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">השוואת פרופילים - סה"כ צפיות (30 ימים)</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 40)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#999", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#333" }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#ccc", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={75}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" name="צפיות" radius={[0, 4, 4, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-dark-text-secondary text-sm">
              אין נתונים עדיין
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
