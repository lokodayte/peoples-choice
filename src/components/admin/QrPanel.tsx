"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CONFERENCE_DATE, CONFERENCE_NAME } from "@/lib/categories";
import { buttonClass } from "./AdminClient";

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Draws a letter-size (8.5 × 11 in at 300 dpi) poster with a big QR code. */
async function makePoster(url: string): Promise<string> {
  const W = 2550, H = 3300;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#a6192e";
  ctx.fillRect(0, 0, W, 60);
  ctx.textAlign = "center";

  ctx.fillStyle = "#a6192e";
  ctx.font = "600 80px system-ui, sans-serif";
  ctx.fillText(`${CONFERENCE_NAME} · ${CONFERENCE_DATE}`, W / 2, 300);
  ctx.fillStyle = "#1c1c1c";
  ctx.font = "800 190px system-ui, sans-serif";
  ctx.fillText("Vote for", W / 2, 560);
  ctx.fillText("People's Choice!", W / 2, 780);
  ctx.font = "400 80px system-ui, sans-serif";
  ctx.fillText("Best Paper Presentation · Best Lightning Talk", W / 2, 920);

  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, url, { width: 1700, margin: 2, errorCorrectionLevel: "M" });
  ctx.drawImage(qr, (W - 1700) / 2, 1020);

  ctx.font = "500 90px system-ui, sans-serif";
  ctx.fillText("Scan with your phone camera, or visit:", W / 2, 2880);
  ctx.font = "700 100px ui-monospace, monospace";
  ctx.fillText(url.replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 3030);
  return canvas.toDataURL("image/png");
}

export default function QrPanel({ url }: { url: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" }).then(setSvg);
  }, [url]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div
        role="img"
        aria-label={`QR code linking to ${url}`}
        className="w-48 shrink-0 rounded-lg bg-white p-2 ring-1 ring-black/10"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="space-y-3">
        <p>
          Links to <a href={url} className="font-mono break-all text-brand underline">{url}</a>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`${buttonClass} bg-brand text-white hover:bg-brand-dark`}
            onClick={async () =>
              download(await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: "M" }), "peoples-choice-qr.png")
            }
          >
            Download QR (PNG)
          </button>
          <button
            type="button"
            className={`${buttonClass} bg-white ring-1 ring-neutral-400 hover:bg-neutral-50`}
            onClick={async () => download(await makePoster(url), "peoples-choice-poster.png")}
          >
            Download poster (PNG, letter size)
          </button>
          <a href="/admin/poster" target="_blank" className={`${buttonClass} bg-white ring-1 ring-neutral-400 hover:bg-neutral-50`}>
            Open printable poster
          </a>
        </div>
        <p className="text-sm text-neutral-600">
          Check that this address is your real public site before printing. Set NEXT_PUBLIC_SITE_URL to change it.
        </p>
      </div>
    </div>
  );
}
