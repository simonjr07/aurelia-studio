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
          className="admin-field min-h-12 px-4 text-base"
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
          className="admin-field min-h-12 px-4 text-base"
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
        className="admin-button-primary min-h-12 w-full"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
