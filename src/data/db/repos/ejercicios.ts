import type { Adaptador } from '../adaptador';

/**
 * Preferencias del usuario por ejercicio. De momento solo si se hace en serie
 * descendente, una marca que se recuerda entre sesiones.
 */
export function repoEjercicios(adaptador: Adaptador) {
  return {
    async marcarDescendente(ejercicioId: string, activo: boolean): Promise<void> {
      if (activo) {
        await adaptador.ejecutar(
          `INSERT INTO ejercicio_descendente (ejercicio_id, activado_en) VALUES (?, ?)
           ON CONFLICT(ejercicio_id) DO NOTHING`,
          [ejercicioId, new Date().toISOString()],
        );
      } else {
        await adaptador.ejecutar('DELETE FROM ejercicio_descendente WHERE ejercicio_id = ?', [
          ejercicioId,
        ]);
      }
    },

    async esDescendente(ejercicioId: string): Promise<boolean> {
      const filas = await adaptador.consultar<{ total: number }>(
        'SELECT COUNT(*) AS total FROM ejercicio_descendente WHERE ejercicio_id = ?',
        [ejercicioId],
      );
      return (filas[0]?.total ?? 0) > 0;
    },

    /** Todos los marcados, para no consultar uno a uno al abrir la sesión. */
    async descendentes(): Promise<string[]> {
      const filas = await adaptador.consultar<{ ejercicio_id: string }>(
        'SELECT ejercicio_id FROM ejercicio_descendente',
      );
      return filas.map((fila) => fila.ejercicio_id);
    },
  };
}
