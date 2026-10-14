import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/auth";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { invalid } = await searchParams;
  if (await currentUser()) redirect("/matches");
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="card">
      <h1>Padel Planner</h1>
      {invalid ? (
        <p>That link isn’t valid (anymore). Ask the organiser for a new one.</p>
      ) : (
        <p>Open the invite link from the group chat to join, or your personal link to log in.</p>
      )}
    </div>
  );
}
