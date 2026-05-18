import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Profile } from "../api/client";
import { useBackButton } from "../hooks/useTelegram";
import MediaGrid from "../components/MediaGrid";
import MediaViewer from "../components/MediaViewer";
import { useLocale } from "../i18n/useLocale";

function isTelegramLink(url: string): boolean {
  return /(?:https?:\/\/)?t\.me\//i.test(url.trim());
}

function openSmartLink(url: string) {
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink && isTelegramLink(url)) {
    const normalized = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    tg.openTelegramLink(normalized);
  } else if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

function extractTelegramUsername(link: string): string | null {
  if (!link) return null;
  const trimmed = link.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1);
  const match = trimmed.match(/(?:https?:\/\/)?t\.me\/@?([A-Za-z0-9_]+)/);
  return match?.[1] ?? null;
}

function openTelegramChat(link: string) {
  const username = extractTelegramUsername(link);
  if (!username) {
    window.open(link, "_blank");
    return;
  }

  const tmeUrl = `https://t.me/${username}`;
  const tg = window.Telegram?.WebApp;

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(tmeUrl);
    return;
  }

  // Outside Telegram — try tg:// protocol, fall back to https
  window.location.href = `tg://resolve?domain=${username}`;

  const start = Date.now();
  const onBlur = () => { clearTimeout(timer); };
  window.addEventListener("blur", onBlur, { once: true });

  const timer = setTimeout(() => {
    window.removeEventListener("blur", onBlur);
    if (Date.now() - start < 1500) window.open(tmeUrl, "_blank");
  }, 800);
}

export default function ProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLocale();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const goBack = useCallback(() => navigate(-1), [navigate]);
    useBackButton(goBack);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.getProfile(id)
            .then(setProfile)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark-bg">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg text-dark-text-secondary">
                <p>{t("profileNotFound")}</p>
                <button
                    onClick={goBack}
                    className="mt-4 text-accent underline bg-transparent border-0 cursor-pointer"
                >
                    {t("back")}
                </button>
            </div>
        );
    }

    const sortedMedia = [...profile.media].sort((a, b) => a.order - b.order);

    return (
        <div className="min-h-screen bg-dark-bg">
            <div className="max-w-2xl mx-auto">
                <header className="px-4 pt-3 pb-2">
                    <button
                        onClick={goBack}
                        className="flex items-center gap-1 text-dark-text-secondary hover:text-white transition bg-transparent border-0 cursor-pointer p-0 mb-2"
                    >
                        <svg
                            className="w-5 h-5 rtl:rotate-180"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="text-sm">{t("back")}</span>
                    </button>
                </header>

                <div className="flex flex-col items-center px-4 pb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dark-border mb-3">
                        <img
                            src={profile.profileImageUrl || "/placeholder.svg"}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                        <h2 className="text-xl font-bold text-white">
                            {profile.name}
                        </h2>
                        {profile.isVerified && (
                            <svg
                                className="w-5 h-5 text-blue-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </div>

                    <p className="text-dark-text-secondary text-sm mb-4">
                        {profile.handle}
                    </p>

                    <div className="flex flex-wrap gap-3 mb-4 justify-center">
                        <button
                            onClick={() => { api.trackButtonClick(profile._id, "message"); openTelegramChat(profile.telegramLink); }}
                            className="flex items-center gap-2 bg-dark-surface hover:bg-dark-border text-white px-5 py-2.5 rounded-full text-sm font-medium transition no-underline border border-dark-border cursor-pointer"
                        >
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" />
                            </svg>
                            {t("message")}
                        </button>
                        <button
                            onClick={async () => {
                                api.trackButtonClick(profile._id, "share");
                                const shareUrl = `${window.location.origin}/profile/${profile._id}`;
                                const text = `${t("shareText")}\n${shareUrl}`;
                                if (navigator.share) {
                                    try {
                                        await navigator.share({ text });
                                    } catch {
                                        /* user cancelled */
                                    }
                                } else {
                                    await navigator.clipboard?.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }
                            }}
                            className="flex items-center gap-2 bg-dark-surface hover:bg-dark-border text-white px-5 py-2.5 rounded-full text-sm font-medium transition border border-dark-border cursor-pointer"
                        >
                            <svg
                                className="w-4 h-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.474l6.733-3.367A2.52 2.52 0 0113 4.5z" />
                            </svg>
                            {copied ? t("linkCopied") : t("share")}
                        </button>
                    </div>

                    {profile.linkButtons && profile.linkButtons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6 justify-center">
                            {[...profile.linkButtons]
                                .sort((a, b) => a.order - b.order)
                                .map((btn) => (
                                    <button
                                        key={btn._id || btn.url}
                                        onClick={() => { api.trackButtonClick(profile._id, "link_button", btn.label, btn.linkType); openSmartLink(btn.url); }}
                                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white px-5 py-2.5 rounded-full text-sm font-medium transition no-underline border-0 cursor-pointer"
                                    >
                                        <svg
                                            className="w-4 h-4"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                                            <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                                        </svg>
                                        {btn.label}
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <MediaGrid
                    media={sortedMedia}
                    onItemClick={(i) => {
                        const item = sortedMedia[i];
                        if (item && profile)
                            api.trackMediaClick(profile._id, item.s3Key);
                        setViewerIndex(i);
                    }}
                />
            </div>

            {viewerIndex !== null && (
                <MediaViewer
                    media={sortedMedia}
                    currentIndex={viewerIndex}
                    onClose={() => setViewerIndex(null)}
                    onNavigate={setViewerIndex}
                />
            )}
        </div>
    );
}
