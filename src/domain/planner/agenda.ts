import type { DiaPlan } from './tipos';

const SEGUNDOS_POR_SERIE = 45;

/** El primer día del programa que aún no se ha completado. */
export function siguienteDia<T extends DiaPlan & { id: number }>(
  dias: T[],
  idsCompletados: number[],
): T | null {
  const completados = new Set(idsCompletados);
  const ordenados = [...dias].sort((a, b) => a.semana - b.semana || a.dia - b.dia);
  return ordenados.find((dia) => !completados.has(dia.id)) ?? null;
}

export function duracionEstimadaMin(dia: DiaPlan): number {
  const segundos = dia.ejercicios.reduce(
    (suma, ejercicio) => suma + ejercicio.series * (SEGUNDOS_POR_SERIE + ejercicio.descansoSeg),
    0,
  );
  return Math.round(segundos / 60);
}
