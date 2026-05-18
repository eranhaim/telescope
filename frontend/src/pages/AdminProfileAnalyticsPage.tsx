import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

const COLORS = [
  "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa", "#f472b6",
  "#38bdf8", "#fb923c", "#34d399", "#e879f9", "#facc15",
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px", fontSize: "12px", color: "#eee" },
  labelStyle: { color: "#999" },
  itemStyle: { color: "#eee" },
};

function formatHour(iso: string) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:00`;
}

interface HourlyData {
  time: string;
  count: number;
}

function HourlyChart({ data, color, height = 200 }: { data: HourlyData[]; color: string; height?: number }) {
  const chartData = useMemo(() => data.map((d) => ({ label: formatHour(d.time), count: d.count })), [data]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-dark-text-secondary text-sm" style={{ height }}>
        אין נתונים עדיין
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="label" tick={{ fill: "#999", fontSize: 9 }} interval="preserveStartEnd" tickLine={false} axisLine={{ stroke: "#333" }} />
        <YAxis tick={{ fill: "#999", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} name="לחיצות" />
      </LineChart>
    </ResponsiveContainer>
  );
}

const BUTTON_LABELS: Record<string, string> = { message: "הודעה", share: "שיתוף" };

export default function AdminProfileAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [mediaItems, setMediaItems] = useState<Array<{ s3Key: string; thumbnailUrl?: string; url?: string; type: string; order: number }>>([]);
  const [linkButtons, setLinkButtons] = useState<Array<{ label: string; order: number }>>([]);
  const [mediaClicksHourly, setMediaClicksHourly] = useState<{ s3Key: string; time: string; count: number }[]>([]);
  const [buttonClicksHourly, setButtonClicksHourly] = useState<{ buttonType: string; buttonLabel?: string; time: string; count: number }[]>([]);

  useEffect(() => {
    if (!localStorage.getItem("admin_token") || !id) {
      navigate("/admin");
      return;
    }
    api.adminGetProfileAnalytics(id).then((data) => {
      setProfileName(data.profile.name);
      setMediaItems(data.profile.media || []);
      setLinkButtons(data.profile.linkButtons || []);
      setMediaClicksHourly(data.mediaClicksHourly);
      setButtonClicksHourly(data.buttonClicksHourly);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id, navigate]);

  const mediaCharts = useMemo(() => {
    const sorted = [...mediaItems].sort((a, b) => a.order - b.order);
    return sorted.map((item) => ({
      ...item,
      data: mediaClicksHourly.filter((e) => e.s3Key === item.s3Key),
    }));
  }, [mediaItems, mediaClicksHourly]);

  const buttonCharts = useMemo(() => {
    const charts: { key: string; label: string; data: HourlyData[] }[] = [];

    const messageData = buttonClicksHourly.filter((e) => e.buttonType === "message");
    charts.push({ key: "message", label: BUTTON_LABELS.message, data: messageData });

    const shareData = buttonClicksHourly.filter((e) => e.buttonType === "share");
    charts.push({ key: "share", label: BUTTON_LABELS.share, data: shareData });

    const sortedButtons = [...linkButtons].sort((a, b) => a.order - b.order);
    for (const btn of sortedButtons) {
      const data = buttonClicksHourly.filter((e) => e.buttonType === "link_button" && e.buttonLabel === btn.label);
      charts.push({ key: `link_${btn.label}`, label: btn.label, data });
    }

    return charts;
  }, [buttonClicksHourly, linkButtons]);

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
          <h1 className="text-xl font-bold text-white">אנליטיקס - {profileName}</h1>
          <button
            onClick={() => navigate("/admin")}
            className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border px-4 py-2 rounded-lg text-sm transition cursor-pointer"
          >
            חזרה לפאנל
          </button>
        </div>

        {mediaCharts.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">לחיצות על תוכן - לפי שעה (7 ימים)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {mediaCharts.map((item, i) => (
                <div key={item.s3Key} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
                  <div className="w-full h-40 bg-dark-surface flex items-center justify-center">
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : item.url ? (
                      item.type === "video" ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <span className="text-dark-text-secondary text-sm">אין תמונה</span>
                    )}
                  </div>
                  <div className="p-3">
                    <HourlyChart data={item.data} color={COLORS[i % COLORS.length]} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {buttonCharts.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-3">לחיצות על כפתורים - לפי שעה (7 ימים)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {buttonCharts.map((chart, i) => (
                <div key={chart.key} className="bg-dark-card border border-dark-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">{chart.label}</h3>
                  <HourlyChart data={chart.data} color={COLORS[i % COLORS.length]} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
