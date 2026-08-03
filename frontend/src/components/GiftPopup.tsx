import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

interface GiftProfile {
  _id: string;
  name: string;
  profileImageUrl?: string;
  profileImageThumbUrl?: string;
  telegramLink: string;
}

interface GiftPopupProps {
  onClose: () => void;
}

export default function GiftPopup({ onClose }: GiftPopupProps) {
  const [profiles, setProfiles] = useState<GiftProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgVisible, setBgVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    sessionStorage.setItem("popup_dismissed", String(Date.now()));
    return () => { document.body.style.overflow = ""; };
  }, []);

  function startConfetti() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e"];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360,
      spin: (Math.random() - 0.5) * 4,
    }));

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDone = true;
      for (const p of particles) {
        p.y += p.speed;
        p.angle += p.spin;
        if (p.y < canvas.height) allDone = false;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (!allDone) animFrameRef.current = requestAnimationFrame(draw);
    }
    draw();
  }

  // Sequence: bg fade → header → cards one by one → confetti
  useEffect(() => {
    const t1 = setTimeout(() => setBgVisible(true), 50);
    const t2 = setTimeout(() => setHeaderVisible(true), 300);

    api.getGiftProfiles().then((data) => {
      setProfiles(data);
      setLoading(false);
      data.forEach((_, i) => {
        setTimeout(() => {
          setVisibleCards((prev) => [...prev, i]);
        }, 600 + i * 120);
      });
      setTimeout(() => {
        startConfetti();
      }, 600 + data.length * 120);
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  function handleSelect(profile: GiftProfile) {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const url = profile.telegramLink;
      if (url.includes("t.me") || url.includes("telegram")) {
        tg.openTelegramLink(url);
      } else {
        tg.openLink(url);
      }
    } else {
      window.open(profile.telegramLink, "_blank");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col transition-all duration-500"
      style={{ background: bgVisible ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0)" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes shineText {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cardPop {
          0% { opacity: 0; transform: translateY(24px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />

      <div
        className="relative z-10 flex flex-col h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-4 pt-4 pb-4 transition-all duration-500"
          style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateY(0)" : "translateY(-16px)" }}
        >
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center border-0 cursor-pointer text-dark-text-secondary hover:text-white transition"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="text-4xl mb-2 mt-10">🎁</div>
            <h2 className="text-white font-bold text-3xl mb-1">
              תוכן אקסקלוסיבי<br /><span style={{
                background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b, #a855f7)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shineText 1.5s linear infinite",
                filter: "drop-shadow(0 0 12px rgba(168,85,247,0.9))",
              }}>בחצי מחיר</span>
            </h2>
            <p className="text-dark-text-secondary text-base mt-3" dir="rtl">על מי תרצה לממש את ההטבה?</p>
          </div>
          <div className="w-8" />
        </div>

        {/* Profiles grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {profiles.map((profile, i) => (
                <button
                  key={profile._id}
                  onClick={() => handleSelect(profile)}
                  className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition group text-right"
                  style={{
                    opacity: visibleCards.includes(i) ? 1 : 0,
                    animation: visibleCards.includes(i) ? "cardPop 0.4s ease forwards" : "none",
                  }}
                >
                  {profile.profileImageThumbUrl || profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageThumbUrl || profile.profileImageUrl}
                      alt={profile.name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-dark-surface flex items-center justify-center text-4xl">
                      👤
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-white text-sm font-semibold truncate">{profile.name}</p>
                    <p className="text-accent text-xs mt-0.5">מימוש הטבה →</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
