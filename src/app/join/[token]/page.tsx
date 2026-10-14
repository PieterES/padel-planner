import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { JoinForm } from "./join-form";

export default async function JoinPage({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  if (await currentUser()) redirect("/me");
  const valid = getSettings().inviteToken === token;
  return (
    <div className="card mx-auto max-w-md">
      <h1>Join Padel Planner</h1>
      {valid ? (
        <>
          <p className="mb-4 text-sm text-muted">
            Fill in when you can play, and you’ll see matches when enough of us are free.
          </p>
          <JoinForm token={token} />
        </>
      ) : (
        <p>This invite link is no longer valid. Ask in the group for the new one.</p>
      )}
    </div>
  );
}
