export default function BuildingPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="p-8 font-display text-xl text-content-primary">
      Building <span className="font-mono text-content-mono">{params.id}</span> — stub
      (Phase 05)
    </main>
  );
}
