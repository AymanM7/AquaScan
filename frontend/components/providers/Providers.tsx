"use client";

import { Auth0Provider } from "@auth0/auth0-react";

export function Providers({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim();
  if (!domain || !clientId) {
    return <>{children}</>;
  }
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri:
          typeof window !== "undefined" ? `${window.location.origin}` : undefined,
      }}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
