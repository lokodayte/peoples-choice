// Makes the printed materials for the People's Choice vote:
//   flyer.pdf / flyer.png           letter-size wall flyer (8.5 × 11 in)
//   table-tent.pdf / table-tent.png  fold-in-half sign for the check-in table (letter, landscape)
//   schedule-qr.png / .svg           the QR code alone, for the printed schedule
//   schedule-qr-labeled.png          QR + "Scan to vote" caption, for the printed schedule
//
// Usage (from the project folder):
//   npm run print -- https://your-site.vercel.app
//
// Needs Google Chrome installed (it is used to turn the pages into PDF/PNG).
// Output goes to print/out/.

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import QRCode from "qrcode";

const run = promisify(execFile);
const url = process.argv[2];
if (!url || !/^https?:\/\/[^\s]+$/.test(url)) {
  console.error("Usage: node print/make-print-files.mjs https://your-site.vercel.app");
  process.exit(1);
}
const siteUrl = url.replace(/\/+$/, "") + "/";
const shownUrl = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = fileURLToPath(new URL("./out/", import.meta.url)); // decodes spaces in folder names

// ---- Event details (edit here if anything changes) ----
const EVENT = {
  name: "Marist Computing Conference",
  date: "Friday, October 30, 2026",
  shortDate: "Oct 30, 2026",
  closes: "4:00 PM",
};

// "Q" error correction (25%) keeps the code readable even if a poster gets scuffed or folded.
const qrSvg = (margin = 0) =>
  QRCode.toString(siteUrl, { type: "svg", errorCorrectionLevel: "Q", margin, color: { dark: "#141414", light: "#ffffff" } });

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=block" rel="stylesheet">`;

const baseCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Geist, "Helvetica Neue", Arial, sans-serif; color: #1c1c1c; background: #fff;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .qr svg { display: block; width: 100%; height: 100%; }
  .addr { font-family: Geist, "Helvetica Neue", Arial, sans-serif; font-weight: 600; letter-spacing: 0.01em; }
`;

// Simple line-art icons (white or red strokes), drawn here so there are no image files to manage.
const trophy = (stroke, width = 2) => `
<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M20 8h24v14c0 8-5.4 14-12 14S20 30 20 22V8z"/>
  <path d="M20 13h-7c0 7 3 11 8 12M44 13h7c0 7-3 11-8 12"/>
  <path d="M32 36v9M24 52h16M26 45h12l2 7H24l2-7z"/>
  <path d="M32 14l2 4.2 4.6.6-3.3 3.2.8 4.5L32 24.4 27.9 26.5l.8-4.5-3.3-3.2 4.6-.6z" fill="${stroke}" stroke-width="1"/>
</svg>`;
const bolt = (stroke) => `
<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" aria-hidden="true">
  <path d="M36 6L14 36h16l-4 22 24-32H34l2-20z"/>
