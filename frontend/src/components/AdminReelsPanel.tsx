import type { Profile } from "../api/client";

interface Props {
  profiles: Profile[];
  onManage: (profile: Profile) => void;
}

export default function AdminReelsPanel({ profiles, onManage }: Props) {
  const creatorsWithReels = profiles.filter((profile) =>
    profile.media.some((media) => media.section === "reel")
  );

  return (
    <section className="mb-6 rounded-2xl border border-dark-border bg-dark-card p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">ניהול Reels</h2>
        <p className="mt-1 text-xs text-dark-text-secondary">
          העלה סרטונים, שנה סדר, ופרסם רק אחרי שבדקת את התצוגה המקדימה.
        </p>
      </div>

      {creatorsWithReels.length === 0 ? (
        <p className="rounded-xl bg-dark-surface px-3 py-6 text-center text-sm text-dark-text-secondary">
          אין Reels עדיין. בחר יוצרת למטה והוסף Reel.
        </p>
      ) : (
        <div className="space-y-3">
          {creatorsWithReels.map((profile) => {
            const reels = profile.media.filter((media) => media.section === "reel");
            const published = reels.filter((media) => media.isPublished !== false).length;
            return (
              <article key={profile._id} className="rounded-xl border border-dark-border bg-dark-surface p-3">
                <div className="flex items-center gap-3">
                  {profile.profileImageThumbUrl || profile.profileImageUrl ? (
                    <img
                      src={profile.profileImageThumbUrl || profile.profileImageUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-dark-card text-dark-text-secondary">
                      {profile.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{profile.name}</p>
                    <p className="text-xs text-dark-text-secondary">
                      {published} באוויר · {reels.length - published} טיוטות
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onManage(profile)}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition hover:bg-accent-hover"
                  >
                    ניהול
                  </button>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {reels.map((reel) => (
                    <div key={reel._id || reel.s3Key} className="relative h-20 w-12 shrink-0 overflow-hidden rounded-md bg-dark-card">
                      {reel.thumbnailUrl || reel.url ? (
                        <img src={reel.thumbnailUrl || reel.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-xs text-dark-text-secondary">וידאו</span>
                      )}
                      <span className={`absolute bottom-1 left-1 rounded px-1 py-0.5 text-[9px] text-white ${reel.isPublished === false ? "bg-amber-600" : "bg-emerald-600"}`}>
                        {reel.isPublished === false ? "טיוטה" : "באוויר"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
