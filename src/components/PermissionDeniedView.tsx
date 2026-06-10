export function PermissionDeniedView() {
  return (
    <div className="max-w-xl mx-auto mt-16 rounded-xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
      <h2 className="font-bold text-rose-300">Permission denied</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Your active organization role does not permit this action.
      </p>
    </div>
  );
}
