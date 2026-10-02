"use client";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 text-center text-stone-900">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          We could not complete that request.
        </h1>
        <p className="mt-4 text-stone-600">
          Please try again. If the problem continues, contact the studio directly.
        </p>
        <button
          className="mt-7 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
