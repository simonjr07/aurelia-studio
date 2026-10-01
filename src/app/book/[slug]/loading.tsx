export default function BookingLoading() {
  return (
    <main aria-label="Preparing booking" className="public-shell animate-pulse">
      <div className="h-20 border-b border-ink/10 bg-paper/40" />
      <section className="border-b border-ink/10 py-14">
        <div className="public-container max-w-6xl">
          <div className="h-3 w-36 rounded-full bg-ink/10" />
          <div className="mt-5 h-16 max-w-2xl rounded-2xl bg-ink/10" />
          <div className="mt-5 h-5 max-w-xl rounded-full bg-ink/10" />
        </div>
      </section>
      <section className="public-container max-w-6xl py-12">
        <div className="grid grid-cols-5 gap-2">
          {[0, 1, 2, 3, 4].map((item) => <div className="h-1.5 rounded-full bg-ink/10" key={item} />)}
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="h-[30rem] rounded-[1.5rem] border border-ink/10 bg-paper/45" />
          <div className="h-72 rounded-[1.5rem] bg-sage/35" />
        </div>
      </section>
    </main>
  );
}
