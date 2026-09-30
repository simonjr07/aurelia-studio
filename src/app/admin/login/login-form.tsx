"use client";

import { useActionState } from "react";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="mt-9 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4 text-base outline-none transition focus:border-clay focus:ring-4 focus:ring-clay/10"
          id="email"
          maxLength={320}
          name="email"
          required
          type="email"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="min-h-12 w-full rounded-xl border border-ink/20 bg-white px-4 text-base outline-none transition focus:border-clay focus:ring-4 focus:ring-clay/10"
          id="password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </div>

      {state.message ? (
        <p
          aria-live="polite"
          className="rounded-xl border border-clay/25 bg-clay/8 px-4 py-3 text-sm text-ink"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-full bg-ink px-6 text-sm font-semibold text-cream transition hover:bg-ink/90 disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