</svg>`;
const paper = (stroke) => `
<svg viewBox="0 0 64 64" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M16 6h22l12 12v40H16z"/><path d="M38 6v12h12M24 30h18M24 39h18M24 48h12"/>
</svg>`;

// ------------------------------------------------------------------ flyer
function flyerHtml(qr) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>People's Choice flyer</title>${fonts}
<style>${baseCss}
  @page { size: 8.5in 11in; margin: 0; }
  html, body { width: 8.5in; height: 11in; }
  .page { width: 8.5in; height: 11in; padding: 0.42in; display: flex; flex-direction: column; }

  .top { position: relative; overflow: hidden; background: #a6192e; color: #fff; border-radius: 0.24in;
         padding: 0.34in 0.42in 0.38in; }
  .top::after { content: ""; position: absolute; inset: auto -0.6in -1.3in auto; width: 3.4in; height: 3.4in;
                border-radius: 50%; background: rgba(255,255,255,0.07); }
  .top .bigicon { position: absolute; right: 0.45in; bottom: 0.3in; width: 1.4in; height: 1.4in; opacity: 0.9; }
  .kicker { font-weight: 600; font-size: 12.5pt; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.92; }
  h1 { font-weight: 900; font-size: 50pt; line-height: 0.96; letter-spacing: -0.025em; margin-top: 0.14in; }
  .sub { font-size: 17pt; font-weight: 500; margin-top: 0.14in; opacity: 0.96; }

  .awards { display: flex; gap: 0.16in; margin-top: 0.2in; }
  .award { flex: 1; display: flex; align-items: center; gap: 0.14in; border: 2.5px solid #a6192e; border-radius: 0.16in;
           padding: 0.12in 0.18in; }
  .award .ic { width: 0.46in; height: 0.46in; flex: none; }
  .award b { display: block; font-size: 14.5pt; font-weight: 800; line-height: 1.1; }
  .award span { display: block; font-size: 10.5pt; color: #555; margin-top: 2px; }

  .middle { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .scan { font-weight: 800; font-size: 21pt; letter-spacing: 0.12em; color: #a6192e; text-transform: uppercase;
          display: flex; align-items: center; gap: 0.16in; }
  .scan::before, .scan::after { content: ""; width: 0.55in; height: 3px; background: #a6192e; border-radius: 2px; }
  .qrbox { position: relative; margin-top: 0.14in; width: 3.75in; height: 3.75in; padding: 0.2in; }
  .qrbox .corner { position: absolute; width: 0.55in; height: 0.55in; border: 5px solid #a6192e; }
  .c1 { top: 0; left: 0; border-right: 0 !important; border-bottom: 0 !important; border-top-left-radius: 0.18in; }
  .c2 { top: 0; right: 0; border-left: 0 !important; border-bottom: 0 !important; border-top-right-radius: 0.18in; }
  .c3 { bottom: 0; left: 0; border-right: 0 !important; border-top: 0 !important; border-bottom-left-radius: 0.18in; }
  .c4 { bottom: 0; right: 0; border-left: 0 !important; border-top: 0 !important; border-bottom-right-radius: 0.18in; }
  .url { margin: 0.08in 0 0.14in; font-size: 15pt; color: #333; }

  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.14in; }
  .step { background: #f6f6f4; border-radius: 0.14in; padding: 0.14in 0.16in; display: flex; gap: 0.12in; align-items: flex-start; }
  .num { flex: none; width: 0.34in; height: 0.34in; border-radius: 50%; background: #a6192e; color: #fff; font-weight: 800;
         font-size: 13pt; display: flex; align-items: center; justify-content: center; }
  .step p { font-size: 11.5pt; line-height: 1.3; }
  .step strong { display: block; font-size: 12.5pt; }

  .deadline { margin-top: 0.16in; background: #1c1c1c; color: #fff; border-radius: 0.16in; padding: 0.17in 0.3in;
              display: flex; align-items: center; justify-content: space-between; gap: 0.2in; }
  .deadline .big { font-weight: 800; font-size: 19pt; letter-spacing: -0.01em; }
  .deadline .big em { font-style: normal; color: #ff8a9a; }
  .deadline .small { font-size: 11.5pt; text-align: right; opacity: 0.9; line-height: 1.3; }
</style></head><body><div class="page">
  <header class="top">
    <div class="bigicon">${trophy("rgba(255,255,255,0.9)", 2.2)}</div>
    <p class="kicker">${EVENT.name} · ${EVENT.shortDate}</p>
    <h1>People's Choice<br>Awards</h1>
    <p class="sub">Which talks were the best? <strong>You decide.</strong></p>
  </header>

  <section class="awards">
    <div class="award"><div class="ic">${paper("#a6192e")}</div><div><b>Best Paper Presentation</b><span>Technical sessions</span></div></div>
    <div class="award"><div class="ic">${bolt("#a6192e")}</div><div><b>Best Lightning Talk</b><span>Lightning talks · SC3105</span></div></div>
  </section>

  <section class="middle">
    <p class="scan">Scan to vote</p>
    <div class="qrbox"><span class="corner c1"></span><span class="corner c2"></span><span class="corner c3"></span><span class="corner c4"></span>
      <div class="qr" style="width:100%;height:100%">${qr}</div></div>
    <p class="url addr">${shownUrl}</p>
  </section>

  <section class="steps">
    <div class="step"><span class="num">1</span><p><strong>Scan</strong>Point your phone camera at the code</p></div>
    <div class="step"><span class="num">2</span><p><strong>Pick your top 3</strong>From the talks you attended</p></div>
    <div class="step"><span class="num">3</span><p><strong>Submit</strong>Under a minute. No sign-up.</p></div>
  </section>

  <footer class="deadline">
    <p class="big">Voting closes at <em>${EVENT.closes}</em> today</p>
    <p class="small">Winners announced at<br>the awards ceremony</p>
  </footer>
</div></body></html>`;
}

