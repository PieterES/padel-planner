"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";

/** Set or change a password. `askCurrent`: the friend is changing their own existing password. */
export function PasswordForm({ userId, askCurrent }: { userId: number; askCurrent: boolean }) {
  const [message, action, pending] = useActionState(setPassword.bind(null, userId), null);
  const ok = message?.endsWith("✓");
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {askCurrent && (
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Current password
          <input className="input" name="current" type="password" required autoComplete="current-password" />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        New password
        <input className="input" name="password" type="password" required minLength={6} autoComplete="new-password" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        New password again
        <input className="input" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save password"}
        </button>
        {message && !pending && (
          <span className={`text-sm font-medium ${ok ? "text-ok" : "text-danger"}`}>{message}</span>
        )}
      </div>
    </form>
  );
}
