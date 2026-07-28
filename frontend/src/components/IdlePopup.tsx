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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const lastActivity = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

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

    function onActivity() {
      lastActivity.current = Date.now();
    }

    const events = ["touchstart", "pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    lastActivity.current = Date.now();

    const interval = setInterval(() => {
      if (dismissed.current) {
        clearInterval(interval);
        return;
      }
      const idle = Date.now() - lastActivity.current;
      if (idle >= idleSeconds * 1000) {
        setVisible(true);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [posters, imagesReady, idleSeconds]);

  function handleClose() {
    setVisible(false);
    dismissed.current = true;
    sessionStorage.setItem("popup_dismissed", String(Date.now()));
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center border-0 cursor-pointer hover:bg-black/80 transition text-lg"
      >
        &times;
      </button>

      {single ? (
        <div
          className="relative bg-dark-card border border-dark-border rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl animate-in"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={posters[0].imageUrl}
            alt=""
            className="w-full aspect-[3/4] object-cover cursor-pointer"
            onClick={() => handlePosterClick(posters[0])}
          />
          {posters[0].buttonLabel && posters[0].buttonUrl && (
            <div className="p-4">
              <button
                onClick={() => handlePosterClick(posters[0])}
                dir="rtl"
                className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-xl text-sm font-semibold transition border-0 cursor-pointer"
              >
                {posters[0].buttonLabel}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto max-w-[90vw] pb-2 snap-x snap-mandatory scrollbar-none"
          onClick={(e) => e.stopPropagation()}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {posters.map((poster, i) => (
            <div
              key={i}
              className="flex-shrink-0 bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl animate-in snap-center"
              style={{ width: posters.length === 2 ? "calc(45vw - 8px)" : "calc(38vw - 8px)", maxWidth: "280px", minWidth: "180px" }}
            >
              <img
                src={poster.imageUrl}
                alt=""
                className="w-full aspect-[3/4] object-cover cursor-pointer"
                onClick={() => handlePosterClick(poster)}
              />
              {poster.buttonLabel && poster.buttonUrl && (
                <div className="p-2.5">
                  <button
                    onClick={() => handlePosterClick(poster)}
                    dir="rtl"
                    className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded-xl text-xs font-semibold transition border-0 cursor-pointer"
                  >
                    {poster.buttonLabel}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
