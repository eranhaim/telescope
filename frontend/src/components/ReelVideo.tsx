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
  }, [audioMode, isActive, onAudioModeChange, src]);

  useEffect(() => {
    if (!showTimeline || isTimelineFocused) return;

    window.clearTimeout(controlsTimer.current);
    controlsTimer.current = window.setTimeout(() => setShowTimeline(false), CONTROLS_TIMEOUT_MS);
    return () => window.clearTimeout(controlsTimer.current);
  }, [isTimelineFocused, showTimeline]);

  useEffect(() => {
    return () => window.clearTimeout(controlsTimer.current);
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

  async function enableAudio() {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    try {
      await video.play();
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
        className="h-full w-full object-contain"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          updateBufferedTime();
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onProgress={updateBufferedTime}
        onPlay={() => {
          if (!hasTrackedPlay.current) {
            hasTrackedPlay.current = true;
            onPlay();
          }
        }}
      >
        Your browser does not support video playback.
      </video>

      {audioMode === "muted" && isActive && (
        <button
          type="button"
          onClick={() => void enableAudio()}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/65 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Enable reel audio"
        >
          Tap for sound
        </button>
      )}

      <div
        className={`absolute inset-x-4 bottom-20 z-10 transition-opacity motion-reduce:transition-none ${
          showTimeline ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-full bg-black/45 px-3 py-2 backdrop-blur-sm">
          <span className="min-w-10 text-right text-[11px] tabular-nums text-white/80" aria-hidden="true">
            {formatTime(currentTime)}
          </span>
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
            className="reel-timeline h-7 min-w-0 flex-1 cursor-pointer appearance-none bg-transparent"
            style={
              {
                "--reel-progress": `${progress}%`,
                "--reel-buffered": `${buffered}%`,
              } as CSSProperties
            }
          />
          <span className="min-w-10 text-[11px] tabular-nums text-white/80" aria-hidden="true">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
