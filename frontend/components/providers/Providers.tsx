"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import { SWRConfig } from "swr";

import { swrFetcher } from "@/lib/api";

const swrOptions = {
  fetcher: swrFetcher,
  dedupingInterval: 2000,
  revalidateOnFocus: false,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim();
  const inner = <SWRConfig value={swrOptions}>{children}</SWRConfig>;
  if (!domain || !clientId) {
    return inner;
  }
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri:
          typeof window !== "undefined" ? `${window.location.origin}` : undefined,
        audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      }}
      cacheLocation="localstorage"
    >
      {inner}
    </Auth0Provider>
  );
}
