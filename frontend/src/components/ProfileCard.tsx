import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem, Profile } from "../api/client";
import { orderForVisit } from "../lib/visitOrder";

// Long enough that sweeping the cursor across the grid, or flicking the page
// past a row, does not start a download on every tile it crosses.
const PREVIEW_INTENT_MS = 300;
const PHOTO_INTERVAL_MS = 800;

interface Preview {
  kind: "video" | "photos";
  urls: string[];
}

// A random video of hers when she has one, otherwise her photos. Seeded from
// the visit rather than Math.random, so the pick holds while the visitor
// browses and changes the next time they open the app.
function pickPreview(media: MediaItem[]): Preview | null {
  const ordered = orderForVisit(media, (item) => item._id);

  const video = ordered.find((item) => item.type === "video" && item.url);
  if (video?.url) return { kind: "video", urls: [video.url] };

  const photos = ordered.flatMap((item) => (item.type === "image" && item.url ? [item.url] : []));
  return photos.length > 1 ? { kind: "photos", urls: photos } : null;
}

interface Props {
  profile: Profile;
  onClick: () => void;
  guideTarget?: boolean;
}

export default function ProfileCard({ profile, onClick, guideTarget = false }: Props) {
  const imageUrl = profile.profileImageThumbUrl || profile.profileImageUrl || "";
  const cardRef = useRef<HTMLButtonElement>(null);
  const intentTimer = useRef<number | undefined>(undefined);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPreviewLoaded, setIsPreviewLoaded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const preview = useMemo(() => pickPreview(profile.media), [profile.media]);

  const startPreview = useCallback(() => {
    if (!preview || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    intentTimer.current = window.setTimeout(() => setIsPreviewing(true), PREVIEW_INTENT_MS);
  }, [preview]);

  const stopPreview = useCallback(() => {
    window.clearTimeout(intentTimer.current);
    setIsPreviewing(false);
    setIsPreviewLoaded(false);
    setPhotoIndex(0);
  }, []);

  // Touch devices have no hover, so there the trigger is the tile reaching the
  // middle of the viewport. The rootMargin collapses the root to its centre
  // line, which limits playback to the single row crossing it.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !preview || window.matchMedia("(hover: hover)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startPreview() : stopPreview()),
      { rootMargin: "-50% 0px -50% 0px" }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [preview, startPreview, stopPreview]);

  useEffect(() => {
    return () => window.clearTimeout(intentTimer.current);
  }, []);

  useEffect(() => {
    if (!isPreviewing || preview?.kind !== "photos") return;

    const timer = window.setInterval(
      () => setPhotoIndex((index) => (index + 1) % preview.urls.length),
      PHOTO_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [isPreviewing, preview]);

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onPointerEnter={(event) => {
        // Touch devices fire a synthetic pointerenter on tap. Previewing there
        // would compete with the tap that opens the profile, so the pointer
        // only drives the preview for a real mouse.
        if (event.pointerType === "mouse") startPreview();
      }}
      onPointerLeave={stopPreview}
      data-guide={guideTarget ? "creator-card" : undefined}
      aria-label={`Open ${profile.name}'s profile`}
      className="relative aspect-[3/4] overflow-hidden rounded-xl group cursor-pointer border-0 p-0 bg-transparent w-full"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={profile.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-dark-surface flex items-center justify-center text-6xl">
          👤
        </div>
      )}
      {/* Both previews stay behind the still image until the first frame is
          ready, so a slow or failed load never shows a blank tile. */}
      {isPreviewing && preview?.kind === "video" && (
        <video
          src={preview.urls[0]}
          muted
          playsInline
          loop
          autoPlay
          disablePictureInPicture
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPreviewLoaded ? "opacity-100" : "opacity-0"
          }`}
          onPlaying={() => setIsPreviewLoaded(true)}
          onError={stopPreview}
        />
      )}
      {isPreviewing && preview?.kind === "photos" && (
        <img
          src={preview.urls[photoIndex % preview.urls.length]}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isPreviewLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsPreviewLoaded(true)}
          onError={stopPreview}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-semibold text-sm leading-tight drop-shadow-md">
            {profile.name}
          </span>
          {profile.isVerified && (
            <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
