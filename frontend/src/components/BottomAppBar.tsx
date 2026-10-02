import { useNavigate } from "react-router-dom";

interface Props {
  active: "catalog" | "reels";
}

export default function BottomAppBar({ active }: Props) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="ניווט תוכן"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-dark-border bg-dark-card/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      <div className="mode-switcher mx-auto grid max-w-lg grid-cols-2 gap-1 rounded-2xl p-1">
        <button
          type="button"
          aria-current={active === "catalog" ? "page" : undefined}
          onClick={() => navigate("/")}
          data-guide="catalog-mode"
          className={`mode-switcher__item flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active === "catalog" ? "mode-switcher__item--active" : "text-dark-text-secondary hover:bg-white/8 hover:text-white"}`}
        >
          <svg className="mode-switcher__icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
          Catalog
        </button>
        <button
          type="button"
          aria-current={active === "reels" ? "page" : undefined}
          onClick={() => navigate("/reels")}
          data-guide="reels-mode"
          className={`mode-switcher__item flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active === "reels" ? "mode-switcher__item--active" : "text-dark-text-secondary hover:bg-white/8 hover:text-white"}`}
        >
          <svg className="mode-switcher__icon h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
            <path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" />
          </svg>
          Reels
        </button>
      </div>
    </nav>
  );
}
