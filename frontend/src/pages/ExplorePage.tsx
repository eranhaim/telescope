import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import ProfileCard from "../components/ProfileCard";
import IdlePopup from "../components/IdlePopup";
import GiftPopup from "../components/GiftPopup";
import ExploreGuide from "../components/ExploreGuide";
import { useLocale } from "../i18n/useLocale";
import BottomAppBar from "../components/BottomAppBar";

const GUIDE_DISMISSED_KEY = "telescope-explore-guide-dismissed";

export default function ExplorePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [giftOpen, setGiftOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let isCurrent = true;
    // The catalog must announce a new request before its response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError("");
    api
      .getProfiles(undefined, debouncedSearch || undefined)
      .then((data) => {
        if (isCurrent) setProfiles(data);
      })
      .catch((error) => {
        if (!isCurrent) return;
        console.error(error);
        setLoadError(debouncedSearch ? "לא ניתן לבצע את החיפוש כרגע. נסו שוב." : "לא ניתן לטעון את הפרופילים כרגע. נסו שוב.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedSearch, reloadKey]);

  useEffect(() => {
    if (loading || localStorage.getItem(GUIDE_DISMISSED_KEY)) return;
    const timeout = window.setTimeout(() => setGuideOpen(true), 0);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  function closeGuide() {
    localStorage.setItem(GUIDE_DISMISSED_KEY, "true");
    setGuideOpen(false);
  }

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

      <header className="px-4 pb-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white">Telescope exclusive content</h1>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="shrink-0 rounded-full border border-dark-border bg-dark-surface px-3 py-1.5 text-xs font-medium text-dark-text transition hover:border-dark-text-secondary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            איך זה עובד
          </button>
        </div>
        <div className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-dark-text-secondary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            id="catalog-search"
            data-guide="catalog-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-2xl border border-dark-border bg-dark-card py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-dark-text-secondary focus:border-white/70 focus:ring-2 focus:ring-white/15"
            autoComplete="off"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-dark-text-secondary transition hover:bg-dark-surface hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {giftOpen && <GiftPopup onClose={() => setGiftOpen(false)} />}
      {guideOpen && <ExploreGuide onClose={closeGuide} />}

      {/* Gift floating button */}
      <button
        type="button"
        onClick={() => setGiftOpen(true)}
        data-guide="gift-action"
        aria-label="בחירת הטבה"
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

      <main className="flex-1 px-2 pb-20" aria-busy={loading}>
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
            <p className="text-sm">{debouncedSearch ? t("noSearchResults") : t("noProfiles")}</p>
            {debouncedSearch && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 rounded-lg border border-dark-border bg-dark-surface px-4 py-2 text-sm text-white transition hover:border-dark-text-secondary"
              >
                {t("clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-5xl mx-auto">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile._id}
                profile={profile}
                guideTarget={profiles[0]?._id === profile._id}
                onClick={() => {
                  api.trackProfileClick(profile._id);
                  navigate(`/profile/${profile._id}`);
                }}
              />
            ))}
          </div>
        )}
      </main>
      <BottomAppBar active="catalog" />
    </div>
  );
}
