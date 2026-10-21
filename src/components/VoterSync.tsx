"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// The localStorage key that holds this device's signed voter ID (the backup copy of the cookie).
export const VOTER_STORAGE_KEY = "pc_voter_token";

export function readStoredToken(): string | null {
  try {
    return localStorage.getItem(VOTER_STORAGE_KEY);
  } catch {
    return null; // private browsing or storage blocked
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(VOTER_STORAGE_KEY, token);
  } catch {
    // Storage blocked: the cookie alone will have to do.
  }
}

/**
 * Runs once when a voter page loads. Sends the localStorage copy of the voter ID to the server,
 * which restores the cookie if it was cleared; then saves the server's answer back to localStorage
 * in case that was the one cleared. Renders nothing.
 */
export default function VoterSync() {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdminPage) return;
    let cancelled = false;
    fetch("/api/voter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: readStoredToken() }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { token: string; cookieChanged: boolean } | null) => {
        if (!data || cancelled) return;
        storeToken(data.token);
        // The cookie was just created or restored: re-render so "already voted" checks use it.
        if (data.cookieChanged) router.refresh();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only on first load of the site, not on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
