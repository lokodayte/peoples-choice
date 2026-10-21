"use client";

// Small interactive pieces of the admin page.

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { addTalk, deleteAllBallots, login, updateTalk, type TalkFormState } from "@/app/admin/actions";
import type { CategoryId } from "@/lib/categories";

const input = "block min-h-11 w-full rounded-lg border border-neutral-400 bg-white px-3 text-base";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold disabled:opacity-60";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-3">
      <label htmlFor="password" className="block font-medium">Admin password</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
      {state?.error && <p role="alert" className="text-red-800">{state.error}</p>}
      <button disabled={pending} className={`${buttonClass} w-full bg-brand text-white hover:bg-brand-dark`}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

/** Re-fetches the page data every 15 seconds, unless you're typing in a form. */
export function AutoRefresh() {
  const router = useRouter();
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (!typing && !document.querySelector("details[data-editing][open]")) router.refresh();
    }, 15_000);
    return () => clearInterval(timer);
  }, [on, router]);
  return (
    <label className="inline-flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-5 w-5" />
      Auto-refresh results every 15 s
    </label>
  );
}

/** A submit button that asks "Are you sure?" first. */
export function ConfirmButton({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}

/** Wipes every ballot (e.g. test votes before the conference). Needs "DELETE ALL" typed in. */
export function DeleteAllBallots() {
  const [state, action, pending] = useActionState(deleteAllBallots, undefined);
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="confirm-delete" className="text-sm font-medium">Type DELETE ALL to confirm</label>
        <input id="confirm-delete" name="confirm" autoComplete="off" className={input} />
      </div>
      <button disabled={pending} className={`${buttonClass} bg-red-700 text-white hover:bg-red-800`}>
        {pending ? "Deleting…" : "Delete all ballots"}
      </button>
      {state?.error && <p role="alert" className="text-red-800">{state.error}</p>}
      {state?.ok && <p role="status" className="text-green-800">All ballots deleted.</p>}
    </form>
  );
}

type TalkValues = { id?: number; start_time: string; position: number; room: string; speakers: string; title: string };

export function TalkForm({ category, talk, onDone }: { category: CategoryId; talk?: TalkValues; onDone?: () => void }) {
  const [state, setState] = useState<TalkFormState>(undefined);
  const [pending, startTransition] = useTransition();
  // Submitted by hand (not via the form's `action` prop) so that what you typed
  // stays in the boxes if the server rejects it. A successful "add" clears the form.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await (talk ? updateTalk : addTalk)(undefined, data);
      setState(result);
      if (result?.ok) {
        if (!talk) form.reset();
        onDone?.();
      }
    });
  }
  const id = (field: string) => `${field}-${talk?.id ?? `new-${category}`}`;
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-6">
      <input type="hidden" name="category" value={category} />
      {talk?.id && <input type="hidden" name="id" value={talk.id} />}
      <div className="sm:col-span-2">
        <label htmlFor={id("time")} className="text-sm font-medium">Time</label>
        <input id={id("time")} name="start_time" required placeholder="2:05 PM" defaultValue={talk?.start_time} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("room")} className="text-sm font-medium">Room</label>
        <input id={id("room")} name="room" required placeholder="SC3102" defaultValue={talk?.room} className={input} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={id("pos")} className="text-sm font-medium">
          {category === "lightning" ? "Talk number" : "Order (optional)"}
        </label>
        <input id={id("pos")} name="position" type="number" min={0} max={999} defaultValue={talk?.position ?? 0} className={input} />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={id("title")} className="text-sm font-medium">Title</label>
        <input id={id("title")} name="title" required defaultValue={talk?.title} className={input} />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={id("speakers")} className="text-sm font-medium">Speakers (with affiliations)</label>
        <input id={id("speakers")} name="speakers" required defaultValue={talk?.speakers} className={input} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-6">
        <button disabled={pending} className={`${buttonClass} bg-brand text-white hover:bg-brand-dark`}>
          {pending ? "Saving…" : talk ? "Save changes" : "Add talk"}
        </button>
        {state?.error && <p role="alert" className="text-red-800">{state.error}</p>}
        {state?.ok && <p role="status" className="text-green-800">Saved.</p>}
      </div>
    </form>
  );
}

export function EditTalk({ category, talk }: { category: CategoryId; talk: TalkValues }) {
  const [open, setOpen] = useState(false);
  return (
    <details data-editing open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-brand underline underline-offset-4">Edit</summary>
      {open && (
        <div className="mt-2 rounded-lg bg-neutral-50 p-3">
          <TalkForm category={category} talk={talk} onDone={() => setOpen(false)} />
        </div>
      )}
    </details>
  );
}
