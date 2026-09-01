import type { Perfil } from '@/data/db/repos/perfil';
import type { MetaDescendente, SerieHecha } from './tipos';

/** Cada bajada quita un 20 % del peso anterior. */
const FACTOR_BAJADA = 0.8;

function redondear(valor: number, incremento: number): number {
  return Math.round(valor / incremento) * incremento;
}

/**
 * Peso propuesto para la siguiente bajada. Es una sugerencia editable: se
 * redondea al escalón real de las mancuernas del usuario, nunca baja del peso
 * mínimo que tiene, y siempre queda por debajo del peso anterior aunque el
 * redondeo empuje hacia arriba.
 */
export function pesoSugeridoBajada(pesoAnterior: number, perfil: Perfil): number {
  const suelo = perfil.mancuernaMinKg;
  if (pesoAnterior <= suelo) return suelo;

  const bruto = redondear(pesoAnterior * FACTOR_BAJADA, perfil.incrementoKg);
  const menorQueElAnterior = Math.min(bruto, pesoAnterior - perfil.incrementoKg);

  return Math.max(suelo, menorQueElAnterior);
}

/** Agrupa por sesión, de la más reciente a la más antigua. */
function porSesion(historial: SerieHecha[]): SerieHecha[][] {
  const grupos = new Map<number, SerieHecha[]>();
  for (const serie of historial) {
    grupos.set(serie.sesionId, [...(grupos.get(serie.sesionId) ?? []), serie]);
  }
  return [...grupos.values()].sort((a, b) =>
    (b[0]?.completadaEn ?? '').localeCompare(a[0]?.completadaEn ?? ''),
  );
}

interface ResumenSesion {
  pesoTope: number;
  repsTotales: number;
  bajadas: number;
}

function resumir(series: SerieHecha[]): ResumenSesion {
  return {
    pesoTope: Math.max(...series.map((s) => s.pesoLogrado ?? 0)),
    repsTotales: series.reduce((suma, s) => suma + s.repsLogradas, 0),
    // La bajada 0 es el tope; las bajadas propiamente dichas son el resto.
    bajadas: Math.max(0, series.length - 1),
  };
}

/**
 * Progresión de una serie descendente. El criterio son las repeticiones
 * totales, que es lo que pidió el usuario, con una salvedad: si el total mejora
 * pero haciendo más bajadas que la vez anterior, el peso no sube y se explica
 * por qué. Añadir una bajada no es entrenar mejor.
 */
export function calcularMetaDescendente(
  historial: SerieHecha[],
  ejercicioId: string,
  perfil: Perfil,
): MetaDescendente {
  const sesiones = porSesion(historial.filter((s) => s.ejercicioId === ejercicioId));
  const ultima = sesiones[0];

  if (!ultima || ultima.length === 0) {
    return {
      pesoTope: null,
      pesoInicialRequerido: true,
      repsTotalesAnteriores: null,
      bajadasAnteriores: null,
      avisoInflado: null,
    };
  }

  const reciente = resumir(ultima);
  const anterior = sesiones[1] ? resumir(sesiones[1]) : null;

  const base: MetaDescendente = {
    pesoTope: reciente.pesoTope,
    pesoInicialRequerido: false,
    repsTotalesAnteriores: reciente.repsTotales,
    bajadasAnteriores: reciente.bajadas,
    avisoInflado: null,
  };

  // Con una sola sesión de historial no hay con qué comparar todavía.
  if (!anterior) return base;

  const mejoro = reciente.repsTotales >= anterior.repsTotales;
  if (!mejoro) return base;

  if (reciente.bajadas > anterior.bajadas) {
    const masBajadas = reciente.bajadas - anterior.bajadas;
    return {
      ...base,
      avisoInflado:
        `Hiciste ${reciente.repsTotales} repeticiones frente a ${anterior.repsTotales}, ` +
        `pero con ${masBajadas} ${masBajadas === 1 ? 'bajada' : 'bajadas'} más. ` +
        'El peso se mantiene.',
    };
  }

  return { ...base, pesoTope: reciente.pesoTope + perfil.incrementoKg };
}
