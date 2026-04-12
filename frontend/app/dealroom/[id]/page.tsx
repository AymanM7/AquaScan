export default function DealroomPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="p-8 font-display text-xl text-content-primary">
      Dealroom <span className="font-mono text-content-mono">{params.id}</span> — stub (Phase
      08)
    </main>
  );
}
