import Database from 'better-sqlite3';
import type { Adaptador } from '../adaptador';

/**
 * Adaptador en memoria para las pruebas. Ejecuta el mismo SQL que el de
 * producción, así que los repositorios se prueban contra SQLite de verdad.
 */
export function crearAdaptadorMemoria(): Adaptador {
  const bd = new Database(':memory:');
  bd.pragma('foreign_keys = ON');

  return {
    ejecutar: async (sql, parametros = []) => {
      bd.prepare(sql).run(parametros as never[]);
    },
    consultar: async <T,>(sql: string, parametros: unknown[] = []) =>
      bd.prepare(sql).all(parametros as never[]) as T[],
    insertar: async (sql, parametros = []) =>
      Number(bd.prepare(sql).run(parametros as never[]).lastInsertRowid),
  };
}
