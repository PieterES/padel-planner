import { magicLink, requireUser } from "@/lib/auth";
import { CopyField } from "../copy-field";
import { BallMark, PageHeader, Section } from "../ui";
import { AvailabilityEditor } from "./availability-editor";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const { welcome, week } = await searchParams;
  const user = await requireUser();

  return (
    <div className="space-y-6">
      {welcome && (
        <div className="card flex items-start gap-3 border-lime bg-lime/10">
          <BallMark className="h-8 w-8 flex-none" />
          <div>
            <p className="font-display text-lg font-semibold">Welcome, {user.name}!</p>
            <p className="text-sm text-muted">
              Set when you can usually play below. Save your personal link (bottom of this page) to
              get back in on another phone or browser.
            </p>
          </div>
        </div>
      )}
      <PageHeader eyebrow={`Hi ${user.name}`} title="When can you play?" />
      <AvailabilityEditor
        userId={user.id}
        basePath="/me"
        week={typeof week === "string" ? week : undefined}
      />

      <Section
        icon="key"
        title="Your personal link"
        description="This link logs you in. Bookmark it, or use it on another device. Don’t share it."
      >
        <CopyField value={magicLink(user.magicToken)} />
      </Section>
    </div>
  );
}
