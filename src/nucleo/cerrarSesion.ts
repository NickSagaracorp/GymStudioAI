import type { repoRetos, Reto } from '@/data/db/repos/retos';
import type { repoSesion } from '@/data/db/repos/sesion';
import type { SerieHecha } from '@/domain/planner/tipos';
import { evaluarReto } from '@/domain/planner/retos';

export interface ResumenSesion {
  seriesCompletadas: number;
  volumenKg: number;
  retosLogrados: Reto[];
}

export interface ReposCierre {
  sesiones: ReturnType<typeof repoSesion>;
  retos: ReturnType<typeof repoRetos>;
}

/**
 * Marca la sesión como completada, calcula su resumen y reevalúa los retos
 * activos. Es el único sitio donde un reto cambia de estado.
 */
export async function cerrarSesion(
  repos: ReposCierre,
  sesionId: number,
): Promise<ResumenSesion> {
  await repos.sesiones.completar(sesionId);

  const series = await repos.sesiones.seriesDe(sesionId);
  const volumenKg = series.reduce(
    (suma, serie) => suma + (serie.pesoLogrado ?? 0) * serie.repsLogradas,
    0,
  );

  const completadas = await repos.sesiones.completadasEntre('2000-01-01', '2999-12-31');
  const sesionesCompletadas = completadas.map((s) => ({ terminadaEn: s.terminadaEn ?? '' }));

  const todasLasSeries: SerieHecha[] = [];
  for (const completada of completadas) {
    todasLasSeries.push(...(await repos.sesiones.seriesDe(completada.id)));
  }

  const hoy = new Date().toISOString();
  const logrados: Reto[] = [];

  for (const reto of await repos.retos.activos()) {
    const { valorActual, estado } = evaluarReto(
      reto,
      { sesionesCompletadas, series: todasLasSeries },
      hoy,
    );
    await repos.retos.actualizar(reto.id, valorActual, estado);
    if (estado === 'logrado') logrados.push({ ...reto, valorActual, estado });
  }

  return { seriesCompletadas: series.length, volumenKg, retosLogrados: logrados };
}
