import { useState, useEffect, useRef, useCallback } from "react";
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem("popup_dismissed")) {
      dismissed.current = true;
      return;
    }

    api.getPopup().then((res) => {
      if (res.enabled && res.imageUrl) {
        setData({
          imageUrl: res.imageUrl!,
          buttonLabel: res.buttonLabel || "",
          buttonUrl: res.buttonUrl || "",
          idleSeconds: res.idleSeconds || 5,
        });
      }
    }).catch(() => {});
  }, []);

  const resetTimer = useCallback(() => {
    if (!data || dismissed.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!dismissed.current) setVisible(true);
    }, data.idleSeconds * 1000);
  }, [data]);

  useEffect(() => {
    if (!data || dismissed.current) return;

    const events = ["touchstart", "scroll", "click", "mousemove", "keydown"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, resetTimer]);

  function handleClose() {
    setVisible(false);
    dismissed.current = true;
    sessionStorage.setItem("popup_dismissed", "1");
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
          className="w-full aspect-[3/4] object-cover"
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
