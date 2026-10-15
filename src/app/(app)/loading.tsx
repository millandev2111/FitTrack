// Se muestra al instante al cambiar de pantalla, mientras llegan los datos.
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-3.5" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-40 rounded-xl bg-surface-2" />
      <div className="h-28 rounded-[22px] bg-surface" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-24 rounded-[22px] bg-surface" />
        <div className="h-24 rounded-[22px] bg-surface" />
      </div>
      <div className="h-36 rounded-[22px] bg-surface" />
      <div className="h-20 rounded-[22px] bg-surface" />
    </div>
  );
}
