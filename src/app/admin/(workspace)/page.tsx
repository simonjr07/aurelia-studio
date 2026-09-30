import { requireStaff } from "@/server/auth/access";

export default async function WorkspaceOverviewPage() {
  const user = await requireStaff();

  return (
    <main className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          Aurelia Studio workspace
        </p>
        <h1 className="mt-4 font-display text-5xl tracking-[-0.035em] sm:text-6xl">
          Welcome, {user.name.split(" ")[0]}.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-ink/60">
          This secure workspace is ready. Upcoming appointment functionality
          will arrive in a later task.
        </p>

        <section className="mt-12 rounded-[2rem] border border-ink/10 bg-white p-7 shadow-sm shadow-ink/5 sm:p-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/45">
                Overview
              </p>
              <h2 className="mt-3 font-display text-3xl">
                Appointment operations are coming next.
              </h2>
              <p className="mt-3 max-w-xl leading-7 text-ink/60">
                Today’s schedule, upcoming appointments, and operational actions
                will appear here when those workflows are implemented.
              </p>
            </div>
            <span className="w-fit rounded-full bg-sage/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
              Access active
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
