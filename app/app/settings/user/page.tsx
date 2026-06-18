'use client';

import { useSession } from '@/auth/auth-client';
import { Input } from '@/components/ui/input';
import { Field, SectionCard } from '../_shared';

export default function UserSettingsPage() {
  const session = useSession();
  const user = session.data?.user;

  if (!user) {
    return (
      <p className="text-muted-foreground text-sm">
        Could not load user data.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard
        title="User Profile"
        description="Your account details."
      >
        <Field label="Name">
          <Input value={user.name ?? ''} readOnly />
        </Field>
        <Field label="Email">
          <Input value={user.email ?? ''} readOnly />
        </Field>
        <p className="text-sm text-muted-foreground">
          User profile settings are managed through your authentication provider.
        </p>
      </SectionCard>
    </div>
  );
}
