"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print mb-8 min-h-11 rounded-lg bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
    >
      Print this poster
    </button>
  );
}
