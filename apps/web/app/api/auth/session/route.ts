import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import { getProfile, validateDisplayName } from "@/lib/account-profile";
import { NextResponse } from "next/server";

const suggestedDisplayName = (user: {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  email?: string;
}) => {
  if (user.app_metadata?.provider !== "google" && user.app_metadata?.provider !== "apple") return null;
  const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof rawName !== "string") return null;

  try {
    const name = validateDisplayName(rawName);
    return name.toLowerCase() === user.email?.split("@")[0]?.toLowerCase() ? null : name;
  } catch {
    return null;
  }
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null });
  }

  const profile = await getProfile(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName: profile?.displayName ?? null,
      needsDisplayName: !profile?.displayName,
      suggestedDisplayName: profile?.displayName ? null : suggestedDisplayName(user),
      avatarUrl: profile?.avatarUrl ?? user.user_metadata?.avatar_url ?? null,
      marketingEmailOptIn: profile?.marketingEmailOptIn ?? false,
      dailyReminderOptIn: profile?.dailyReminderOptIn ?? false,
    },
  });
}
