import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { MediaItem, Profile } from "../api/client";
import BottomAppBar from "../components/BottomAppBar";

interface Reel {
  profile: Profile;
  media: MediaItem;
}

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api
      .getProfiles(undefined, undefined, "reel")
      .then((profiles) => {
        setReels(
          profiles.flatMap((profile) =>
            profile.media
              .filter((media) => media.section === "reel")
              .sort((a, b) => a.order - b.order)
              .map((media) => ({ profile, media }))
          )
        );
      })
      .catch((error) => {
        console.error(error);
        setLoadError("Unable to load reels. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [reloadKey]);

  function reload() {
    setLoading(true);
    setLoadError("");
    setReloadKey((key) => key + 1);
  }

  if (loading || loadError || reels.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-dark-bg px-4 pb-20 text-center">
        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-label="Loading reels" />
        ) : loadError ? (
          <>
            <p className="text-sm text-dark-text-secondary">{loadError}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-4 rounded-lg border border-dark-border bg-dark-surface px-4 py-2 text-sm text-white"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">No reels yet</p>
            <p className="mt-1 text-sm text-dark-text-secondary">Check back soon for new videos.</p>
          </>
        )}
        <BottomAppBar active="reels" />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] snap-y snap-mandatory overflow-y-auto bg-black pb-16">
      {reels.map(({ profile, media }, index) => (
        <article
          key={media._id}
          className="relative h-[calc(100dvh-4rem)] snap-start bg-black"
          aria-label={`Reel ${index + 1} by ${profile.name}`}
        >
          {media.url ? (
            <video
              src={media.url}
              poster={media.thumbnailUrl}
              controls
              muted
              playsInline
              loop
              autoPlay={index === 0}
              preload={index === 0 ? "auto" : "metadata"}
              onPlay={() => api.trackMediaClick(profile._id, media._id)}
              className="h-full w-full object-contain"
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-dark-text-secondary">
              This reel is unavailable.
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              api.trackProfileClick(profile._id);
              navigate(`/profile/${profile._id}`);
            }}
            className="absolute bottom-5 left-4 flex items-center gap-3 rounded-full bg-black/55 py-2 pl-2 pr-4 text-left text-white backdrop-blur transition hover:bg-black/75"
            aria-label={`Open ${profile.name}'s profile`}
          >
            {profile.profileImageUrl ? (
              <img src={profile.profileImageUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dark-surface" aria-hidden="true">
                {profile.name.slice(0, 1)}
              </span>
            )}
            <span>
              <span className="block text-sm font-semibold">{profile.name}</span>
              <span className="block text-xs text-white/70">{profile.handle}</span>
            </span>
          </button>
        </article>
      ))}
      <BottomAppBar active="reels" />
    </main>
  );
}
