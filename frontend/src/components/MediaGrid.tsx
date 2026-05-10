import type { MediaItem } from "../api/client";

interface Props {
  media: MediaItem[];
  onItemClick: (index: number) => void;
}

export default function MediaGrid({ media, onItemClick }: Props) {
  const sorted = [...media].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-3 gap-0.5 sm:rounded-xl sm:overflow-hidden">
      {sorted.map((item, i) => (
        <button
          key={item._id}
          onClick={() => onItemClick(i)}
          className="relative aspect-square overflow-hidden cursor-pointer border-0 p-0 bg-dark-surface"
        >
          <img
            src={item.thumbnailUrl || item.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          {item.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
