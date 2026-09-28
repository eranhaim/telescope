import { useEffect, useRef, useState, type CSSProperties } from "react";

export type AudioMode = "unknown" | "enabled" | "muted";

interface Props {
  src: string;
  poster?: string;
  isInitiallyActive: boolean;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  onPlay: () => void;
}

const CONTROLS_TIMEOUT_MS = 2500;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function ReelVideo({
  src,
  poster,
  isInitiallyActive,
  audioMode,
  onAudioModeChange,
  onPlay,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimer = useRef<number | undefined>(undefined);
  const hasTrackedPlay = useRef(false);
  const [isVisible, setIsVisible] = useState(isInitiallyActive);
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isTimelineFocused, setIsTimelineFocused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndicator, setPlaybackIndicator] = useState<"play" | "pause" | null>(null);
  const playbackIndicatorTimer = useRef<number | undefined>(undefined);

  const isActive = isVisible && isPageVisible;
  const progress = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
  const buffered = duration > 0 ? Math.min((Math.max(bufferedTime, currentTime) / duration) * 100, 100) : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.7 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function updatePageVisibility() {
      setIsPageVisible(!document.hidden);
    }

    document.addEventListener("visibilitychange", updatePageVisibility);
    return () => document.removeEventListener("visibilitychange", updatePageVisibility);
  }, []);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (!isActive) {
      videoElement.pause();
      return;
    }

    if (isManuallyPaused) return;

    const video: HTMLVideoElement = videoElement;
    let cancelled = false;

    async function startPlayback() {
      if (audioMode === "unknown") {
        video.muted = false;
        try {
          await video.play();
          if (!cancelled) onAudioModeChange("enabled");
          return;
        } catch {
          video.muted = true;
          try {
            await video.play();
          } catch {
            // The browser exposes its own media error state if even muted playback fails.
          }
          if (!cancelled) onAudioModeChange("muted");
          return;
        }
      }

      video.muted = audioMode === "muted";
      try {
        await video.play();
      } catch {
        if (audioMode === "enabled") {
          video.muted = true;
          try {
            await video.play();
          } catch {
            // Keep the video paused when media playback is unavailable.
          }
          if (!cancelled) onAudioModeChange("muted");
        }
      }
    }

    void startPlayback();
    return () => {
      cancelled = true;
    };
  }, [audioMode, isActive, isManuallyPaused, onAudioModeChange, src]);

  useEffect(() => {
    if (!showTimeline || isTimelineFocused) return;

    window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => setShowTimeline(false), CONTROLS_TIMEOUT_MS);
    return () => window.clearTimeout(controlsTimer.current);
  }, [isTimelineFocused, showTimeline]);

  useEffect(() => {
    return () => {
      window.clearTimeout(controlsTimer.current);
      window.clearTimeout(playbackIndicatorTimer.current);
    };
  }, []);

  function revealTimeline() {
    setShowTimeline(true);
  }

  function updateBufferedTime() {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0) return;
    setBufferedTime(video.buffered.end(video.buffered.length - 1));
  }

  function seekTo(time: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = time;
    setCurrentTime(time);
    revealTimeline();
  }

  function showPlaybackState(state: "play" | "pause") {
    window.clearTimeout(playbackIndicatorTimer.current);
    setPlaybackIndicator(state);
    playbackIndicatorTimer.current = window.setTimeout(() => setPlaybackIndicator(null), 800);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video || window.getSelection()?.toString().trim()) return;

    revealTimeline();
    if (video.paused) {
      setIsManuallyPaused(false);
      void video.play().then(
        () => showPlaybackState("play"),
        () => {
          setIsManuallyPaused(true);
          showPlaybackState("pause");
        }
      );
      return;
    }

    video.pause();
    setIsManuallyPaused(true);
    showPlaybackState("pause");
  }

  async function toggleAudio() {
    const video = videoRef.current;
    if (!video) return;

    const shouldMute = audioMode === "enabled";
    video.muted = shouldMute;
    if (shouldMute) {
      onAudioModeChange("muted");
      return;
    }

    try {
      if (!video.paused) await video.play();
      onAudioModeChange("enabled");
    } catch {
      video.muted = true;
      onAudioModeChange("muted");
    }
  }

  return (
    <div
      className="h-full w-full"
      onPointerMove={revealTimeline}
      onPointerDown={revealTimeline}
      onFocusCapture={revealTimeline}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        loop
        preload={isInitiallyActive ? "auto" : "metadata"}
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        tabIndex={0}
        aria-label={isPlaying ? "Pause reel" : "Play reel"}
        className="h-full w-full cursor-pointer object-cover focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-pink-300"
        onClick={togglePlayback}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            togglePlayback();
          }
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          updateBufferedTime();
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onProgress={updateBufferedTime}
        onPlay={() => {
          setIsPlaying(true);
          if (!hasTrackedPlay.current) {
            hasTrackedPlay.current = true;
            onPlay();
          }
        }}
        onPause={() => setIsPlaying(false)}
      >
        Your browser does not support video playback.
      </video>

      {playbackIndicator && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-live="polite">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/65 text-white shadow-xl backdrop-blur-sm">
            {playbackIndicator === "play" ? (
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
                <path d="M8 5.4v13.2c0 .8.9 1.3 1.6.8l10.1-6.6a1 1 0 0 0 0-1.7L9.6 4.6A1 1 0 0 0 8 5.4Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
                <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
              </svg>
            )}
            <span className="sr-only">{playbackIndicator === "play" ? "Playing" : "Paused"}</span>
          </span>
        </div>
      )}

      {isActive && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            void toggleAudio();
          }}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"
          aria-label={audioMode === "enabled" ? "Mute reel audio" : "Unmute reel audio"}
          aria-pressed={audioMode === "muted"}
        >
          {audioMode === "enabled" ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M3 10v4h4l5 4V6l-5 4H3Zm11.5 2a3.5 3.5 0 0 0-2-3.15v6.3a3.5 3.5 0 0 0 2-3.15Zm-2-8.25v2.1a6.5 6.5 0 0 1 0 12.3v2.1a8.5 8.5 0 0 0 0-16.5Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M3 10v4h4l5 4V6l-5 4H3Zm11.5 2a3.5 3.5 0 0 0-2-3.15v2.46l2 2A3.5 3.5 0 0 0 14.5 12Zm3.79 6.21L20.5 21.42 21.92 20l-18-18L2.5 3.42l4.5 4.5v.08H3v4h4l5 4v-4.67l5.79 5.79ZM12 5.85v-2.1c1.33.45 2.53 1.2 3.5 2.17L14.08 7.34A6.47 6.47 0 0 0 12 5.85Z" />
            </svg>
          )}
        </button>
      )}

      <div
        dir="ltr"
        className={`absolute inset-x-4 bottom-20 z-10 transition-opacity motion-reduce:transition-none ${
          showTimeline ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center rounded-full border border-pink-200/25 bg-black/55 px-4 py-2 shadow-lg backdrop-blur-sm">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seekTo(Number(event.target.value))}
            onFocus={() => setIsTimelineFocused(true)}
            onBlur={() => setIsTimelineFocused(false)}
            aria-label="Reel playback position"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            dir="ltr"
            className="reel-timeline h-9 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent"
            style={
              {
                "--reel-progress": `${progress}%`,
                "--reel-buffered": `${buffered}%`,
              } as CSSProperties
            }
          />
        </div>
      </div>
    </div>
  );
}
