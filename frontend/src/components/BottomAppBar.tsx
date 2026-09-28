import { useNavigate } from "react-router-dom";

interface Props {
  active: "catalog" | "reels";
}

export default function BottomAppBar({ active }: Props) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Content navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-dark-border bg-dark-card/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"
    >
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2">
        <button
          type="button"
          aria-current={active === "catalog" ? "page" : undefined}
          onClick={() => navigate("/")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active === "catalog" ? "bg-white text-black" : "text-dark-text-secondary hover:bg-dark-surface hover:text-white"}`}
        >
          Catalog
        </button>
        <button
          type="button"
          aria-current={active === "reels" ? "page" : undefined}
          onClick={() => navigate("/reels")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active === "reels" ? "bg-white text-black" : "text-dark-text-secondary hover:bg-dark-surface hover:text-white"}`}
        >
          Reels
        </button>
      </div>
    </nav>
  );
}
