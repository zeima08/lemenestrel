export function Brand() {
  return (
    <div aria-label="Le Ménestrel by zeimacode" className="flex items-center gap-3">
      <span aria-hidden="true" className="font-mono text-2xl tracking-tight text-zinc-400">{"{zc}"}</span>
      <div>
        <p className="text-lg font-semibold tracking-tight">Le Ménestrel<span className="text-zinc-500">.</span></p>
        <p className="text-xs text-zinc-500">by <span className="font-semibold text-zinc-200">zeimacode<span className="text-zinc-500">.</span></span></p>
      </div>
    </div>
  );
}
