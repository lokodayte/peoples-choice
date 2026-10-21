import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { isAdmin } from "@/lib/admin-auth";
import { CONFERENCE_DATE, CONFERENCE_NAME } from "@/lib/categories";
import { siteUrl } from "@/lib/site-url";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "Poster · People's Choice", robots: { index: false } };

export default async function PosterPage() {
  if (!(await isAdmin())) redirect("/admin");
  const url = await siteUrl();
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[8.5in] flex-col items-center justify-center bg-white px-8 py-10 text-center">
      <PrintButton />
      <p className="text-xl font-semibold text-brand">{CONFERENCE_NAME} · {CONFERENCE_DATE}</p>
      <h1 className="mt-4 text-6xl leading-tight font-extrabold">Vote for People&apos;s Choice!</h1>
      <p className="mt-3 text-2xl">Best Paper Presentation · Best Lightning Talk</p>
      <div role="img" aria-label={`QR code linking to ${url}`} className="mt-8 w-[5.5in] max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-8 text-2xl">Scan with your phone camera, or visit:</p>
      <p className="mt-2 font-mono text-3xl font-bold break-all">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
    </main>
  );
}
