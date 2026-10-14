import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db, schema } from "@/lib/db";
import { AvatarStack, Hero } from "../../ui";
import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  if (await currentUser()) redirect("/me");
  const valid = getSettings().inviteToken === token;
  const members = valid ? db.select({ name: schema.users.name }).from(schema.users).all() : [];

  return (
    <Hero>
      <p className="eyebrow mb-2 !text-lime">You’re invited</p>
      <h1 className="text-4xl text-navy-ink sm:text-5xl">Join Padel Planner</h1>
      {valid ? (
        <>
          <p className="mt-4 max-w-md text-navy-ink/75">
            Tell us your name, set when you can play, and you’ll see matches as soon as enough of
            the group is free.
          </p>
          {members.length > 0 && (
            <div className="mt-5 flex items-center gap-3 text-sm text-navy-ink/75">
              <AvatarStack names={members.map((m) => m.name)} max={7} />
              <span>
                {members.length} already in
              </span>
            </div>
          )}
          <div className="mt-6 max-w-sm rounded-2xl bg-surface p-5 text-foreground">
            <JoinForm token={token} />
          </div>
        </>
      ) : (
        <p className="mt-6 inline-block rounded-xl bg-danger/15 px-4 py-2 text-sm font-medium text-navy-ink">
          This invite link is no longer valid. Ask in the group chat for the new one.
        </p>
      )}
    </Hero>
  );
}
