import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { CATEGORIES, RANK_LABEL, type CategoryId } from "@/lib/categories";
import { getBallotList, getCategoryStatus, getFlaggedBallots, getResults, getTalks } from "@/lib/queries";
import { siteUrl } from "@/lib/site-url";
import { formatClosing, toNewYorkInputValue } from "@/lib/format";
import { deleteBallot, logout, removeBallot, setClosingTime, setTalkHidden, setVotingOpen } from "./actions";
import { buttonClass } from "@/components/admin/styles";
import {
  AutoRefresh,
  ConfirmButton,
  DeleteAllBallots,
  EditTalk,
  LoginForm,
  TalkForm,
} from "@/components/admin/AdminClient";
import QrPanel from "@/components/admin/QrPanel";

export const metadata: Metadata = { title: "Admin · People's Choice", robots: { index: false } };

const IDS = Object.keys(CATEGORIES) as CategoryId[];
const card = "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6";
const secondary = `${buttonClass} bg-white ring-1 ring-neutral-400 hover:bg-neutral-50`;
const BALLOT_LIST_SIZE = 25;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold">Admin sign-in</h1>
        <LoginForm />
      </main>
    );
  }

  const showAllBallots = (await searchParams).ballots === "all";
  const [status, flagged, url, ballotList, ...perCategory] = await Promise.all([
    getCategoryStatus(),
    getFlaggedBallots(),
    siteUrl(),
    getBallotList(showAllBallots ? null : BALLOT_LIST_SIZE),
    ...IDS.map(async (id) => ({ id, results: await getResults(id), talks: await getTalks(id, true) })),
  ]);
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeStyle: "short", dateStyle: "short", timeZone: "America/New_York" });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">People&apos;s Choice · Admin</h1>
        <div className="flex flex-wrap items-center gap-3">
          <AutoRefresh />
          <form action={logout}>
            <button className={secondary}>Sign out</button>
          </form>
        </div>
      </header>

      {/* Results + open/close */}
      <section aria-labelledby="results-h" className="space-y-6">
        <h2 id="results-h" className="text-xl font-bold">Live results <span className="text-base font-normal text-neutral-600">(only visible here)</span></h2>
        {perCategory.map(({ id, results }) => {
          const { open, switchedOn, closesAt } = status[id];
          const closedByTimer = switchedOn && !open && closesAt !== null;
          return (
          <div key={id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{CATEGORIES[id].name}</h3>
                <p className="text-neutral-700">
                  {results.ballots} {results.ballots === 1 ? "ballot" : "ballots"} ·{" "}
                  <span className={open ? "font-semibold text-green-800" : "font-semibold text-red-800"}>
                    Voting {open ? "OPEN" : "CLOSED"}
                  </span>
                </p>
                <p className="text-sm text-neutral-600">
                  {closedByTimer
                    ? `Closed automatically ${formatClosing(closesAt)}.`
                    : closesAt
                      ? `Closes automatically ${formatClosing(closesAt)}${open ? "" : " (once opened)"}.`
                      : "No automatic closing time."}
                </p>
              </div>
              <form action={setVotingOpen}>
                <input type="hidden" name="category" value={id} />
                <input type="hidden" name="open" value={String(!open)} />
                <ConfirmButton
                  message={
                    open
                      ? `Close voting for ${CATEGORIES[id].name}?`
                      : closedByTimer
                        ? `Re-open voting for ${CATEGORIES[id].name}? The automatic closing time has passed, so it will be removed.`
                        : `Open voting for ${CATEGORIES[id].name}?`
                  }
                  className={open ? secondary : `${buttonClass} bg-green-700 text-white hover:bg-green-800`}
                >
                  {open ? "Close voting" : "Open voting"}
                </ConfirmButton>
              </form>
            </div>
            <form action={setClosingTime} className="mt-3 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
              <input type="hidden" name="category" value={id} />
              <div>
                <label htmlFor={`closes-${id}`} className="block font-medium">Close automatically at (New York time)</label>
                <input
                  id={`closes-${id}`}
                  type="datetime-local"
                  name="closes_at"
                  defaultValue={closesAt ? toNewYorkInputValue(closesAt) : ""}
                  className="mt-1 min-h-11 rounded-lg border border-neutral-400 bg-white px-2 text-base"
                />
              </div>
              <button className={secondary}>Save time</button>
              {closesAt && (
                <button name="clear" value="true" className={`${buttonClass} text-brand underline underline-offset-4`}>
                  Turn off automatic closing
                </button>
              )}
            </form>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-neutral-300 text-neutral-600">
                  <tr>
                    <th scope="col" className="py-2 pr-2">#</th>
                    <th scope="col" className="py-2 pr-2">Talk</th>
                    <th scope="col" className="py-2 pr-2 text-right">Points</th>
                    <th scope="col" className="py-2 pr-2 text-right">1st</th>
                    <th scope="col" className="py-2 pr-2 text-right">2nd</th>
                    <th scope="col" className="py-2 text-right">3rd</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-neutral-100 align-top">
                      <td className="py-2 pr-2 text-neutral-600">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <span className="font-medium">{r.title}</span>
                        {r.hidden && <span className="ml-2 rounded bg-neutral-200 px-1.5 text-xs">removed</span>}
                        <span className="block text-neutral-600">{r.speakers}</span>
                      </td>
                      <td className="py-2 pr-2 text-right text-base font-bold">{r.points}</td>
                      <td className="py-2 pr-2 text-right">{r.firsts}</td>
                      <td className="py-2 pr-2 text-right">{r.seconds}</td>
                      <td className="py-2 text-right">{r.thirds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/export?type=results" className={secondary}>Download results (CSV)</a>
          <a href="/api/admin/export?type=ballots" className={secondary}>Download all ballots (CSV)</a>
        </div>
      </section>

      {/* QR code */}
      <section aria-labelledby="qr-h" className={card}>
        <h2 id="qr-h" className="mb-4 text-xl font-bold">Shared QR code</h2>
        <QrPanel url={url} />
      </section>

      {/* Flagged ballots */}
      <section aria-labelledby="flag-h" className={card}>
        <h2 id="flag-h" className="text-xl font-bold">Flagged ballots ({flagged.length})</h2>
        <p className="mt-1 text-sm text-neutral-600">
          These are hints, not proof. Many phones of the same model on campus Wi-Fi look identical to the server.
          Removing a ballot stops it counting; that device still can&apos;t vote again.
        </p>
        {flagged.length === 0 ? (
          <p className="mt-4">Nothing suspicious so far.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {flagged.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-sm">
                  <p className="font-semibold">
                    #{b.id} · {CATEGORIES[b.category_id].short} · {timeFmt.format(b.created_at)} ·{" "}
                    {b.voter_name ?? <span className="font-normal italic text-neutral-600">no name</span>}
                  </p>
                  <p className="text-neutral-700">{b.picks}</p>
                  <ul className="mt-1 text-amber-900">
                    {b.reasons.map((r) => <li key={r}>⚠ {r}</li>)}
                  </ul>
                </div>
                <form action={removeBallot}>
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmButton message={`Remove ballot #${b.id}? It will stop counting.`} className={`${buttonClass} bg-red-700 text-white hover:bg-red-800`}>
                    Remove
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Every ballot, with a hard Delete (for demo / test votes) */}
      <section aria-labelledby="ballots-h" className={card}>
        <h2 id="ballots-h" className="text-xl font-bold">All ballots ({ballotList.total})</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Newest first. <strong>Delete</strong> erases a ballot completely: it stops counting and the phone that cast it
          can vote again, so it&apos;s good for clearing demo votes. Tip: when you demo, type a name like
          &ldquo;Demo&rdquo; on the ballot so those votes are easy to spot here.
        </p>
        {ballotList.total === 0 ? (
          <p className="mt-4">No ballots yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-200">
            {ballotList.rows.map((b) => (
              <li key={b.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between ${b.removed_at ? "opacity-60" : ""}`}>
                <div className="text-sm">
                  <p className="font-semibold">
                    #{b.id} · {CATEGORIES[b.category_id].short} · {timeFmt.format(b.created_at)} ·{" "}
                    {b.voter_name ?? <span className="font-normal italic text-neutral-600">no name</span>}
                    {b.removed_at && <span className="ml-2 rounded bg-neutral-200 px-1.5 text-xs font-normal">removed as suspicious</span>}
                  </p>
                  <ol className="mt-1 text-neutral-700">
                    {b.picks.map((title, i) => (
                      <li key={i}>
                        <span className="font-medium">{RANK_LABEL[(i + 1) as 1 | 2 | 3]}:</span> {title}
                      </li>
                    ))}
                  </ol>
                </div>
                <form action={deleteBallot}>
                  <input type="hidden" name="id" value={b.id} />
                  <ConfirmButton
                    message={`Delete ballot #${b.id}${b.voter_name ? ` (${b.voter_name})` : ""} permanently? It stops counting, and that phone will be able to vote again.`}
                    className={`${buttonClass} bg-white text-red-800 ring-1 ring-red-300 hover:bg-red-50`}
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
        {ballotList.total > BALLOT_LIST_SIZE && (
          <a href={showAllBallots ? "/admin#ballots-h" : "/admin?ballots=all#ballots-h"} className={`${secondary} mt-3`}>
            {showAllBallots ? `Show only the newest ${BALLOT_LIST_SIZE}` : `Show all ${ballotList.total} ballots`}
          </a>
        )}
      </section>

      {/* Talks */}
      <section aria-labelledby="talks-h" className="space-y-6">
        <h2 id="talks-h" className="text-xl font-bold">Talks</h2>
        {perCategory.map(({ id, talks }) => (
          <div key={id} className={card}>
            <h3 className="text-lg font-bold">{CATEGORIES[id].name} ({talks.filter((t) => !t.hidden).length})</h3>
            <ul className="mt-3 divide-y divide-neutral-200">
              {talks.map((t) => (
                <li key={t.id} className={`py-3 ${t.hidden ? "opacity-60" : ""}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-sm">
                      <p className="text-neutral-600">
                        {t.start_time} · {t.room}
                        {id === "lightning" && ` · #${t.position}`}
                        {t.hidden && " · REMOVED"}
                      </p>
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-neutral-700">{t.speakers}</p>
                    </div>
                    <form action={setTalkHidden}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="hidden" value={String(!t.hidden)} />
                      <ConfirmButton
                        message={t.hidden ? `Put "${t.title}" back on the ballot?` : `Remove "${t.title}" from the ballot? Votes it already has are kept.`}
                        className={secondary}
                      >
                        {t.hidden ? "Restore" : "Remove"}
                      </ConfirmButton>
                    </form>
                  </div>
                  <EditTalk category={id} talk={t} />
                </li>
              ))}
            </ul>
            <details className="mt-4 rounded-lg bg-neutral-50 p-3" data-editing>
              <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-brand">+ Add a talk</summary>
              <div className="mt-2">
                <TalkForm category={id} />
              </div>
            </details>
          </div>
        ))}
      </section>

      {/* Danger zone */}
      <section aria-labelledby="danger-h" className={`${card} ring-red-300`}>
        <h2 id="danger-h" className="text-xl font-bold text-red-800">Delete all ballots</h2>
        <p className="mt-1 text-sm text-neutral-700">
          Use this once, after testing and before the conference, to clear test votes. It erases every ballot in
          both awards (talks are kept) and lets every device vote again. It cannot be undone, so download the CSVs
          first if you might need them.
        </p>
        <DeleteAllBallots />
      </section>
    </main>
  );
}
