import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import ProfileCard from "../components/ProfileCard";

const TABS = [
  { key: "", label: "הכל", icon: "✨" },
  { key: "trending", label: "פופולרי", icon: "🔥" },
  { key: "popular", label: "הכי נצפה", icon: "💎" },
  { key: "new", label: "חדש", icon: "🌟" },
] as const;

export default function ExplorePage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setLoading(true);
    const searchVal = search.trim() || undefined;
    api
      .getProfiles(activeTab || undefined, searchVal)
      .then(setProfiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab, search]);

  function handleSearch(value: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="relative overflow-hidden py-6 px-4 mb-2">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-pink-800/30 to-purple-900/40 animate-pulse" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-1 bg-[conic-gradient(from_0deg,#7c3aed,#ec4899,#a855f7,#db2777,#7c3aed)] opacity-20 blur-2xl animate-spin" style={{ animationDuration: "8s" }} />
        </div>
        <div className="relative text-center">
          <h1
            className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]"
            style={{
              fontFamily: "'Heebo', sans-serif",
              backgroundImage: "linear-gradient(90deg, #c084fc, #f472b6, #e879f9, #c084fc, #f472b6)",
              backgroundSize: "200% 100%",
            }}
          >
            טלסקופ
          </h1>
        </div>
      </div>

      <header className="px-4 pb-2">

        <div className="relative mb-3">
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-secondary"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="חיפוש פרופילים..."
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-dark-surface text-white placeholder-dark-text-secondary rounded-full py-2.5 pr-10 pl-4 text-sm outline-none border border-dark-border focus:border-accent/50 transition"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition border cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white text-black border-white"
                  : "bg-dark-surface text-dark-text border-dark-border hover:border-dark-text-secondary"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-2 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dark-text-secondary">
            <svg className="w-16 h-16 mb-3 opacity-40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            <p className="text-sm">לא נמצאו פרופילים</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-5xl mx-auto">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                onClick={() => navigate(`/profile/${profile._id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
