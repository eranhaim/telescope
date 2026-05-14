import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import ProfileCard from "../components/ProfileCard";
import { useLocale } from "../i18n/useLocale";

export default function ExplorePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);

  const tabs = [
    { key: "", label: t("tabAll"), icon: "✨" },
    { key: "trending", label: t("tabTrending"), icon: "🔥" },
    { key: "popular", label: t("tabPopular"), icon: "💎" },
    { key: "new", label: t("tabNew"), icon: "🌟" },
  ];

  useEffect(() => {
    setLoading(true);
    api
      .getProfiles(activeTab || undefined)
      .then(setProfiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <div className="relative overflow-hidden mb-2">
        <div className="absolute inset-0 bg-dark-bg" />
        <div className="relative flex justify-center" style={{ mask: "linear-gradient(to bottom, black 60%, transparent 100%)", WebkitMask: "linear-gradient(to bottom, black 60%, transparent 100%)" }}>
          <img
            src="/banner.png"
            alt="טלסקופ"
            className="w-full max-w-lg object-contain"
          />
        </div>
      </div>

      <header className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabs.map((tab) => (
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
            <p className="text-sm">{t("noProfiles")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-5xl mx-auto">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                onClick={() => { api.trackProfileClick(profile._id); navigate(`/profile/${profile._id}`); }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
