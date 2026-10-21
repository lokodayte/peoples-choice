"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { POINTS, RANK_LABEL, type CategoryId } from "@/lib/categories";
import { readStoredToken } from "./VoterSync";

type BallotTalk = { id: number; start_time: string; position: number; room: string; speakers: string; title: string };
type Rank = 1 | 2 | 3;
type Step = "pick" | "review" | "done" | "already" | "closed";

const RANKS: Rank[] = [1, 2, 3];

export default function Ballot(props: {
  category: CategoryId;
  talks: BallotTalk[];
  isOpen: boolean;
  alreadyVoted: boolean;
  other: { id: CategoryId; name: string; voted: boolean; open: boolean };
}) {
  const { category, talks, other } = props;
  const [step, setStep] = useState<Step>(props.alreadyVoted ? "already" : props.isOpen ? "pick" : "closed");
  // picks[0] = 1st place talk id, picks[1] = 2nd, picks[2] = 3rd
  const [picks, setPicks] = useState<(number | null)[]>([null, null, null]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // When the screen changes, move focus to its heading so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  const byId = useMemo(() => new Map(talks.map((t) => [t.id, t])), [talks]);
  const isLightning = category === "lightning";

  const groups = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matching = talks.filter((t) => {
      const haystack = `${t.title} ${t.speakers} ${t.room} ${t.start_time} ${t.position || ""}`.toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
    const map = new Map<string, BallotTalk[]>();
    for (const t of matching) {
      const key = isLightning ? `${t.start_time} · Room ${t.room}` : t.start_time;
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [talks, query, isLightning]);

  function rankOf(talkId: number): Rank | null {
    const i = picks.indexOf(talkId);
    return i === -1 ? null : ((i + 1) as Rank);
  }

  function choose(talkId: number, rank: Rank) {
    setError(null);
    setPicks((current) => {
      const next = [...current];
      if (next[rank - 1] === talkId) {
        next[rank - 1] = null; // tapping the same place again clears it
        return next;
      }
      // A talk can only hold one place: remove it from any other place first.
      for (let i = 0; i < 3; i++) if (next[i] === talkId) next[i] = null;
      next[rank - 1] = talkId;
      return next;
    });
  }

  function clear(rank: Rank) {
    setPicks((current) => current.map((p, i) => (i === rank - 1 ? null : p)));
  }

  function chosenIds(): number[] | null {
    if (picks[0] === null) {
      setError("Please choose your 1st place talk.");
      return null;
    }
    if (picks[1] === null && picks[2] !== null) {
      setError("You picked a 3rd place but no 2nd place. Please choose a 2nd place, or move your 3rd pick up.");
      return null;
    }
    return picks.filter((p): p is number => p !== null);
  }

  function review() {
    if (chosenIds()) setStep("review");
  }

  async function submit() {
    const ids = chosenIds();
    if (!ids || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, picks: ids, name: name.trim() || null, token: readStoredToken() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setStep("done");
      else if (data.code === "already_voted") setStep("already");
      else if (data.code === "closed") setStep("closed");
      else setError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = (text: string) => (
    <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-xl font-bold outline-none sm:text-2xl">
      {text}
    </h2>
  );

  const otherInvite =
    !other.voted && other.open ? (
      <Link
        href={`/vote/${other.id}`}
        className="mt-6 flex min-h-14 items-center justify-center rounded-xl bg-brand px-5 py-3 text-center text-lg font-semibold text-white hover:bg-brand-dark"
      >
        Now vote for {other.name} ›
      </Link>
    ) : null;

  if (step === "already" || step === "done" || step === "closed") {
    const content = {
      done: { title: "Thank you for voting!", body: "Your vote has been recorded." },
      already: { title: "You've already voted for this award. Thanks!", body: "Each device can vote once per award." },
      closed: { title: "Voting has closed", body: "Voting for this award is not open right now." },
    }[step];
    return (
      <section className="mt-2 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-black/5" aria-live="polite">
        {step !== "closed" && (
          <div aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-700 text-3xl text-white">
            ✓
          </div>
        )}
        {heading(content.title)}
        <p className="mt-2 text-neutral-700">{content.body}</p>
        {step !== "closed" && otherInvite}
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-brand underline underline-offset-4">
          Back to home
        </Link>
      </section>
    );
  }

  if (step === "review") {
    const chosen = picks.filter((p): p is number => p !== null);
    return (
      <section>
        {heading("Check your vote")}
        <p className="mt-1 text-neutral-700">Make sure these are right. You can only vote once for this award.</p>
        <ol className="mt-4 space-y-3">
          {chosen.map((id, i) => {
            const t = byId.get(id)!;
            const rank = (i + 1) as Rank;
            return (
              <li key={id} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full bg-brand text-white">
                  <span className="text-sm font-bold leading-none">{RANK_LABEL[rank]}</span>
                </span>
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="block text-sm text-neutral-600">{t.speakers}</span>
                  <span className="block text-sm text-neutral-600">
                    {POINTS[rank]} {POINTS[rank] === 1 ? "point" : "points"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6">
          <label htmlFor="voter-name" className="block font-medium">
            Your name <span className="font-normal text-neutral-600">(optional)</span>
          </label>
          <input
            id="voter-name"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block min-h-12 w-full rounded-lg border border-neutral-400 bg-white px-3 text-base"
          />
          <p className="mt-1 text-sm text-neutral-600">Only the organizers see this. Leaving it blank is fine.</p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="min-h-14 rounded-xl bg-brand px-5 text-lg font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit my vote"}
          </button>
          <button
            type="button"
            onClick={() => setStep("pick")}
            disabled={submitting}
            className="min-h-14 rounded-xl bg-white px-5 text-lg font-semibold ring-1 ring-neutral-400 hover:bg-neutral-50"
          >
            Change my picks
          </button>
        </div>
      </section>
    );
  }

  // step === "pick"
  return (
    <>
      <p className="mt-2 text-neutral-700">
        From the talks <strong>you attended</strong>, tap <strong>1st</strong>, <strong>2nd</strong> or{" "}
        <strong>3rd</strong>. Only 1st place is required.
      </p>

      <div className="sticky top-0 z-10 -mx-4 mt-4 bg-background/95 px-4 py-2 backdrop-blur">
        <label htmlFor="search" className="sr-only">
          Search talks
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search by title, speaker, room or time"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block min-h-12 w-full rounded-lg border border-neutral-400 bg-white px-3 text-base"
        />
      </div>

      {groups.length === 0 && <p className="mt-6 text-neutral-700">No talks match “{query}”.</p>}

      {groups.map(([slot, slotTalks]) => (
        <section key={slot} aria-label={slot} className="mt-6">
          <h2 className="text-lg font-bold text-brand">{slot}</h2>
          <ul className="mt-2 space-y-3">
            {slotTalks.map((t) => {
              const current = rankOf(t.id);
              return (
                <li
                  key={t.id}
                  className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${current ? "ring-2 ring-brand" : "ring-black/5"}`}
                >
                  <p className="text-sm font-medium text-neutral-600">
                    {isLightning ? `Talk #${t.position}` : `Room ${t.room}`}
                  </p>
                  <h3 id={`talk-${t.id}`} className="mt-0.5 font-semibold leading-snug">{t.title}</h3>
                  <p className="mt-1 text-sm text-neutral-700">{t.speakers}</p>
                  <div role="group" aria-labelledby={`talk-${t.id}`} className="mt-3 grid grid-cols-3 gap-2">
                    {RANKS.map((rank) => {
                      const selected = current === rank;
                      return (
                        <button
                          key={rank}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${RANK_LABEL[rank]} place: ${t.title}`}
                          onClick={() => choose(t.id, rank)}
                          className={`min-h-12 rounded-lg text-base font-semibold transition ${
                            selected
                              ? "bg-brand text-white"
                              : "bg-white text-neutral-800 ring-1 ring-neutral-400 hover:bg-brand-soft"
                          }`}
                        >
                          {selected && <span aria-hidden>✓ </span>}
                          {RANK_LABEL[rank]}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {/* Summary bar fixed to the bottom of the screen */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <ul className="grid grid-cols-3 gap-2 text-sm" aria-label="Your picks">
            {RANKS.map((rank) => {
              const id = picks[rank - 1];
              const t = id ? byId.get(id) : null;
              return (
                <li key={rank} className="min-w-0 rounded-lg bg-neutral-100 px-2 py-1.5">
                  <span className="flex items-center justify-between font-semibold">
                    {RANK_LABEL[rank]}
                    {t && (
                      <button
                        type="button"
                        onClick={() => clear(rank)}
                        aria-label={`Clear ${RANK_LABEL[rank]} place`}
                        className="-my-1 -mr-1 flex h-8 w-8 items-center justify-center rounded text-neutral-600 hover:bg-neutral-200"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                  <span className={`block truncate ${t ? "" : "text-neutral-500"}`}>{t ? t.title : "Not picked"}</span>
                </li>
              );
            })}
          </ul>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={review}
            className="mt-2 min-h-12 w-full rounded-xl bg-brand text-lg font-semibold text-white hover:bg-brand-dark"
          >
            Review my vote
          </button>
        </div>
      </div>
    </>
  );
}
