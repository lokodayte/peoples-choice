import Link from "next/link";
import { CATEGORIES, CONFERENCE_DATE, CONFERENCE_NAME, type CategoryId } from "@/lib/categories";
import { getCategoryStatus } from "@/lib/queries";
import { voterIdFromCookie, votedCategories } from "@/lib/voter";

export default async function Home() {
  const voterId = await voterIdFromCookie();
  const [voted, status] = await Promise.all([
    votedCategories(voterId ? [voterId] : []),
    getCategoryStatus(),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">
        {CONFERENCE_NAME} · {CONFERENCE_DATE}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">People&apos;s Choice Awards</h1>
      <p className="mt-3 text-lg text-neutral-700">Help pick the best talks of the day!</p>

      <div className="mt-8 grid gap-4">
        {(Object.keys(CATEGORIES) as CategoryId[]).map((id) => (
          <CategoryButton key={id} id={id} voted={voted.has(id)} open={status[id]} />
        ))}
      </div>

      <section aria-labelledby="how" className="mt-10 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 id="how" className="text-lg font-semibold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-neutral-700">
          <li>Choose an award above.</li>
          <li>
            From the talks <strong>you attended</strong>, pick your 1st, 2nd and 3rd favorites. (Only saw one or two?
            That&apos;s fine, just pick those.)
          </li>
          <li>Check your picks and submit. One vote per award, per person.</li>
        </ol>
        <p className="mt-3 text-sm text-neutral-600">
          Scoring: 1st place = 3 points, 2nd = 2 points, 3rd = 1 point. No sign-up needed.
        </p>
      </section>
    </main>
  );
}

function CategoryButton({ id, voted, open }: { id: CategoryId; voted: boolean; open: boolean }) {
  const category = CATEGORIES[id];
  const note = voted ? "You voted. Thanks!" : open ? "Tap to vote" : "Voting is closed";
  return (
    <Link
      href={`/vote/${id}`}
      className={`flex min-h-24 items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left shadow-sm transition ${
        voted
          ? "bg-white text-foreground ring-2 ring-green-700"
          : "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark"
      }`}
    >
      <span>
        <span className="block text-sm font-medium opacity-90">Vote: {category.short}</span>
        <span className="block text-xl font-bold">{category.name}</span>
        <span className={`mt-1 block text-sm ${voted ? "text-green-800" : "opacity-90"}`}>{note}</span>
      </span>
      {voted ? (
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-xl text-white"
        >
          ✓
        </span>
      ) : (
        <span aria-hidden className="text-3xl">›</span>
      )}
    </Link>
  );
}
