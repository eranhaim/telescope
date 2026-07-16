import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = [
  "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#f472b6",
  "#38bdf8", "#fb923c", "#34d399", "#e879f9", "#facc15",
  "#60a5fa", "#f87171", "#2dd4bf", "#c084fc", "#fbbf24",
  "#818cf8", "#fb7185", "#22d3ee", "#a3e635", "#f97316",
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px", fontSize: "12px", color: "#eee" },
  labelStyle: { color: "#999" },
  itemStyle: { color: "#eee" },
};

type Period = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<Period, string> = { daily: "יומי", weekly: "שבועי", monthly: "חודשי" };

interface ProfileDataPoint {
  profileId: string;
  time: string;
  count: number;
}

function formatTime(iso: string, period: Period): string {
  const d = new Date(iso);
  if (period === "monthly") {
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  }
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

function toYYYYMMDD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGroupedData(
  raw: ProfileDataPoint[],
  profileNames: Record<string, string>,
  period: Period
) {
  const totals = new Map<string, number>();
  const timeMap = new Map<string, Record<string, number>>();

  for (const d of raw) {
    totals.set(d.profileId, (totals.get(d.profileId) || 0) + d.count);
    const label = formatTime(d.time, period);
    if (!timeMap.has(label)) timeMap.set(label, {});
    const row = timeMap.get(label)!;
    row[d.profileId] = (row[d.profileId] || 0) + d.count;
  }

  const profileIds = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const data = Array.from(timeMap.entries()).map(([label, counts]) => ({ label, ...counts }));
  return { data, profileIds, profileNames };
}

function ProfileLineChart({
  title,
  raw,
  profileNames,
  period,
  height = 320,
}: {
  title: string;
  raw: ProfileDataPoint[];
  profileNames: Record<string, string>;
  period: Period;
  height?: number;
}) {
  const { data, profileIds } = useMemo(
    () => buildGroupedData(raw, profileNames, period),
    [raw, profileNames, period]
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

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

  const toggleProfile = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          {profileIds.map((id, i) => (
            <Line
              key={id}
              dataKey={id}
              name={profileNames[id] || id}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
              hide={hiddenIds.has(id)}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2 mt-3">
        {profileIds.map((id, i) => (
          <button
            key={id}
            onClick={() => toggleProfile(id)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-pointer transition"
            style={{
              borderColor: COLORS[i % COLORS.length],
              backgroundColor: hiddenIds.has(id) ? "transparent" : COLORS[i % COLORS.length] + "22",
              color: hiddenIds.has(id) ? "#666" : COLORS[i % COLORS.length],
              opacity: hiddenIds.has(id) ? 0.4 : 1,
              textDecoration: hiddenIds.has(id) ? "line-through" : "none",
            }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {profileNames[id] || id}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const presets = [
    { label: "7 ימים", days: 7 },
    { label: "14 ימים", days: 14 },
    { label: "30 ימים", days: 30 },
    { label: "60 ימים", days: 60 },
    { label: "הכל", days: 0 },
  ];

  const activeDays = useMemo(() => {
    if (!from) return 0;
    const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [from, to]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p.days}
            onClick={() => {
              if (p.days === 0) {
                onChange("", toYYYYMMDD(new Date()));
              } else {
                const d = new Date();
                d.setDate(d.getDate() - p.days);
                onChange(toYYYYMMDD(d), toYYYYMMDD(new Date()));
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              activeDays === p.days
                ? "bg-white text-black border-white"
                : "bg-dark-surface text-dark-text border-dark-border hover:bg-dark-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mr-2">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="bg-dark-surface border border-dark-border text-dark-text rounded-lg px-2 py-1.5 text-xs cursor-pointer"
        />
        <span className="text-dark-text-secondary text-xs">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="bg-dark-surface border border-dark-border text-dark-text rounded-lg px-2 py-1.5 text-xs cursor-pointer"
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("daily");
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toYYYYMMDD(d);
  });
  const [dateTo, setDateTo] = useState(() => toYYYYMMDD(new Date()));
  const [uniqueSiteUsers, setUniqueSiteUsers] = useState<{ time: string; count: number }[]>([]);
  const [profileEntrances, setProfileEntrances] = useState<ProfileDataPoint[]>([]);
  const [messageClicks, setMessageClicks] = useState<ProfileDataPoint[]>([]);
  const [telegramGroupClicks, setTelegramGroupClicks] = useState<ProfileDataPoint[]>([]);
  const [onlyfansClicks, setOnlyfansClicks] = useState<ProfileDataPoint[]>([]);
  const [popupClicks, setPopupClicks] = useState<{ time: string; count: number }[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [usersBySource, setUsersBySource] = useState<{ source: string; count: number }[]>([]);

  const fetchData = useCallback(async (p: Period, from: string, to: string) => {
    try {
      const data = await api.adminGetAnalytics(p, from || undefined, to || undefined);
      setUniqueSiteUsers(data.uniqueSiteUsers);
      setProfileEntrances(data.profileEntrances);
      setMessageClicks(data.messageClicks);
      setTelegramGroupClicks(data.telegramGroupClicks);
      setOnlyfansClicks(data.onlyfansClicks);
      setPopupClicks(data.popupClicks);
      setProfileNames(data.profileNames);
      setUsersBySource(data.usersBySource);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      navigate("/admin");
      return;
    }
    setLoading(true);
    fetchData(period, dateFrom, dateTo);
  }, [navigate, fetchData, period, dateFrom, dateTo]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const sourceChartData = useMemo(() => {
    const SOURCE_LABELS: Record<string, string> = {
      direct: "ישיר",
      google: "Google",
      meta: "Meta",
      instagram: "Instagram",
      tiktok: "TikTok",
    };
    return usersBySource.map((d) => ({
      source: SOURCE_LABELS[d.source] || d.source,
      users: d.count,
    }));
  }, [usersBySource]);

  const siteChartData = useMemo(() => {
    return uniqueSiteUsers.map((d) => ({
      label: formatTime(d.time, period),
      users: d.count,
    }));
  }, [uniqueSiteUsers, period]);

  const popupChartData = useMemo(() => {
    return popupClicks.map((d) => ({
      label: formatTime(d.time, period),
      clicks: d.count,
    }));
  }, [popupClicks, period]);

  const totalClicksData = useMemo(() => {
    const timeMap = new Map<string, { message: number; telegram: number; onlyfans: number }>();
    const sumInto = (data: ProfileDataPoint[], key: "message" | "telegram" | "onlyfans") => {
      for (const d of data) {
        const label = formatTime(d.time, period);
        if (!timeMap.has(label)) timeMap.set(label, { message: 0, telegram: 0, onlyfans: 0 });
        timeMap.get(label)![key] += d.count;
      }
    };
    sumInto(messageClicks, "message");
    sumInto(telegramGroupClicks, "telegram");
    sumInto(onlyfansClicks, "onlyfans");
    return Array.from(timeMap.entries()).map(([label, counts]) => ({ label, ...counts }));
  }, [messageClicks, telegramGroupClicks, onlyfansClicks, period]);

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">אנליטיקס</h1>
          <button
            onClick={() => navigate("/admin")}
            className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border px-4 py-2 rounded-lg text-sm transition cursor-pointer"
          >
            חזרה לפאנל
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer border ${
                  period === p
                    ? "bg-white text-black border-white"
                    : "bg-dark-surface text-dark-text border-dark-border hover:bg-dark-border"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-dark-border" />
          <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">משתמשים ייחודיים בטלסקופ</h3>
              {siteChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={siteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="users" name="משתמשים" fill="#4ecdc4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-dark-text-secondary text-sm">אין נתונים עדיין</div>
              )}
            </div>

            <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">משתמשים לפי מקור הגעה</h3>
              {sourceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sourceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="source" tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="users" name="משתמשים" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-dark-text-secondary text-sm">אין נתונים עדיין</div>
              )}
            </div>

            <ProfileLineChart
              title="כניסות ייחודיות לפרופילים"
              raw={profileEntrances}
              profileNames={profileNames}
              period={period}
            />

            <ProfileLineChart
              title="לחיצות על הודעה"
              raw={messageClicks}
              profileNames={profileNames}
              period={period}
            />

            <ProfileLineChart
              title="לחיצות על קבוצת טלגרם"
              raw={telegramGroupClicks}
              profileNames={profileNames}
              period={period}
            />

            <ProfileLineChart
              title="לחיצות על OnlyFans"
              raw={onlyfansClicks}
              profileNames={profileNames}
              period={period}
            />

            <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">לחיצות על פופאפ</h3>
              {popupChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={popupChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="clicks" name="לחיצות פופאפ" fill="#fb923c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-dark-text-secondary text-sm">אין נתונים עדיין</div>
              )}
            </div>

            <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">סה"כ לחיצות לפי סוג</h3>
              {totalClicksData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={totalClicksData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "#ccc" }} />
                    <Line dataKey="message" name="הודעה" stroke="#ff6b6b" strokeWidth={2} dot={false} />
                    <Line dataKey="telegram" name="קבוצת טלגרם" stroke="#38bdf8" strokeWidth={2} dot={false} />
                    <Line dataKey="onlyfans" name="OnlyFans" stroke="#f472b6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-dark-text-secondary text-sm">אין נתונים עדיין</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
