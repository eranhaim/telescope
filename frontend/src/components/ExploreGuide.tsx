import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface Props {
  onClose: () => void;
}

const steps = [
  {
    target: "catalog-search",
    title: "חיפוש",
    description: "חפשו שם או @ של יוצרת כדי למצוא אותה בקטלוג.",
  },
  {
    target: "catalog-mode",
    title: "קטלוג",
    description: "כאן חוזרים לרשימת היוצרות.",
  },
  {
    target: "reels-mode",
    title: "Reels",
    description: "כאן פותחים את הסרטונים הקצרים שפורסמו.",
  },
  {
    target: "creator-card",
    title: "עמוד יוצרת",
    description: "בחרו כרטיס של יוצרת כדי לפתוח את העמוד שלה.",
  },
  {
    target: "gift-action",
    title: "מתנה",
    description: "כאן בוחרים הטבה אצל יוצרת.",
  },
] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ExploreGuide({ onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const step = steps[stepIndex];

  const updateTargetRect = useCallback(() => {
    const target = document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    setTargetRect(target?.getBoundingClientRect() ?? null);
  }, [step.target]);

  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`);
    target?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });

    const positionTimeout = window.setTimeout(updateTargetRect, prefersReducedMotion() ? 0 : 250);
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);
    return () => {
      window.clearTimeout(positionTimeout);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [step.target, updateTargetRect]);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>("[data-guide-primary]")?.focus();
  }, [stepIndex]);

  const bubbleTop = targetRect
    ? targetRect.bottom + 16 < window.innerHeight - 190
      ? targetRect.bottom + 16
      : Math.max(12, targetRect.top - 190)
    : Math.max(12, window.innerHeight / 2 - 110);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[90]" aria-hidden="true" />
      {targetRect && (
        <div
          className="pointer-events-none fixed z-[91] rounded-2xl border-2 border-white/90"
          aria-hidden="true"
          style={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.76), 0 0 28px rgba(255, 255, 255, 0.32)",
          }}
        />
      )}
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        aria-describedby="guide-description"
        dir="rtl"
        onKeyDown={handleKeyDown}
        className="fixed left-1/2 z-[92] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/15 bg-dark-card p-5 text-right shadow-2xl"
        style={{ top: bubbleTop }}
      >
        <p className="text-xs font-medium text-dark-text-secondary" aria-live="polite">
          {stepIndex + 1} מתוך {steps.length}
        </p>
        <h2 id="guide-title" className="mt-1 text-lg font-bold text-white">
          {step.title}
        </h2>
        <p id="guide-description" className="mt-2 text-sm leading-6 text-dark-text">
          {step.description}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-dark-text-secondary transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            דלג
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((index) => index - 1)}
                className="rounded-xl border border-dark-border px-3 py-2 text-sm font-medium text-dark-text transition hover:border-dark-text-secondary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                חזרה
              </button>
            )}
            <button
              type="button"
              data-guide-primary
              onClick={() => {
                if (stepIndex === steps.length - 1) {
                  onClose();
                } else {
                  setStepIndex((index) => index + 1);
                }
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {stepIndex === steps.length - 1 ? "סיום" : "הבא"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
