import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Ballot from "@/components/Ballot";
import { CATEGORIES, isCategoryId, otherCategory } from "@/lib/categories";
import { getCategoryStatus, getTalks } from "@/lib/queries";
import { voterIdFromCookie, votedCategories } from "@/lib/voter";

export async function generateMetadata({ params }: PageProps<"/vote/[category]">): Promise<Metadata> {
  const { category } = await params;
  return { title: isCategoryId(category) ? `Vote: ${CATEGORIES[category].name}` : "Not found" };
}

export default async function VotePage({ params }: PageProps<"/vote/[category]">) {
  const { category } = await params;
  if (!isCategoryId(category)) notFound();

  const voterId = await voterIdFromCookie();
  const [talks, status, voted] = await Promise.all([
    getTalks(category),
    getCategoryStatus(),
    votedCategories(voterId ? [voterId] : []),
  ]);
  const other = otherCategory(category);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-48">
      <Link href="/" className="inline-flex min-h-11 items-center text-brand underline-offset-4 hover:underline">
        ‹ Back to both awards
      </Link>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{CATEGORIES[category].name}</h1>
      <Ballot
        // A new key resets the ballot when the server's answer changes (e.g. after the cookie is restored).
        key={`${voted.has(category)}-${status[category]}`}
        category={category}
        talks={talks.map(({ id, start_time, position, room, speakers, title }) => ({
          id, start_time, position, room, speakers, title,
        }))}
        isOpen={status[category]}
        alreadyVoted={voted.has(category)}
        other={{ id: other, name: CATEGORIES[other].name, voted: voted.has(other), open: status[other] }}
      />
    </main>
  );
}
