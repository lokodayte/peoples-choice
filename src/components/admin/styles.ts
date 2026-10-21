// Shared admin styles. Kept out of the "use client" files so server pages can import them too
// (a server page importing a plain value from a client file gets a placeholder, not the value).
export const inputClass = "block min-h-11 w-full rounded-lg border border-neutral-400 bg-white px-3 text-base";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold disabled:opacity-60";
