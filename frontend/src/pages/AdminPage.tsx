import { useState, useEffect } from "react";
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

export default function AdminPage() {
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
      const [data, stats, hourly] = await Promise.all([
        api.getProfiles(),
        api.adminGetStats(),
        api.adminGetHourlyUsers(7),
      ]);
      setProfiles(data);
      setSiteOpens(stats.siteOpens);
      setTotalUsers(hourly.totalUsers);

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
