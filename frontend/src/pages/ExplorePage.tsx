import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import ProfileCard from "../components/ProfileCard";
import IdlePopup from "../components/IdlePopup";
import GiftPopup from "../components/GiftPopup";
import { useLocale } from "../i18n/useLocale";
import ContentSwitch from "../components/ContentSwitch";

function shuffleProfiles(profiles: Profile[]): Profile[] {
  const shuffled = [...profiles];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getProfiles(undefined, search.trim() || undefined)
      .then((items) => {
        if (!cancelled) {
          setProfiles(shuffleProfiles(items));
          setLoadError("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setLoadError("לא ניתן לטעון את הפרופילים כרגע. נסו שוב.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey, search]);

  return (
    <div className="flex flex-col min-h-screen bg-dark-bg">
      <IdlePopup />
      <div className="relative overflow-hidden mb-2">
        <div className="absolute inset-0 bg-dark-bg" />
        <div
          className="relative flex justify-center"
          style={{
            mask: "linear-gradient(to bottom, black 60%, transparent 100%)",
            WebkitMask:
              "linear-gradient(to bottom, black 60%, transparent 100%)",
          }}
        >
          <img
            src="/banner1.png"
            alt="טלסקופ"
            className="w-full max-w-lg object-contain"
          />
        </div>
      </div>

      <header className="space-y-3 px-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white">Telescope exclusive content</h1>
          <ContentSwitch active="creators" />
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search creators"
          aria-label="Search creators"
          className="w-full rounded-xl border border-dark-border bg-dark-surface px-3 py-2.5 text-sm text-white outline-none placeholder:text-dark-text-secondary focus:border-white"
        />
      </header>

      {giftOpen && <GiftPopup onClose={() => setGiftOpen(false)} />}

      {/* Gift floating button */}
      <button
        onClick={() => setGiftOpen(true)}
        className="fixed z-50 flex items-center justify-center rounded-full text-white shadow-2xl border-0 cursor-pointer"
        style={{
          bottom: "4rem",
          right: "1.75rem",
          width: "68px",
          height: "68px",
          fontSize: "2.1rem",
          background: "linear-gradient(135deg, #be0000, #ff1a1a)",
          animation: "giftPulse 1.8s ease-in-out infinite",
        }}
      >
        🎁
      </button>

      <style>{`
        @keyframes giftPulse {
          0% { box-shadow: 0 0 0 0 rgba(255,26,26,0.7); transform: scale(1); }
          50% { box-shadow: 0 0 0 14px rgba(255,26,26,0); transform: scale(1.08); }
          100% { box-shadow: 0 0 0 0 rgba(255,26,26,0); transform: scale(1); }
        }
      `}</style>

      <main className="flex-1 px-2 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-20 text-dark-text-secondary">
            <p className="text-sm text-center">{loadError}</p>
            <button
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-4 rounded-lg border border-dark-border bg-dark-surface px-4 py-2 text-sm text-white"
            >
              נסו שוב
            </button>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dark-text-secondary">
            <svg
              className="w-16 h-16 mb-3 opacity-40"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
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
                onClick={() => {
                  api.trackProfileClick(profile._id);
                  navigate(`/profile/${profile._id}`);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
