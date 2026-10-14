import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";
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
        {invalid ? (
          <p className="mt-6 inline-block rounded-xl bg-danger/15 px-4 py-2 text-sm font-medium text-navy-ink">
            That link isn’t valid (anymore). Ask in the group chat for a new one.
          </p>
        ) : (
          <p className="mt-6 inline-block rounded-xl bg-white/10 px-4 py-2 text-sm text-navy-ink">
            Open the invite link from the group chat to join, or your personal link to log in.
          </p>
        )}
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
