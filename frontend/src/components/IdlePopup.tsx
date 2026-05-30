import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

interface PopupData {
  imageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  idleSeconds: number;
}

export default function IdlePopup() {
  const [data, setData] = useState<PopupData | null>(null);
  const [visible, setVisible] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const dismissedAt = sessionStorage.getItem("popup_dismissed");
    if (dismissedAt && Date.now() - Number(dismissedAt) < 30 * 60 * 1000) {
      dismissed.current = true;
      return;
    }

    api.getPopup().then((res) => {
      if (res.enabled && res.imageUrl) {
        const img = new Image();
        img.onload = () => {
          setData({
            imageUrl: res.imageUrl!,
            buttonLabel: res.buttonLabel || "",
            buttonUrl: res.buttonUrl || "",
            idleSeconds: res.idleSeconds || 5,
          });
          setImageReady(true);
        };
        img.src = res.imageUrl;
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data || !imageReady || dismissed.current) return;

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
      if (idle >= data.idleSeconds * 1000) {
        setVisible(true);
        clearInterval(interval);
      }
    }, 500);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, imageReady]);

  function handleClose() {
    setVisible(false);
    dismissed.current = true;
    sessionStorage.setItem("popup_dismissed", String(Date.now()));
  }

  function handleClick() {
    api.trackPopupClick();
    if (data?.buttonUrl) {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        const url = data.buttonUrl;
        if (url.includes("t.me") || url.includes("telegram")) {
          tg.openTelegramLink(url);
        } else {
          tg.openLink(url);
        }
      } else {
        window.open(data.buttonUrl, "_blank");
      }
    }
    handleClose();
  }

  if (!visible || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="relative bg-dark-card border border-dark-border rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center border-0 cursor-pointer hover:bg-black/80 transition text-lg"
        >
          &times;
        </button>

        <img
          src={data.imageUrl}
          alt=""
          className="w-full aspect-[3/4] object-cover cursor-pointer"
          onClick={handleClick}
        />

        {data.buttonLabel && data.buttonUrl && (
          <div className="p-4">
            <button
              onClick={handleClick}
              dir="rtl"
              className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-xl text-sm font-semibold transition border-0 cursor-pointer"
            >
              {data.buttonLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
