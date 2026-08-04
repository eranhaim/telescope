import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import AdminProfileForm from "../components/AdminProfileForm";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableProfileRow({
  profile,
  onEdit,
  onDelete,
}: {
  profile: Profile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: profile._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-dark-card border border-dark-border rounded-xl p-4"
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing bg-transparent border-0 p-1 text-dark-text-secondary hover:text-white touch-none"
      >
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </button>
      <div className="w-14 h-14 rounded-full overflow-hidden bg-dark-surface shrink-0">
        {profile.profileImageUrl ? (
          <img src={profile.profileImageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-dark-text-secondary text-lg">
            {profile.name[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white text-sm truncate">{profile.name}</span>
          {profile.isVerified && <span className="text-blue-400 text-xs">✓</span>}
          <span className="text-dark-text-secondary text-[10px] bg-dark-surface px-1.5 py-0.5 rounded-full shrink-0">
            👁 {(profile.clicks || 0).toLocaleString()}
          </span>
        </div>
        <p className="text-dark-text-secondary text-xs truncate">{profile.handle}</p>
        <div className="flex gap-1 mt-1">
          {profile.tags.map((t) => (
            <span key={t} className="bg-dark-surface text-dark-text-secondary text-[10px] px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="text-dark-text-secondary hover:text-white text-sm bg-transparent border-0 cursor-pointer p-1 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="text-dark-text-secondary hover:text-red-400 text-sm bg-transparent border-0 cursor-pointer p-1 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function GiftEntryRow({
  entry,
  onRemove,
  onLinkChange,
}: {
  entry: { profileId: string; customLink: string; name: string; profileImageThumbUrl: string };
  onRemove: () => void;
  onLinkChange: (val: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.profileId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-dark-surface rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-transparent border-0 p-1 text-dark-text-secondary hover:text-white touch-none"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </button>
          {entry.profileImageThumbUrl ? (
            <img src={entry.profileImageThumbUrl} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center text-sm">👤</div>
          )}
          <span className="text-white text-sm">{entry.name}</span>
        </div>
        <button onClick={onRemove} className="text-red-400 text-xs border-0 bg-transparent cursor-pointer">הסר</button>
      </div>
      <input
        type="text"
        value={entry.customLink}
        placeholder="לינק מותאם (ברירת מחדל: לינק הדוגמנית)"
        className="w-full bg-dark-bg border border-dark-border rounded px-2 py-1.5 text-white text-xs"
        onChange={(e) => onLinkChange(e.target.value)}
      />
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("admin_token"));
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [siteOpens, setSiteOpens] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [hourlyData, setHourlyData] = useState<{ time: string; label: string; count: number }[]>([]);

  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupIdleSeconds, setPopupIdleSeconds] = useState(5);
  const [popupPosters, setPopupPosters] = useState<{
    _id: string;
    name: string;
    photos: { key: string; url: string; thumbnailUrl?: string }[];
    buttonLabel: string;
    buttonUrl: string;
    enabled: boolean;
  }[]>([]);
  const [popupSaving, setPopupSaving] = useState(false);
  const [expandedPoster, setExpandedPoster] = useState<string | null>(null);
  const posterFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [giftEnabled, setGiftEnabled] = useState(true);
  const [giftEntries, setGiftEntries] = useState<{ profileId: string; customLink: string; name: string; profileImageThumbUrl: string }[]>([]);
  const [giftSaving, setGiftSaving] = useState(false);

  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<{ _id: string; message: string; sent: number; failed: number; total: number; startedAt: string; completedAt?: string }[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const { token } = await api.adminLogin(password);
      localStorage.setItem("admin_token", token);
      setAuthenticated(true);
    } catch {
      setLoginError("סיסמה שגויה");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
  }

  async function loadProfiles() {
    setLoading(true);
    try {
      const [data, stats, hourly, popupData, bcHistory, giftData] = await Promise.all([
        api.getProfiles(),
        api.adminGetStats(),
        api.adminGetHourlyUsers(7),
        api.adminGetPopup(),
        api.adminBroadcastHistory(),
        api.adminGetGift(),
      ]);
      setProfiles(data);
      setSiteOpens(stats.siteOpens);
      setTotalUsers(hourly.totalUsers);
      setPopupEnabled(popupData.enabled);
      setPopupIdleSeconds(popupData.idleSeconds);
      setPopupPosters(popupData.posters);
      setBroadcastHistory(bcHistory);
      setGiftEnabled(giftData.enabled);
      setGiftEntries(giftData.entries);

      const formatted = hourly.hourly.map((h) => {
        const d = new Date(h.time);
        const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
        const hour = d.getHours().toString().padStart(2, "0") + ":00";
        return { time: h.time, label: `${day} ${hour}`, count: h.count };
      });
      setHourlyData(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק את הפרופיל ואת כל המדיה שלו?")) return;
    try {
      await api.adminDeleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function handleGiftDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = giftEntries.findIndex((e) => e.profileId === active.id);
    const newIndex = giftEntries.findIndex((e) => e.profileId === over.id);
    setGiftEntries(arrayMove(giftEntries, oldIndex, newIndex));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = profiles.findIndex((p) => p._id === active.id);
    const newIndex = profiles.findIndex((p) => p._id === over.id);
    const reordered = arrayMove(profiles, oldIndex, newIndex);
    setProfiles(reordered);

    try {
      await api.adminReorderProfiles(
        reordered.map((p, i) => ({ id: p._id, order: i }))
      );
    } catch (err) {
      console.error(err);
      loadProfiles();
    }
  }

  useEffect(() => {
    if (authenticated) loadProfiles();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-dark-card rounded-2xl p-6 border border-dark-border">
          <h1 className="text-xl font-bold text-white mb-1">כניסת מנהל</h1>
          <p className="text-dark-text-secondary text-sm mb-6">הזן את סיסמת המנהל כדי להמשיך</p>
          {loginError && (
            <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">{loginError}</div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="סיסמה"
            className="w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent/50 transition placeholder-dark-text-secondary mb-4"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition border-0 cursor-pointer"
          >
            כניסה
          </button>
        </form>
      </div>
    );
  }

  if (editing || creating) {
    return (
      <div className="min-h-screen bg-dark-bg p-4">
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">
            {editing ? `עריכה: ${editing.name}` : "פרופיל חדש"}
          </h2>
          <AdminProfileForm
            profile={editing || undefined}
            onSaved={() => {
              setEditing(null);
              setCreating(false);
              loadProfiles();
            }}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">פאנל ניהול</h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/admin/analytics")}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition border-0 cursor-pointer"
            >
              אנליטיקס
            </button>
            <button
              onClick={() => setCreating(true)}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition border-0 cursor-pointer"
            >
              + פרופיל חדש
            </button>
            <button
              onClick={handleLogout}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border px-4 py-2 rounded-lg text-sm transition cursor-pointer"
            >
              התנתק
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg">👁</div>
            <div>
              <p className="text-xs text-dark-text-secondary">פתיחות מהבוט</p>
              <p className="text-xl font-bold text-white">{siteOpens.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-lg">👤</div>
            <div>
              <p className="text-xs text-dark-text-secondary">סה"כ משתמשים ב-DB</p>
              <p className="text-xl font-bold text-white">{totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">משתמשים חדשים לפי שעה (7 ימים)</h3>
            <button
              onClick={() => api.adminExportUsers().catch(console.error)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition border-0 cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Export
            </button>
          </div>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#999" }}
                  itemStyle={{ color: "#ff6b6b" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#ff6b6b"
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  name="משתמשים"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-dark-text-secondary text-sm">
              אין נתונים עדיין
            </div>
          )}
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">הגדרות פופאפ</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-dark-text-secondary">{popupEnabled ? "פעיל" : "כבוי"}</span>
              <div
                className={`w-10 h-5 rounded-full relative transition ${popupEnabled ? "bg-accent" : "bg-dark-surface"}`}
                onClick={() => setPopupEnabled(!popupEnabled)}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${popupEnabled ? "left-5" : "left-0.5"}`} />
              </div>
            </label>
          </div>

          <div className="mb-3">
            <label className="text-xs text-dark-text-secondary block mb-1">שניות חוסר פעילות</label>
            <input
              type="number"
              min={1}
              value={popupIdleSeconds}
              onChange={(e) => setPopupIdleSeconds(Number(e.target.value))}
              className="w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition"
            />
          </div>

          <button
            disabled={popupSaving}
            onClick={async () => {
              setPopupSaving(true);
              try {
                await api.adminUpdatePopup({
                  enabled: popupEnabled,
                  idleSeconds: popupIdleSeconds,
                });
              } catch (err) {
                console.error("Failed to save popup config:", err);
              } finally {
                setPopupSaving(false);
              }
            }}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition border-0 cursor-pointer mb-4"
          >
            {popupSaving ? "שומר..." : "שמור הגדרות כלליות"}
          </button>

          <div className="border-t border-dark-border pt-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">פוסטרים ({popupPosters.length})</h4>
              <button
                onClick={async () => {
                  try {
                    const newPoster = await api.adminCreatePoster({});
                    setPopupPosters((prev) => [...prev, { ...newPoster, photos: [] }]);
                    setExpandedPoster(newPoster._id);
                  } catch (err) {
                    console.error("Failed to create poster:", err);
                  }
                }}
                className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg text-xs font-medium transition border-0 cursor-pointer"
              >
                + פוסטר חדש
              </button>
            </div>

            {popupPosters.length === 0 ? (
              <p className="text-dark-text-secondary text-xs text-center py-4">אין פוסטרים עדיין. הוסף פוסטר חדש.</p>
            ) : (
              <div className="space-y-2">
                {popupPosters.map((poster) => {
                  const isExpanded = expandedPoster === poster._id;
                  return (
                    <div key={poster._id} className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer"
                        onClick={() => setExpandedPoster(isExpanded ? null : poster._id)}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${poster.enabled ? "bg-green-400" : "bg-gray-500"}`} />
                        <span className="text-sm text-white flex-1 truncate">{poster.name || "פוסטר ללא שם"}</span>
                        <span className="text-[10px] text-dark-text-secondary">{poster.photos.length} תמונות</span>
                        <svg className={`w-4 h-4 text-dark-text-secondary transition ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-dark-border pt-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <div
                                className={`w-9 h-4.5 rounded-full relative transition ${poster.enabled ? "bg-accent" : "bg-dark-card"}`}
                                onClick={async () => {
                                  const newEnabled = !poster.enabled;
                                  setPopupPosters((prev) => prev.map((p) => p._id === poster._id ? { ...p, enabled: newEnabled } : p));
                                  await api.adminUpdatePoster(poster._id, { enabled: newEnabled });
                                }}
                              >
                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${poster.enabled ? "left-[18px]" : "left-0.5"}`} />
                              </div>
                              <span className="text-xs text-dark-text-secondary">{poster.enabled ? "פעיל" : "כבוי"}</span>
                            </label>
                          </div>

                          <div>
                            <label className="text-xs text-dark-text-secondary block mb-1">שם הפוסטר</label>
                            <input
                              type="text"
                              value={poster.name}
                              onChange={(e) => setPopupPosters((prev) => prev.map((p) => p._id === poster._id ? { ...p, name: e.target.value } : p))}
                              onBlur={() => api.adminUpdatePoster(poster._id, { name: poster.name })}
                              className="w-full bg-dark-card text-white border border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-dark-text-secondary block mb-1">טקסט כפתור</label>
                            <input
                              type="text"
                              value={poster.buttonLabel}
                              onChange={(e) => setPopupPosters((prev) => prev.map((p) => p._id === poster._id ? { ...p, buttonLabel: e.target.value } : p))}
                              onBlur={() => api.adminUpdatePoster(poster._id, { buttonLabel: poster.buttonLabel })}
                              className="w-full bg-dark-card text-white border border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-dark-text-secondary block mb-1">קישור כפתור</label>
                            <input
                              type="url"
                              value={poster.buttonUrl}
                              onChange={(e) => setPopupPosters((prev) => prev.map((p) => p._id === poster._id ? { ...p, buttonUrl: e.target.value } : p))}
                              onBlur={() => api.adminUpdatePoster(poster._id, { buttonUrl: poster.buttonUrl })}
                              className="w-full bg-dark-card text-white border border-dark-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/50 transition"
                              dir="ltr"
                            />
                          </div>

                          <div>
                            <label className="text-xs text-dark-text-secondary block mb-1">בנק תמונות</label>
                            <div className="flex gap-2 flex-wrap">
                              {poster.photos.map((photo) => (
                                <div key={photo.key} className="relative w-16 h-16 rounded-lg overflow-hidden bg-dark-card group">
                                  <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                                  <button
                                    onClick={async () => {
                                      if (!confirm("למחוק תמונה?")) return;
                                      await api.adminDeletePosterPhoto(poster._id, photo.key);
                                      setPopupPosters((prev) =>
                                        prev.map((p) =>
                                          p._id === poster._id
                                            ? { ...p, photos: p.photos.filter((ph) => ph.key !== photo.key) }
                                            : p
                                        )
                                      );
                                    }}
                                    className="absolute inset-0 bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition flex items-center justify-center border-0 cursor-pointer text-lg"
                                  >
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => posterFileRefs.current[poster._id]?.click()}
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-dark-border text-dark-text-secondary hover:border-accent hover:text-accent flex items-center justify-center transition cursor-pointer bg-transparent text-xl"
                              >
                                +
                              </button>
                              <input
                                ref={(el) => { posterFileRefs.current[poster._id] = el; }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const result = await api.adminUploadPosterPhoto(poster._id, file);
                                    setPopupPosters((prev) =>
                                      prev.map((p) =>
                                        p._id === poster._id
                                          ? { ...p, photos: [...p.photos, result] }
                                          : p
                                      )
                                    );
                                  } catch (err) {
                                    console.error("Poster photo upload failed:", err);
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              if (!confirm("למחוק את הפוסטר הזה ואת כל התמונות שלו?")) return;
                              await api.adminDeletePoster(poster._id);
                              setPopupPosters((prev) => prev.filter((p) => p._id !== poster._id));
                            }}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium transition border-0 cursor-pointer mt-1"
                          >
                            מחק פוסטר
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Gift Config */}
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">🎁 הגדרות מתנה</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-text-secondary">{giftEnabled ? "פעיל" : "כבוי"}</span>
              <button
                className={`w-10 h-5 rounded-full relative transition ${giftEnabled ? "bg-accent" : "bg-dark-surface"}`}
                onClick={() => setGiftEnabled(!giftEnabled)}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${giftEnabled ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>

          <p className="text-xs text-dark-text-secondary mb-3">בחר אילו דוגמניות יופיעו בפופאפ המתנה ואיזה לינק יפתח</p>

          {/* Add profile */}
          <div className="mb-3">
            <select
              className="w-full bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-white text-sm"
              defaultValue=""
              onChange={(e) => {
                const profileId = e.target.value;
                if (!profileId) return;
                if (giftEntries.find((en) => en.profileId === profileId)) return;
                const profile = profiles.find((p) => p._id === profileId);
                if (!profile) return;
                setGiftEntries((prev) => [...prev, {
                  profileId,
                  customLink: profile.telegramLink || "",
                  name: profile.name,
                  profileImageThumbUrl: profile.profileImageThumbUrl || profile.profileImageUrl || "",
                }]);
                e.target.value = "";
              }}
            >
              <option value="">+ הוסף דוגמנית</option>
              {profiles
                .filter((p) => !giftEntries.find((en) => en.profileId === p._id))
                .map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
            </select>
          </div>

          {/* Entries list */}
          {giftEntries.length === 0 ? (
            <p className="text-dark-text-secondary text-xs text-center py-4">לא נבחרו דוגמניות עדיין</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGiftDragEnd}>
              <SortableContext items={giftEntries.map((e) => e.profileId)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 mb-3">
                  {giftEntries.map((entry) => (
                    <GiftEntryRow
                      key={entry.profileId}
                      entry={entry}
                      onRemove={() => setGiftEntries((prev) => prev.filter((e) => e.profileId !== entry.profileId))}
                      onLinkChange={(val) => setGiftEntries((prev) => prev.map((en) => en.profileId === entry.profileId ? { ...en, customLink: val } : en))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button
            disabled={giftSaving}
            onClick={async () => {
              setGiftSaving(true);
              try {
                await api.adminSaveGift({
                  enabled: giftEnabled,
                  entries: giftEntries.map((e) => ({ profileId: e.profileId, customLink: e.customLink })),
                });
              } catch (err) {
                console.error("Failed to save gift config:", err);
              } finally {
                setGiftSaving(false);
              }
            }}
            className="w-full bg-accent hover:bg-accent/80 text-white py-2 rounded-lg text-sm font-medium transition border-0 cursor-pointer disabled:opacity-50"
          >
            {giftSaving ? "שומר..." : "שמור הגדרות מתנה"}
          </button>
        </div>

        <div className="bg-dark-card border border-dark-border rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">שליחת הודעה לכולם</h3>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="כתוב הודעה לשליחה לכל המשתמשים..."
            rows={4}
            dir="rtl"
            className="w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent/50 transition placeholder-dark-text-secondary resize-none mb-3"
          />
          {broadcastResult && (
            <div className="bg-dark-surface border border-dark-border rounded-lg px-3 py-2 text-sm mb-3">
              <span className="text-green-400">נשלח: {broadcastResult.sent}</span>
              {broadcastResult.failed > 0 && (
                <span className="text-red-400 mr-3"> | נכשל: {broadcastResult.failed}</span>
              )}
              <span className="text-dark-text-secondary mr-3"> | סה"כ: {broadcastResult.total}</span>
              {broadcastSending && (
                <span className="text-yellow-400 mr-3"> | שולח... ({broadcastResult.sent + broadcastResult.failed}/{broadcastResult.total})</span>
              )}
            </div>
          )}
          <button
            disabled={broadcastSending || !broadcastMessage.trim()}
            onClick={async () => {
              if (!confirm(`לשלוח את ההודעה ל-${totalUsers} משתמשים?`)) return;
              setBroadcastSending(true);
              setBroadcastResult(null);
              try {
                await api.adminBroadcast(broadcastMessage);
                setBroadcastMessage("");
                const poll = setInterval(async () => {
                  try {
                    const status = await api.adminBroadcastStatus();
                    setBroadcastResult(status);
                    if (!status.sending) {
                      clearInterval(poll);
                      setBroadcastSending(false);
                    }
                  } catch {
                    clearInterval(poll);
                    setBroadcastSending(false);
                  }
                }, 2000);
              } catch (err) {
                console.error("Broadcast failed:", err);
                alert("שליחת ההודעה נכשלה");
                setBroadcastSending(false);
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition border-0 cursor-pointer flex items-center justify-center gap-2"
          >
            {broadcastSending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                שולח...
              </>
            ) : (
              "שלח לכולם"
            )}
          </button>

          {broadcastHistory.length > 0 && (
            <div className="mt-3 border-t border-dark-border pt-3">
              <h4 className="text-xs text-dark-text-secondary mb-2">היסטוריית שידורים</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {broadcastHistory.map((b) => (
                  <div key={b._id} className="bg-dark-surface rounded-lg px-3 py-2 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="text-dark-text-secondary">
                        {new Date(b.startedAt).toLocaleDateString("he-IL")} {new Date(b.startedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          <span className="text-green-400">{b.sent}</span>
                          {b.failed > 0 && <span className="text-red-400">/{b.failed}</span>}
                          <span className="text-dark-text-secondary">/{b.total}</span>
                        </span>
                        <button
                          onClick={async () => {
                            if (!confirm("למחוק את השידור הזה?")) return;
                            await api.adminDeleteBroadcast(b._id);
                            setBroadcastHistory((h) => h.filter((x) => x._id !== b._id));
                          }}
                          className="text-red-400 hover:text-red-300 text-xs"
                          title="מחק"
                        >✕</button>
                      </div>
                    </div>
                    <p className="text-dark-text truncate" dir="rtl">{b.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 text-dark-text-secondary">
            <p className="text-lg mb-2">אין פרופילים עדיין</p>
            <p className="text-sm">לחץ על "+ פרופיל חדש" כדי ליצור אחד</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={profiles.map((p) => p._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {profiles.map((p) => (
                  <SortableProfileRow
                    key={p._id}
                    profile={p}
                    onEdit={() => setEditing(p)}
                    onDelete={() => handleDelete(p._id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
