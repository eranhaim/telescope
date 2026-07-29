import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

interface PosterData {
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
}

export default function IdlePopup() {
  const [posters, setPosters] = useState<PosterData[]>([]);
  const [visible, setVisible] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(5);
  const [current, setCurrent] = useState(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissed = useRef(false);
  const lastActivity = useRef(Date.now());
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const dismissedAt = sessionStorage.getItem("popup_dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 30 * 60 * 1000) {
      dismissed.current = true;
      return;
    }

    api.getPopup().then((res) => {
      if (res.enabled && res.posters && res.posters.length > 0) {
        setIdleSeconds(res.idleSeconds || 5);
        let loaded = 0;
        const total = res.posters.length;
        for (const poster of res.posters) {
          const img = new Image();
          img.onload = img.onerror = () => {
            loaded++;
            if (loaded >= total) {
              setPosters(res.posters!);
              setImagesReady(true);
            }
          };
          img.src = poster.imageUrl;
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (posters.length === 0 || !imagesReady || dismissed.current) return;

    function onActivity() { lastActivity.current = Date.now(); }
    const events = ["touchstart", "pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    lastActivity.current = Date.now();

    const interval = setInterval(() => {
      if (dismissed.current) { clearInterval(interval); return; }
      if (Date.now() - lastActivity.current >= idleSeconds * 1000) {
        setVisible(true);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [posters, imagesReady, idleSeconds]);

  // Auto-advance (mobile only - single card view)
  useEffect(() => {
    if (!visible || posters.length <= 1) return;
    autoRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % posters.length);
    }, 3500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [visible, posters.length]);

  function goTo(i: number) {
    setCurrent(i);
    if (autoRef.current) clearInterval(autoRef.current);
    if (posters.length > 1) {
      autoRef.current = setInterval(() => {
        setCurrent((c) => (c + 1) % posters.length);
      }, 3500);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    const next = dx < 0
      ? (current + 1) % posters.length
      : (current - 1 + posters.length) % posters.length;
    goTo(next);
  }

  function handleClose() {
    setVisible(false);
    dismissed.current = true;
    sessionStorage.setItem("popup_dismissed", String(Date.now()));
    if (autoRef.current) clearInterval(autoRef.current);
  }

  function handlePosterClick(poster: PosterData) {
    api.trackPopupClick();
    if (poster.buttonUrl) {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        const url = poster.buttonUrl;
        if (url.includes("t.me") || url.includes("telegram")) {
          tg.openTelegramLink(url);
        } else {
          tg.openLink(url);
        }
      } else {
        window.open(poster.buttonUrl, "_blank");
      }
    }
    handleClose();
  }

  if (!visible || posters.length === 0) return null;

  const single = posters.length === 1;
  const poster = posters[current];

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center border-0 cursor-pointer hover:bg-black/80 transition text-lg"
      >
        &times;
      </button>

      {/* Desktop - all cards side by side */}
      <div
        className="hidden md:flex gap-3 items-start"
        onClick={(e) => e.stopPropagation()}
      >
        {posters.map((p, i) => (
          <div
            key={i}
            className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: `min(${Math.floor(85 / posters.length)}vw, 320px)` }}
          >
            <img
              src={p.imageUrl}
              alt=""
              className="w-full aspect-3/4 object-cover cursor-pointer"
              onClick={() => handlePosterClick(p)}
              draggable={false}
            />
            {p.buttonLabel && p.buttonUrl && (
              <div className="p-3">
                <button
                  onClick={() => handlePosterClick(p)}
                  dir="rtl"
                  className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-xs font-semibold transition border-0 cursor-pointer"
                >
                  {p.buttonLabel}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile - carousel */}
      <div
        className="flex md:hidden flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: "min(360px, 88vw)" }}
        >
          <img
            src={poster.imageUrl}
            alt=""
            className="w-full aspect-3/4 object-cover cursor-pointer"
            onClick={() => handlePosterClick(poster)}
            draggable={false}
          />
          {poster.buttonLabel && poster.buttonUrl && (
            <div className="p-4">
              <button
                onClick={() => handlePosterClick(poster)}
                dir="rtl"
                className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-xl text-sm font-semibold transition border-0 cursor-pointer"
              >
                {poster.buttonLabel}
              </button>
            </div>
          )}
        </div>

        {!single && (
          <div className="flex items-center gap-5">
            <button
              onClick={() => goTo((current - 1 + posters.length) % posters.length)}
              className="w-7 h-7 rounded-full bg-black/50 text-white/50 border-0 cursor-pointer hover:text-white/80 transition flex items-center justify-center"
              style={{ fontSize: "24px", paddingBottom: "2px" }}
            >
              ‹
            </button>

            <div className="flex gap-2 items-center">
              {posters.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="border-0 cursor-pointer p-0 rounded-full transition-colors"
                  style={{
                    width: "8px",
                    height: "8px",
                    background: i === current ? "var(--color-accent, #a855f7)" : "rgba(255,255,255,0.35)",
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => goTo((current + 1) % posters.length)}
              className="w-7 h-7 rounded-full bg-black/50 text-white/50 border-0 cursor-pointer hover:text-white/80 transition flex items-center justify-center"
              style={{ fontSize: "24px", paddingBottom: "2px" }}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
