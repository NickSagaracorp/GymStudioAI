import type { Adaptador } from '../adaptador';

export type TipoReto = 'sesiones' | 'carga' | 'volumen';
export type EstadoReto = 'activo' | 'logrado' | 'fallido';

export interface Reto {
  id: number;
  titulo: string;
  tipo: TipoReto;
  ejercicioId: string | null;
  metaValor: number;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoReto;
  valorActual: number;
}

export type RetoNuevo = Omit<Reto, 'id' | 'estado' | 'valorActual'>;

interface FilaReto {
  id: number;
  titulo: string;
  tipo: TipoReto;
  ejercicio_id: string | null;
  meta_valor: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoReto;
  valor_actual: number | null;
}

function aReto(fila: FilaReto): Reto {
  return {
    id: fila.id,
    titulo: fila.titulo,
    tipo: fila.tipo,
    ejercicioId: fila.ejercicio_id,
    metaValor: fila.meta_valor,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    estado: fila.estado,
    valorActual: fila.valor_actual ?? 0,
  };
}

const SELECCION = `SELECT r.*, p.valor_actual FROM reto r
  LEFT JOIN progreso_reto p ON p.reto_id = r.id`;

export function repoRetos(adaptador: Adaptador) {
  return {
    async crear(reto: RetoNuevo): Promise<number> {
      const retoId = await adaptador.insertar(
        `INSERT INTO reto (titulo, tipo, ejercicio_id, meta_valor, fecha_inicio, fecha_fin, estado)
         VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
        [
          reto.titulo,
          reto.tipo,
          reto.ejercicioId,
          reto.metaValor,
          reto.fechaInicio,
          reto.fechaFin,
        ],
      );
      await adaptador.ejecutar(
        'INSERT INTO progreso_reto (reto_id, valor_actual, actualizado_en) VALUES (?, 0, ?)',
        [retoId, new Date().toISOString()],
      );
      return retoId;
    },

    async activos(): Promise<Reto[]> {
      const filas = await adaptador.consultar<FilaReto>(
        `${SELECCION} WHERE r.estado = 'activo' ORDER BY r.fecha_fin`,
      );
      return filas.map(aReto);
    },

    async todos(): Promise<Reto[]> {
      const filas = await adaptador.consultar<FilaReto>(`${SELECCION} ORDER BY r.fecha_fin DESC`);
      return filas.map(aReto);
    },

    async actualizar(retoId: number, valorActual: number, estado: EstadoReto): Promise<void> {
      await adaptador.ejecutar(
        'UPDATE progreso_reto SET valor_actual = ?, actualizado_en = ? WHERE reto_id = ?',
        [valorActual, new Date().toISOString(), retoId],
      );
      await adaptador.ejecutar('UPDATE reto SET estado = ? WHERE id = ?', [estado, retoId]);
    },
  };
}
