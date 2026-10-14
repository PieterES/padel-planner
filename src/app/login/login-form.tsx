"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    // onSubmit instead of action={…}: React resets an action form after every
    // submit, which would wipe the typed name when there's an error.
    <form onSubmit={(e) => submit(e, action)} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Name
        <input className="input text-base" name="name" required autoComplete="username" maxLength={40} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Password
        <input
          className="input text-base"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <button className="btn-lime w-full py-2.5 text-base" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
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
