import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import AdminProfileForm from "../components/AdminProfileForm";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(!!localStorage.getItem("admin_token"));
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const { token } = await api.adminLogin(password);
      localStorage.setItem("admin_token", token);
      setAuthenticated(true);
    } catch {
      setLoginError("Invalid password");
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
  }

  async function loadProfiles() {
    setLoading(true);
    try {
      const data = await api.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this profile and all its media?")) return;
    try {
      await api.adminDeleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (authenticated) loadProfiles();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-dark-card rounded-2xl p-6 border border-dark-border">
          <h1 className="text-xl font-bold text-white mb-1">Admin Login</h1>
          <p className="text-dark-text-secondary text-sm mb-6">Enter the admin password to continue</p>
          {loginError && (
            <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded-lg mb-4">{loginError}</div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-dark-surface text-white border border-dark-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent/50 transition placeholder-dark-text-secondary mb-4"
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-lg text-sm font-medium transition border-0 cursor-pointer"
          >
            Login
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
            {editing ? `Edit: ${editing.name}` : "New Profile"}
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
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(true)}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition border-0 cursor-pointer"
            >
              + New Profile
            </button>
            <button
              onClick={handleLogout}
              className="bg-dark-surface text-dark-text hover:bg-dark-border border border-dark-border px-4 py-2 rounded-lg text-sm transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-16 text-dark-text-secondary">
            <p className="text-lg mb-2">No profiles yet</p>
            <p className="text-sm">Click "+ New Profile" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-4 bg-dark-card border border-dark-border rounded-xl p-4"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-dark-surface shrink-0">
                  {p.profileImageUrl ? (
                    <img src={p.profileImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-text-secondary text-lg">
                      {p.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white text-sm truncate">{p.name}</span>
                    {p.isVerified && <span className="text-blue-400 text-xs">✓</span>}
                  </div>
                  <p className="text-dark-text-secondary text-xs truncate">{p.handle}</p>
                  <div className="flex gap-1 mt-1">
                    {p.tags.map((t) => (
                      <span key={t} className="bg-dark-surface text-dark-text-secondary text-[10px] px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-dark-text-secondary hover:text-white text-sm bg-transparent border-0 cursor-pointer p-1 transition"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(p._id)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
