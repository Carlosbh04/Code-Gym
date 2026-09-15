import type { RefObject } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';

interface ResetProgressCardProps {
  resetOpen: boolean;
  resetting: boolean;
  resetError: string | null;
  dialogRef: RefObject<HTMLDivElement>;
  onOpen: () => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ResetProgressCard({
  resetOpen,
  resetting,
  resetError,
  dialogRef,
  onOpen,
  onClose,
  onConfirm,
}: ResetProgressCardProps) {
  return (
    <section aria-labelledby="reset-progress-title" className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <Trash2 className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="reset-progress-title" className="text-lg font-bold text-foreground">Restablecer todo mi progreso</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Elimina todos tus datos de práctica guardados en este dispositivo sin cambiar el tema ni otras preferencias.
          </p>
        </div>
      </div>

      <button type="button" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-destructive/50 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onOpen}>
        Restablecer todo mi progreso
      </button>

      {resetOpen ? (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title" aria-describedby="reset-dialog-description" className="mt-4 rounded-xl border border-destructive/40 bg-background p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <h3 id="reset-dialog-title" className="font-semibold text-foreground">¿Restablecer todo tu progreso?</h3>
              <p id="reset-dialog-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Se eliminarán el progreso por concepto, los intentos, las sesiones completadas y cualquier sesión pendiente de recuperar. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          {resetError ? <p role="alert" className="mt-3 text-sm text-destructive">No se pudo restablecer el progreso: {resetError}</p> : null}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={resetting} onClick={onClose} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60">Cancelar</button>
            <button type="button" disabled={resetting} onClick={() => { void onConfirm(); }} className="min-h-11 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-60">
              {resetting ? 'Restableciendo…' : 'Sí, restablecer todo'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
