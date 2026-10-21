// The two awards. The id is also used in the page address: /vote/papers and /vote/lightning.
export const CATEGORIES = {
  papers: { id: "papers", name: "Best Paper Presentation", short: "Papers" },
  lightning: { id: "lightning", name: "Best Lightning Talk", short: "Lightning Talks" },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && Object.hasOwn(CATEGORIES, value);
}

export function otherCategory(id: CategoryId): CategoryId {
  return id === "papers" ? "lightning" : "papers";
}

export const POINTS = { 1: 3, 2: 2, 3: 1 } as const;
export const RANK_LABEL = { 1: "1st", 2: "2nd", 3: "3rd" } as const;

export const CONFERENCE_NAME = "Marist Computing Conference";
export const CONFERENCE_DATE = "October 30, 2026";
