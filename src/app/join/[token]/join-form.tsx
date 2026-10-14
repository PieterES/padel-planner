"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { join } from "./actions";

export function JoinForm({ token }: { token: string }) {
  const [error, action, pending] = useActionState(join.bind(null, token), null);
  return (
    // onSubmit instead of action={…}: React resets an action form after every
    // submit, which would wipe the typed name when there's an error.
    <form onSubmit={(e) => submit(e, action)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Your name (as the group knows you)
        <input
          className="input text-base"
          name="name"
          required
          maxLength={40}
          autoFocus
          autoComplete="username"
          placeholder="e.g. Anna"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password <span className="font-normal text-muted">(at least 6 characters)</span>
        <input
          className="input text-base"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password again
        <input
          className="input text-base"
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <button className="btn-lime w-full py-2.5 text-base" disabled={pending}>
        {pending ? "Joining…" : "Join the group →"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

function submit(e: FormEvent<HTMLFormElement>, action: (fd: FormData) => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
}
