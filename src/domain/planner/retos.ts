import type { EstadoReto, TipoReto } from '@/data/db/repos/retos';
import type { SerieHecha } from './tipos';

export interface RetoEvaluable {
  tipo: TipoReto;
  ejercicioId: string | null;
  metaValor: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface DatosReto {
  sesionesCompletadas: { terminadaEn: string }[];
  series: SerieHecha[];
}

/** Recorta un ISO a su parte de fecha para comparar días completos. */
function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

function dentroDelRango(iso: string, reto: RetoEvaluable): boolean {
  const dia = soloFecha(iso);
  return dia >= reto.fechaInicio && dia <= reto.fechaFin;
}

export function evaluarReto(
  reto: RetoEvaluable,
  datos: DatosReto,
  hoy: string,
): { valorActual: number; estado: EstadoReto } {
  let valorActual = 0;

  if (reto.tipo === 'sesiones') {
    valorActual = datos.sesionesCompletadas.filter((s) =>
      dentroDelRango(s.terminadaEn, reto),
    ).length;
  } else {
    const series = datos.series.filter(
      (s) =>
        dentroDelRango(s.completadaEn, reto) &&
        (reto.ejercicioId === null || s.ejercicioId === reto.ejercicioId),
    );

    valorActual =
      reto.tipo === 'carga'
        ? series.reduce((maximo, s) => Math.max(maximo, s.pesoLogrado ?? 0), 0)
        : series.reduce((suma, s) => suma + (s.pesoLogrado ?? 0) * s.repsLogradas, 0);
  }

  const vencido = soloFecha(hoy) > reto.fechaFin;
  const estado: EstadoReto =
    valorActual >= reto.metaValor ? 'logrado' : vencido ? 'fallido' : 'activo';

  return { valorActual, estado };
}
