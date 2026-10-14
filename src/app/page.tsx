import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
import { LoginForm } from "./login/login-form";
import { Hero } from "./ui";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { invalid } = await searchParams;
  if (await currentUser()) redirect("/matches");
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="space-y-6">
      <Hero>
        <h1 className="text-4xl text-navy-ink sm:text-5xl">
          Find a court when <span className="text-lime">the squad</span> is free.
        </h1>
        <p className="mt-4 max-w-lg text-navy-ink/75">
          Everyone sets when they can play. Every night we check Peakz Padel for free courts and
          show you the slots where enough of you can make it.
        </p>
        <div className="mt-8 grid items-start gap-6 sm:grid-cols-[1fr_20rem]">
          <p className="text-sm text-navy-ink/75">
            New here? Open the <strong className="text-navy-ink">invite link</strong> from the group
            chat to make an account. Already joined? Log in with your name and password, on any
            device.
          </p>
          <div className="rounded-2xl bg-surface p-5 text-foreground">
            {invalid && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                That link isn’t valid (anymore). Log in instead.
              </p>
            )}
            <LoginForm />
          </div>
        </div>
      </Hero>

      <div className="grid gap-4 sm:grid-cols-3">
        <Step n={1} title="Set your week">
          Switch on the days you can play, from when until when. Change single weeks for holidays.
        </Step>
        <Step n={2} title="We check the courts">
          Peakz is scanned 4 weeks ahead at your clubs, every night at 00:30.
        </Step>
        <Step n={3} title="Book together">
          See who’s free for each slot and tap Book to reserve it on Peakz.
        </Step>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-lime font-display text-sm font-bold text-lime-ink">
        {n}
      </span>
      <p className="mt-3 font-display font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
