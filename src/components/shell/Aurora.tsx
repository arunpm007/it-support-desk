/**
 * The living background: three soft colour fields drifting very slowly,
 * plus a fine grain so the glass panels have something to frost.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-aurora absolute -top-[25vh] -left-[15vw] size-[70vmax] rounded-full blur-[90px]"
        style={{ background: "radial-gradient(closest-side, var(--aurora-1), transparent)" }}
      />
      <div
        className="animate-aurora absolute top-[10vh] -right-[20vw] size-[60vmax] rounded-full blur-[100px] [animation-delay:-12s] [animation-duration:46s]"
        style={{ background: "radial-gradient(closest-side, var(--aurora-2), transparent)" }}
      />
      <div
        className="animate-aurora absolute -bottom-[30vh] left-[20vw] size-[55vmax] rounded-full blur-[110px] [animation-delay:-24s] [animation-duration:52s]"
        style={{ background: "radial-gradient(closest-side, var(--aurora-3), transparent)" }}
      />
      <div className="absolute inset-0 opacity-[0.045] mix-blend-overlay dark:opacity-[0.07]" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
