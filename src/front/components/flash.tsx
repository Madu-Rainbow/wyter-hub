export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <div
      role={erro ? "alert" : "status"}
      className={`mb-4 rounded-md border px-3 py-2 text-sm ${erro ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
    >
      {erro ?? ok}
    </div>
  );
}
