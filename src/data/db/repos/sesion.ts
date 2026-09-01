import type { Adaptador } from '../adaptador';
import type { SerieHecha } from '@/domain/planner/tipos';

export type EstadoSesion = 'borrador' | 'completada' | 'abandonada';

export interface Sesion {
  id: number;
  diaProgramaId: number;
  iniciadaEn: string;
  terminadaEn: string | null;
  estado: EstadoSesion;
}

export interface SerieRegistrada {
  sesionId: number;
  ejercicioId: string;
  numero: number;
  /** 0 en una serie normal; 1, 2, 3... en las bajadas de una descendente. */
  bajada?: number;
  pesoMeta: number | null;
  repsMeta: number;
  pesoLogrado: number | null;
  repsLogradas: number;
}

interface FilaSesion {
  id: number;
  dia_programa_id: number;
  iniciada_en: string;
  terminada_en: string | null;
  estado: EstadoSesion;
}

interface FilaSerie {
  sesion_id: number;
  ejercicio_id: string;
  numero: number;
  bajada: number;
  peso_logrado: number | null;
  reps_logradas: number;
  completada_en: string;
}

function aSesion(fila: FilaSesion): Sesion {
  return {
    id: fila.id,
    diaProgramaId: fila.dia_programa_id,
    iniciadaEn: fila.iniciada_en,
    terminadaEn: fila.terminada_en,
    estado: fila.estado,
  };
}

function aSerieHecha(fila: FilaSerie): SerieHecha {
  return {
    sesionId: fila.sesion_id,
    ejercicioId: fila.ejercicio_id,
    numero: fila.numero,
    bajada: fila.bajada,
    pesoLogrado: fila.peso_logrado,
    repsLogradas: fila.reps_logradas,
    completadaEn: fila.completada_en,
  };
}

const COLUMNAS_SERIE =
  'sesion_id, ejercicio_id, numero, bajada, peso_logrado, reps_logradas, completada_en';

export function repoSesion(adaptador: Adaptador) {
  return {
    async crear(diaProgramaId: number): Promise<number> {
      return adaptador.insertar(
        'INSERT INTO sesion (dia_programa_id, iniciada_en, estado) VALUES (?, ?, ?)',
        [diaProgramaId, new Date().toISOString(), 'borrador'],
      );
    },

    async borradorDe(diaProgramaId: number): Promise<Sesion | null> {
      const filas = await adaptador.consultar<FilaSesion>(
        `SELECT * FROM sesion
         WHERE dia_programa_id = ? AND estado = 'borrador'
         ORDER BY id DESC`,
        [diaProgramaId],
      );
      const fila = filas[0];
      return fila ? aSesion(fila) : null;
    },

    /**
     * Confirmar una serie ya registrada la reescribe: el último valor manda.
     * La bajada entra en la clave, para que corregir una no borre las demás.
     */
    async registrarSerie(serie: SerieRegistrada): Promise<void> {
      const bajada = serie.bajada ?? 0;

      await adaptador.ejecutar(
        `DELETE FROM serie
         WHERE sesion_id = ? AND ejercicio_id = ? AND numero = ? AND bajada = ?`,
        [serie.sesionId, serie.ejercicioId, serie.numero, bajada],
      );
      await adaptador.ejecutar(
        `INSERT INTO serie (
           sesion_id, ejercicio_id, numero, bajada, peso_meta, reps_meta,
           peso_logrado, reps_logradas, completada_en
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serie.sesionId,
          serie.ejercicioId,
          serie.numero,
          bajada,
          serie.pesoMeta,
          serie.repsMeta,
          serie.pesoLogrado,
          serie.repsLogradas,
          new Date().toISOString(),
        ],
      );
    },

    /** Borra una bajada concreta, para cuando el usuario quita una de la lista. */
    async borrarBajada(sesionId: number, ejercicioId: string, bajada: number): Promise<void> {
      await adaptador.ejecutar(
        'DELETE FROM serie WHERE sesion_id = ? AND ejercicio_id = ? AND bajada = ?',
        [sesionId, ejercicioId, bajada],
      );
    },

    /** Series completadas de un ejercicio, de la más reciente a la más antigua. */
    async historialDe(ejercicioId: string, limite = 60): Promise<SerieHecha[]> {
      const filas = await adaptador.consultar<FilaSerie>(
        `SELECT ${COLUMNAS_SERIE} FROM serie
         WHERE ejercicio_id = ? AND completada_en IS NOT NULL
         ORDER BY completada_en DESC, numero DESC, bajada
         LIMIT ?`,
        [ejercicioId, limite],
      );
      return filas.map(aSerieHecha);
    },

    async seriesDe(sesionId: number): Promise<SerieHecha[]> {
      const filas = await adaptador.consultar<FilaSerie>(
        `SELECT ${COLUMNAS_SERIE} FROM serie WHERE sesion_id = ? ORDER BY ejercicio_id, numero, bajada`,
        [sesionId],
      );
      return filas.map(aSerieHecha);
    },

    async completar(sesionId: number): Promise<void> {
      await adaptador.ejecutar(
        "UPDATE sesion SET estado = 'completada', terminada_en = ? WHERE id = ?",
        [new Date().toISOString(), sesionId],
      );
    },

    async abandonarBorradoresAnteriores(limiteIso: string): Promise<void> {
      await adaptador.ejecutar(
        "UPDATE sesion SET estado = 'abandonada' WHERE estado = 'borrador' AND iniciada_en < ?",
        [limiteIso],
      );
    },

    async completadasEntre(desdeIso: string, hastaIso: string): Promise<Sesion[]> {
      const filas = await adaptador.consultar<FilaSesion>(
        `SELECT * FROM sesion
         WHERE estado = 'completada' AND terminada_en >= ? AND terminada_en <= ?
         ORDER BY terminada_en`,
        [desdeIso, hastaIso],
      );
      return filas.map(aSesion);
    },

    async diasCompletados(): Promise<number[]> {
      const filas = await adaptador.consultar<{ dia_programa_id: number }>(
        "SELECT DISTINCT dia_programa_id FROM sesion WHERE estado = 'completada'",
      );
      return filas.map((fila) => fila.dia_programa_id);
    },
  };
}
