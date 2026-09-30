export default function ServiceDetailLoading() {
  return (
    <main
      aria-label="Loading service details"
      className="min-h-screen animate-pulse bg-cream text-ink"
    >
      <div className="border-b border-ink/10">
        <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-28">
          <div>
            <div className="h-5 w-28 rounded-full bg-ink/10" />
            <div className="mt-12 h-5 w-44 rounded-full bg-ink/10" />
            <div className="mt-6 h-24 max-w-2xl rounded-3xl bg-ink/10" />
          </div>
          <div className="min-h-72 rounded-[2.5rem] bg-sage/50" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1fr_0.7fr] lg:px-12 lg:py-24">
        <div>
          <div className="h-4 w-36 rounded-full bg-ink/10" />
          <div className="mt-7 h-32 max-w-3xl rounded-3xl bg-ink/10" />
        </div>
        <div className="h-72 rounded-[2rem] border border-ink/10 bg-white/45" />
      </div>
    </main>
  );
}
