export const ONBOARDING_COOKIE = "rainuse_onboarding";

export function setOnboardingCookieClient(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ONBOARDING_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}
