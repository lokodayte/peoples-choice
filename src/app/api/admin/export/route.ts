import { isAdmin } from "@/lib/admin-auth";
import { CATEGORIES, type CategoryId } from "@/lib/categories";
import { getAllBallots, getResults } from "@/lib/queries";

// Turns any value into one safe CSV cell. Cells starting with = + - @ are prefixed with '
// so spreadsheet apps don't run them as formulas.
function cell(value: unknown): string {
  let s = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Not signed in", { status: 401 });
  const type = new URL(request.url).searchParams.get("type");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

  let body: string;
  if (type === "results") {
    const rows: unknown[][] = [
      ["award", "place", "title", "speakers", "time", "room", "points", "1st votes", "2nd votes", "3rd votes", "total ballots", "talk removed"],
    ];
    for (const id of Object.keys(CATEGORIES) as CategoryId[]) {
      const { rows: results, ballots } = await getResults(id);
      results.forEach((r, i) =>
        rows.push([CATEGORIES[id].name, i + 1, r.title, r.speakers, r.start_time, r.room, r.points, r.firsts, r.seconds, r.thirds, ballots, r.hidden ? "yes" : ""]),
      );
    }
    body = csv(rows);
  } else if (type === "ballots") {
    const ballots = await getAllBallots();
    body = csv([
      ["ballot id", "award", "submitted at (UTC)", "name", "1st", "2nd", "3rd", "removed at (UTC)", "ip hash", "ip+browser hash"],
      ...ballots.map((b) => [
        b.id, CATEGORIES[b.category_id].name, b.created_at, b.voter_name, b.first, b.second, b.third, b.removed_at, b.ip_hash, b.ip_ua_hash,
      ]),
    ]);
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="peoples-choice-${type}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
