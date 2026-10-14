"use client";

import { useActionState } from "react";
import { join } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const [error, action, pending] = useActionState(join.bind(null, token), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your name (as the group knows you)
        <input
          className="input text-base"
          name="name"
          required
          maxLength={40}
          autoFocus
          autoComplete="given-name"
          placeholder="e.g. Anna"
        />
      </label>
      <button className="btn-lime w-full py-2.5 text-base" disabled={pending}>
        {pending ? "Joining…" : "Join the group →"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
