import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-content-primary md:text-4xl">
        RainUSE Nexus
      </h1>
      <p className="max-w-lg text-center text-content-secondary">
        Phase 0 shell — mission control UI arrives in later phases. Data plane:{" "}
        <code className="font-mono text-sm text-content-mono">docker compose up</code>
      </p>
      <nav className="flex flex-wrap justify-center gap-3 text-sm text-accent-teal">
        <Link className="underline-offset-4 hover:underline" href="/onboarding">
          /onboarding
        </Link>
        <Link className="underline-offset-4 hover:underline" href="/map">
          /map
        </Link>
        <Link className="underline-offset-4 hover:underline" href="/automation">
          /automation
        </Link>
      </nav>
    </div>
  );
}
