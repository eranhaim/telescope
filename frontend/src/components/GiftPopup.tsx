import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import type { Profile } from "../api/client";

interface GiftPopupProps {
  onClose: () => void;
}

export default function GiftPopup({ onClose }: GiftPopupProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    api.getProfiles().then(setProfiles).finally(() => setLoading(false));
    startConfetti();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  function startConfetti() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e"];
    const particles = Array.from({ length: 120 }, () => ({
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

  function handleSelect(profile: Profile) {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.openTelegramLink(profile.telegramLink);
    } else {
      window.open(profile.telegramLink, "_blank");
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" onClick={onClose}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-20" />

      <div
        className="relative z-10 flex flex-col h-full bg-dark-bg/90 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-surface flex items-center justify-center border-0 cursor-pointer text-dark-text-secondary hover:text-white transition"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="text-2xl mb-1">🎁</div>
            <h2 className="text-white font-bold text-lg">יש לך הטבה!</h2>
            <p className="text-dark-text-secondary text-sm">בחר על מי לממש</p>
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
            <div className="grid grid-cols-2 gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile._id}
                  onClick={() => handleSelect(profile)}
                  className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition group text-right border-0"
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
