/**
 * Frontera entre los repositorios y SQLite. Existe para que la capa de datos se
 * pueda probar en Node con better-sqlite3, sin simulador ni expo-sqlite.
 */
export interface Adaptador {
  ejecutar(sql: string, parametros?: unknown[]): Promise<void>;
  consultar<T>(sql: string, parametros?: unknown[]): Promise<T[]>;
  insertar(sql: string, parametros?: unknown[]): Promise<number>;
}

export async function abrirAdaptadorExpo(nombre = 'gymstudio.db'): Promise<Adaptador> {
  const SQLite = await import('expo-sqlite');
  const bd = await SQLite.openDatabaseAsync(nombre);
  await bd.execAsync('PRAGMA foreign_keys = ON');

  return {
    ejecutar: async (sql, parametros = []) => {
      await bd.runAsync(sql, parametros as never[]);
    },
    consultar: async <T,>(sql: string, parametros: unknown[] = []) =>
      bd.getAllAsync<T>(sql, parametros as never[]),
    insertar: async (sql, parametros = []) => {
      const resultado = await bd.runAsync(sql, parametros as never[]);
      return resultado.lastInsertRowId;
    },
  };
}
