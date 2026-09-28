import type { MediaItem } from "../api/client";

interface Props {
  reels: MediaItem[];
  onItemClick: (index: number) => void;
}

export default function ReelGrid({ reels, onItemClick }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 px-2">
      {reels.map((reel, index) => {
        const source = reel.thumbnailUrl || reel.url;
        if (!reel.available || !source) {
          return (
            <div
              key={reel._id}
              className="aspect-[9/16] rounded-xl bg-dark-surface flex items-center justify-center px-3 text-center text-xs text-dark-text-secondary"
            >
              Reel unavailable
            </div>
          );
        }

        return (
          <button
            key={reel._id}
            type="button"
            onClick={() => onItemClick(index)}
            aria-label={`Open reel ${index + 1}`}
            className="relative aspect-[9/16] overflow-hidden rounded-xl bg-dark-surface border-0 p-0 cursor-pointer"
          >
            <img src={source} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white" aria-hidden="true">
                ▶
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
