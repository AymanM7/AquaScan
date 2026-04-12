export default function PortfolioPage({
  params,
}: {
  params: { owner: string };
}) {
  return (
    <main className="p-8 font-display text-xl text-content-primary">
      Portfolio <span className="font-mono text-content-mono">{params.owner}</span> — stub
      (Phase 09)
    </main>
  );
}