// ------------------------------------------------------------------ table tent
// Letter landscape, folded in half along the middle. The top half is upside down,
// so once folded both sides read the right way up.
function tentHtml(qr) {
  const panel = `
    <div class="panel">
      <div class="qrcol"><div class="qr">${qr}</div><p class="url addr">${shownUrl}</p></div>
      <div class="text">
        <p class="kicker">${EVENT.name}</p>
        <h1>Vote for<br><span>People's Choice!</span></h1>
        <p class="awards">Best Paper Presentation · Best Lightning Talk</p>
        <ol>
          <li><b>1</b>Scan the code with your phone camera</li>
          <li><b>2</b>Pick your top 3 talks you attended</li>
          <li><b>3</b>Submit. Under a minute, no sign-up</li>
        </ol>
        <p class="pill">Voting closes at ${EVENT.closes} today</p>
      </div>
    </div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>People's Choice table sign</title>${fonts}
<style>${baseCss}
  @page { size: 11in 8.5in; margin: 0; }
  html, body { width: 11in; height: 8.5in; }
  .sheet { width: 11in; height: 8.5in; display: flex; flex-direction: column; position: relative; }
  .half { height: 4.25in; padding: 0.42in 0.55in; display: flex; }
  .half.flip { transform: rotate(180deg); }
  .fold { position: absolute; left: 0; right: 0; top: 4.25in; border-top: 1.5px dashed #bbb; }
  .fold span { position: absolute; left: 0.2in; top: -0.11in; background: #fff; padding: 0 0.06in; font-size: 7.5pt; color: #999;
               letter-spacing: 0.1em; text-transform: uppercase; }
  .panel { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5in; }
  .text { flex: none !important; }
  .qrcol { flex: none; display: flex; flex-direction: column; align-items: center; }
  .qr { width: 2.9in; height: 2.9in; padding: 0.12in; border: 4px solid #a6192e; border-radius: 0.2in; }
  .url { margin-top: 0.07in; font-size: 11pt; color: #333; }
  .text { flex: 1; }
  .kicker { font-weight: 600; font-size: 11pt; letter-spacing: 0.14em; text-transform: uppercase; color: #a6192e; }
  h1 { font-weight: 900; font-size: 34pt; line-height: 0.98; letter-spacing: -0.02em; margin-top: 0.06in; }
  h1 span { color: #a6192e; }
  .awards { font-size: 12pt; font-weight: 600; color: #555; margin-top: 0.08in; }
  ol { list-style: none; margin-top: 0.14in; display: grid; gap: 0.06in; }
  li { font-size: 13pt; display: flex; align-items: center; gap: 0.1in; }
  li b { width: 0.28in; height: 0.28in; border-radius: 50%; background: #a6192e; color: #fff; font-size: 11pt;
         display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .pill { display: inline-block; margin-top: 0.16in; background: #1c1c1c; color: #fff; font-weight: 700; font-size: 13pt;
          border-radius: 999px; padding: 0.07in 0.22in; }
</style></head><body><div class="sheet">
  <div class="half flip">${panel}</div>
  <div class="half">${panel}</div>
  <div class="fold"><span>Fold here</span></div>
</div></body></html>`;
}

// ------------------------------------------------------------------ labeled QR for the schedule
function labeledQrHtml(qr) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${fonts}
<style>${baseCss}
  html, body { width: 2in; height: 2.62in; }
  .box { width: 2in; height: 2.62in; padding: 0.08in; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .qr { width: 1.84in; height: 1.84in; }
  .t { margin-top: 0.06in; font-weight: 800; font-size: 11pt; color: #a6192e; letter-spacing: 0.02em; }
  .s { font-size: 7.5pt; color: #444; margin-top: 1px; }
</style></head><body><div class="box">
  <div class="qr">${qr}</div>
  <p class="t">Scan to vote!</p>
  <p class="s">People's Choice Awards</p>
  <p class="s">Voting closes ${EVENT.closes}</p>
</div></body></html>`;
}

// ------------------------------------------------------------------ render with Chrome
async function chrome(htmlPath, args) {
  const profile = await mkdtemp(join(tmpdir(), "pc-chrome-"));
  try {
    await run(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
      `--user-data-dir=${profile}`, "--virtual-time-budget=8000", "--run-all-compositor-stages-before-draw",
      ...args, pathToFileURL(htmlPath).href,
    ], { timeout: 90_000 });
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
const pdf = (html, out) => chrome(html, [`--print-to-pdf=${out}`, "--no-pdf-header-footer", "--print-to-pdf-no-header"]);
// width/height in CSS pixels (96 per inch); dpi sets the output resolution.
const png = (html, out, wIn, hIn, dpi) =>
  chrome(html, [`--screenshot=${out}`, `--window-size=${Math.round(wIn * 96)},${Math.round(hIn * 96)}`, `--force-device-scale-factor=${dpi / 96}`]);

await mkdir(OUT, { recursive: true });
const qr = await qrSvg(0);

const files = { flyer: flyerHtml(qr), "table-tent": tentHtml(qr), "schedule-qr-labeled": labeledQrHtml(qr) };
for (const [name, html] of Object.entries(files)) await writeFile(join(OUT, `${name}.html`), html);

await pdf(join(OUT, "flyer.html"), join(OUT, "flyer.pdf"));
await png(join(OUT, "flyer.html"), join(OUT, "flyer.png"), 8.5, 11, 300);
await pdf(join(OUT, "table-tent.html"), join(OUT, "table-tent.pdf"));
await png(join(OUT, "table-tent.html"), join(OUT, "table-tent.png"), 11, 8.5, 200);
await png(join(OUT, "schedule-qr-labeled.html"), join(OUT, "schedule-qr-labeled.png"), 2, 2.62, 600);
// Plain QR (with the standard white border) for placing into the schedule document.
await QRCode.toFile(join(OUT, "schedule-qr.png"), siteUrl, { errorCorrectionLevel: "Q", margin: 4, width: 1200 });
await writeFile(join(OUT, "schedule-qr.svg"), await qrSvg(4));
for (const name of Object.keys(files)) await rm(join(OUT, `${name}.html`)); // only needed while rendering

console.log(`Made print files for ${siteUrl} in print/out/`);
