import { requireUser } from "@/lib/auth";
import { vapidKeys } from "@/lib/push";
import { BallMark, PageHeader, Section } from "../ui";
import { AvailabilityEditor } from "./availability-editor";
import { setPassword } from "./actions";
import { Notifications } from "./notifications";
import { PasswordForm } from "./password-form";

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
              Set when you can usually play below. On another phone or laptop, just log in with your
              name and password.
            </p>
          </div>
        </div>
      )}
      {!user.passwordHash && (
        <div className="card flex items-start gap-3 border-lime bg-lime/10">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-lime font-bold text-lime-ink">
            !
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Set a password</p>
            <p className="text-sm text-muted">
              So you can log in on any device with your name ({user.name}) and password. Scroll down
              to “Password”.
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
        icon="bell"
        title="Notifications"
        description="New matches you can play, when a match has enough players, and when someone books. Turn it on for each phone or laptop."
      >
        <Notifications vapidPublicKey={vapidKeys().publicKey} />
      </Section>

      <Section
        icon="key"
        title="Password"
        description={`Log in anywhere with your name “${user.name}” and this password.`}
      >
        <PasswordForm save={setPassword.bind(null, user.id)} askCurrent={!!user.passwordHash} />
      </Section>
    </div>
  );
}
