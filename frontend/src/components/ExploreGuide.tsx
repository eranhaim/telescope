interface Props {
  onClose: () => void;
}

export default function ExploreGuide({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="w-full max-w-sm rounded-2xl border border-dark-border bg-dark-card p-5 text-right shadow-2xl"
        dir="rtl"
      >
        <h2 id="guide-title" className="text-lg font-bold text-white">איך משתמשים ב-Telescope?</h2>
        <ol className="mt-4 space-y-3 text-sm text-dark-text">
          <li><strong className="text-white">קטלוג:</strong> בחרו יוצרת כדי לראות את העמוד והתוכן שלה.</li>
          <li><strong className="text-white">Reels:</strong> עברו בין סרטונים קצרים ופתחו את עמוד היוצרת בלחיצה.</li>
          <li><strong className="text-white">מתנה:</strong> לחצו על כפתור המתנה כדי לבחור הטבה אצל יוצרת.</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          הבנתי
        </button>
      </section>
    </div>
  );
}
