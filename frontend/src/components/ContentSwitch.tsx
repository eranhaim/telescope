import { useNavigate } from "react-router-dom";

interface ContentSwitchProps {
  active: "creators" | "reels";
}

export default function ContentSwitch({ active }: ContentSwitchProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Content navigation" className="flex rounded-xl border border-dark-border bg-dark-surface p-1">
      <button
        type="button"
        aria-current={active === "creators" ? "page" : undefined}
        onClick={() => navigate("/")}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          active === "creators" ? "bg-white text-black" : "text-dark-text-secondary hover:text-white"
        }`}
      >
        Creators
      </button>
      <button
        type="button"
        aria-current={active === "reels" ? "page" : undefined}
        onClick={() => navigate("/reels")}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          active === "reels" ? "bg-white text-black" : "text-dark-text-secondary hover:text-white"
        }`}
      >
        Reels
      </button>
    </nav>
  );
}
