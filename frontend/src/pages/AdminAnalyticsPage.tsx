import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = [
  "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#f472b6",
  "#38bdf8", "#fb923c", "#34d399", "#e879f9", "#facc15",
  "#60a5fa", "#f87171", "#2dd4bf", "#c084fc", "#fbbf24",
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
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  const data = Array.from(timeMap.entries()).map(([label, counts]) => ({ label, ...counts }));
  return { data, profileIds, profileNames };
}

function GroupedBarChart({
  title,
  raw,
  profileNames,
  period,
  height = 300,
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
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
          <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#ccc" }} />
          {profileIds.map((id, i) => (
            <Bar key={id} dataKey={id} name={profileNames[id] || id} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("daily");
  const [loading, setLoading] = useState(true);
  const [uniqueSiteUsers, setUniqueSiteUsers] = useState<{ time: string; count: number }[]>([]);
  const [profileEntrances, setProfileEntrances] = useState<ProfileDataPoint[]>([]);
  const [messageClicks, setMessageClicks] = useState<ProfileDataPoint[]>([]);
  const [telegramGroupClicks, setTelegramGroupClicks] = useState<ProfileDataPoint[]>([]);
  const [onlyfansClicks, setOnlyfansClicks] = useState<ProfileDataPoint[]>([]);
  const [popupClicks, setPopupClicks] = useState<{ time: string; count: number }[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (p: Period) => {
    try {
      const data = await api.adminGetAnalytics(p);
      setUniqueSiteUsers(data.uniqueSiteUsers);
      setProfileEntrances(data.profileEntrances);
      setMessageClicks(data.messageClicks);
      setTelegramGroupClicks(data.telegramGroupClicks);
      setOnlyfansClicks(data.onlyfansClicks);
      setPopupClicks(data.popupClicks);
      setProfileNames(data.profileNames);
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
    fetchData(period);
  }, [navigate, fetchData, period]);

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

        <div className="flex gap-2 mb-6">
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

            <GroupedBarChart
              title="כניסות ייחודיות לפרופילים"
              raw={profileEntrances}
              profileNames={profileNames}
              period={period}
            />

            <GroupedBarChart
              title="לחיצות על הודעה"
              raw={messageClicks}
              profileNames={profileNames}
              period={period}
            />

            <GroupedBarChart
              title="לחיצות על קבוצת טלגרם"
              raw={telegramGroupClicks}
              profileNames={profileNames}
              period={period}
            />

            <GroupedBarChart
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
                  <BarChart data={totalClicksData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 10 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
                    <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "#ccc" }} />
                    <Bar dataKey="message" name="הודעה" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="telegram" name="קבוצת טלגרם" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="onlyfans" name="OnlyFans" fill="#f472b6" radius={[4, 4, 0, 0]} />
                  </BarChart>
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
