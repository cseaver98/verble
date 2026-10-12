export function accountDisplayName(displayName: string | null, email: string | null) {
  if (displayName) return displayName;
  const emailPrefix = email?.split("@")[0];
  return emailPrefix || "Account";
}
