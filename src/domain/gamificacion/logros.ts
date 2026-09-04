import type { Musculo } from '@/data/catalog/tipos';

export type Hito =
  | { tipo: 'ejercicio'; clave: string; ejercicioId: string }
  | { tipo: 'musculo'; clave: string; musculo: Musculo }
  | { tipo: 'dia'; clave: string };

export interface EstadoEjercicio {
  ejercicioId: string;
  musculoObjetivo: Musculo;
  completo: boolean;
}

/**
 * Un ejercicio normal está completo cuando tiene todas sus series. Una
 * descendente, cuando tiene el tope y al menos una bajada: son dos filas,
 * porque el tope se guarda como bajada 0.
 */
export function ejercicioCompleto(entrada: {
  esDescendente: boolean;
  seriesRegistradas: number;
  seriesMeta: number;
  bajadasRegistradas: number;
}): boolean {
  return entrada.esDescendente
    ? entrada.bajadasRegistradas >= 2
    : entrada.seriesMeta > 0 && entrada.seriesRegistradas >= entrada.seriesMeta;
}

export function claveEjercicio(sesionId: number, ejercicioId: string): string {
  return `sesion:${sesionId}:ejercicio:${ejercicioId}`;
}

export function claveMusculo(sesionId: number, musculo: Musculo): string {
  return `sesion:${sesionId}:musculo:${musculo}`;
}

export function claveDia(sesionId: number): string {
  return `sesion:${sesionId}:dia`;
}

export function prefijoSesion(sesionId: number): string {
  return `sesion:${sesionId}:`;
}

/**
 * Hitos alcanzados que aún no se han celebrado, de menor a mayor: primero el
 * ejercicio, luego el músculo, luego el día. La interfaz muestra el mayor.
 */
export function hitosNuevos(
  sesionId: number,
  estados: EstadoEjercicio[],
  yaCelebrados: Set<string>,
): Hito[] {
  const hitos: Hito[] = [];

  for (const estado of estados) {
    if (!estado.completo) continue;
    const clave = claveEjercicio(sesionId, estado.ejercicioId);
    if (!yaCelebrados.has(clave)) {
      hitos.push({ tipo: 'ejercicio', clave, ejercicioId: estado.ejercicioId });
    }
  }

  for (const musculo of [...new Set(estados.map((e) => e.musculoObjetivo))]) {
    const suyos = estados.filter((e) => e.musculoObjetivo === musculo);
    if (!suyos.every((e) => e.completo)) continue;
    const clave = claveMusculo(sesionId, musculo);
    if (!yaCelebrados.has(clave)) hitos.push({ tipo: 'musculo', clave, musculo });
  }

  if (estados.length > 0 && estados.every((e) => e.completo)) {
    const clave = claveDia(sesionId);
    if (!yaCelebrados.has(clave)) hitos.push({ tipo: 'dia', clave });
  }

  return hitos;
}
