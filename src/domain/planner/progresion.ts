import type { Perfil } from '@/data/db/repos/perfil';
import type { EjercicioDia, Meta, SerieHecha } from './tipos';

const SERIES_MAXIMAS_CORPORAL = 5;
const FACTOR_BAJADA = 0.9;

/** Agrupa el historial por sesión, de la más reciente a la más antigua. */
function porSesion(historial: SerieHecha[]): SerieHecha[][] {
  const grupos = new Map<number, SerieHecha[]>();
  for (const serie of historial) {
    grupos.set(serie.sesionId, [...(grupos.get(serie.sesionId) ?? []), serie]);
  }
  return [...grupos.values()].sort((a, b) =>
    (b[0]?.completadaEn ?? '').localeCompare(a[0]?.completadaEn ?? ''),
  );
}

function redondear(valor: number, incremento: number): number {
  return Math.max(incremento, Math.round(valor / incremento) * incremento);
}

/**
 * Doble progresión. Con carga: se suben repeticiones dentro del rango y, al
 * tocar el techo en todas las series, sube el peso y las repeticiones vuelven
 * abajo. Sin carga solo se pueden subir repeticiones, así que al llegar al
 * techo se añade una serie.
 */
export function calcularMeta(
  historial: SerieHecha[],
  ejercicio: EjercicioDia,
  perfil: Perfil,
): Meta {
  const sesiones = porSesion(historial.filter((s) => s.ejercicioId === ejercicio.ejercicioId));
  const ultima = sesiones[0];
  const esCorporal = ejercicio.equipamiento === 'bodyweight';

  if (!ultima || ultima.length === 0) {
    return {
      pesoMeta: null,
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: !esCorporal,
    };
  }

  const reps = ultima.map((s) => s.repsLogradas);
  const mejorReps = Math.max(...reps);
  const todasAlTope = reps.length >= ejercicio.series && reps.every((r) => r >= ejercicio.repMax);

  if (esCorporal) {
    return {
      pesoMeta: null,
      repsMeta: todasAlTope ? ejercicio.repMin : Math.min(ejercicio.repMax, mejorReps + 1),
      series: todasAlTope
        ? Math.min(SERIES_MAXIMAS_CORPORAL, ejercicio.series + 1)
        : ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  const pesoAnterior = Math.max(...ultima.map((s) => s.pesoLogrado ?? 0));

  if (todasAlTope) {
    return {
      pesoMeta: pesoAnterior + perfil.incrementoKg,
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  const fallo = (sesion: SerieHecha[] | undefined): boolean =>
    sesion !== undefined && sesion.some((s) => s.repsLogradas < ejercicio.repMin);

  if (fallo(ultima) && fallo(sesiones[1])) {
    return {
      pesoMeta: redondear(pesoAnterior * FACTOR_BAJADA, perfil.incrementoKg),
      repsMeta: ejercicio.repMin,
      series: ejercicio.series,
      pesoInicialRequerido: false,
    };
  }

  return {
    pesoMeta: pesoAnterior,
    repsMeta: Math.min(ejercicio.repMax, mejorReps + 1),
    series: ejercicio.series,
    pesoInicialRequerido: false,
  };
}
