"use client";

import { useActionState } from "react";
import { join } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const [error, action, pending] = useActionState(join.bind(null, token), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Your name (as the group knows you)
        <input className="input text-base" name="name" required maxLength={40} autoFocus autoComplete="given-name" />
      </label>
      <button className="btn self-start" disabled={pending}>
        {pending ? "Joining…" : "Join"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
