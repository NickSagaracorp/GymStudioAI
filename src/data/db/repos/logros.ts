import type { Adaptador } from '../adaptador';

/** Lista de hitos ya celebrados. Solo se pregunta si una clave existe. */
export function repoLogros(adaptador: Adaptador) {
  return {
    async marcar(clave: string): Promise<void> {
      await adaptador.ejecutar(
        `INSERT INTO logro (clave, conseguido_en) VALUES (?, ?)
         ON CONFLICT(clave) DO NOTHING`,
        [clave, new Date().toISOString()],
      );
    },

    /** Todas las claves que empiezan por el prefijo, como conjunto. */
    async claves(prefijo: string): Promise<Set<string>> {
      const filas = await adaptador.consultar<{ clave: string }>(
        'SELECT clave FROM logro WHERE clave LIKE ? ESCAPE ?',
        [`${prefijo.replace(/[%_\\]/g, '\\$&')}%`, '\\'],
      );
      return new Set(filas.map((fila) => fila.clave));
    },
  };
}
