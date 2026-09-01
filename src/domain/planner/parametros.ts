import type { Equipamiento, Musculo } from '@/data/catalog/tipos';
import type { Nivel, Objetivo } from '@/data/db/repos/perfil';

export interface ParametrosObjetivo {
  repMin: number;
  repMax: number;
  repMinCorporal: number;
  repMaxCorporal: number;
  seriesGrande: number;
  seriesPequeno: number;
  descansoSeg: number;
}

export const PARAMETROS: Record<Objetivo, ParametrosObjetivo> = {
  volumen: {
    repMin: 8,
    repMax: 12,
    repMinCorporal: 12,
    repMaxCorporal: 18,
    seriesGrande: 14,
    seriesPequeno: 9,
    descansoSeg: 90,
  },
  definicion: {
    repMin: 12,
    repMax: 15,
    repMinCorporal: 18,
    repMaxCorporal: 25,
    seriesGrande: 14,
    seriesPequeno: 9,
    descansoSeg: 60,
  },
  fuerza: {
    repMin: 4,
    repMax: 6,
    repMinCorporal: 8,
    repMaxCorporal: 12,
    seriesGrande: 10,
    seriesPequeno: 6,
    descansoSeg: 150,
  },
};

const GRANDES: readonly Musculo[] = [
  'pectorals',
  'lats',
  'upper-back',
  'quads',
  'glutes',
  'hamstrings',
  'delts',
];

export const FACTOR_NIVEL: Record<Nivel, number> = {
  principiante: 0.75,
  intermedio: 1,
  avanzado: 1.25,
};

export function esGrande(musculo: Musculo): boolean {
  return GRANDES.includes(musculo);
}

export function seriesSemanales(musculo: Musculo, objetivo: Objetivo, nivel: Nivel): number {
  const parametros = PARAMETROS[objetivo];
  const base = esGrande(musculo) ? parametros.seriesGrande : parametros.seriesPequeno;
  return Math.round(base * FACTOR_NIVEL[nivel]);
}

/**
 * Los ejercicios de peso corporal usan un rango un 50% mayor: no se les puede
 * añadir carga, así que la única palanca de intensidad son las repeticiones.
 */
export function rangoReps(
  equipamiento: Equipamiento,
  objetivo: Objetivo,
): { repMin: number; repMax: number } {
  const parametros = PARAMETROS[objetivo];
  return equipamiento === 'bodyweight'
    ? { repMin: parametros.repMinCorporal, repMax: parametros.repMaxCorporal }
    : { repMin: parametros.repMin, repMax: parametros.repMax };
}
