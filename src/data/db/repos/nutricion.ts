import type { Adaptador } from '../adaptador';
import type {
  Alimento,
  Comida,
  Confianza,
  Momento,
  ObjetivoNutricional,
} from '@/domain/nutricion/tipos';

export interface ComidaNueva {
  fecha: string;
  momento: Momento;
  descripcion: string | null;
  fotoUri: string | null;
  origen: 'ia' | 'manual';
  alimentos: Alimento[];
}

interface FilaComida {
  id: number;
  fecha: string;
  momento: Momento;
  descripcion: string | null;
  foto_uri: string | null;
  origen: 'ia' | 'manual';
}

interface FilaAlimento {
  id: number;
  comida_id: number;
  nombre: string;
  cantidad_g: number;
  kcal: number;
  proteina_g: number;
  carbos_g: number;
  azucares_g: number;
  grasa_g: number;
  grasa_saturada_g: number;
  grasa_trans_g: number;
  fibra_g: number;
  confianza: Confianza | null;
}

function aAlimento(fila: FilaAlimento): Alimento {
  return {
    nombre: fila.nombre,
    cantidadG: fila.cantidad_g,
    kcal: fila.kcal,
    proteinaG: fila.proteina_g,
    carbosG: fila.carbos_g,
    azucaresG: fila.azucares_g,
    grasaG: fila.grasa_g,
    grasaSaturadaG: fila.grasa_saturada_g,
    grasaTransG: fila.grasa_trans_g,
    fibraG: fila.fibra_g,
    confianza: fila.confianza,
  };
}

interface FilaObjetivo {
  kcal: number;
  proteina_g: number;
  carbos_g: number;
  grasa_g: number;
  fibra_g: number;
  tope_azucares_g: number;
  tope_saturada_g: number;
  ajuste_manual: number;
}

export function repoNutricion(adaptador: Adaptador) {
  async function alimentosDe(comidaIds: number[]): Promise<FilaAlimento[]> {
    if (comidaIds.length === 0) return [];
    const huecos = comidaIds.map(() => '?').join(', ');
    return adaptador.consultar<FilaAlimento>(
      `SELECT * FROM alimento WHERE comida_id IN (${huecos}) ORDER BY id`,
      comidaIds,
    );
  }

  return {
    async guardarComida(comida: ComidaNueva): Promise<number> {
      const comidaId = await adaptador.insertar(
        `INSERT INTO comida (fecha, momento, descripcion, foto_uri, origen, creada_en)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          comida.fecha,
          comida.momento,
          comida.descripcion,
          comida.fotoUri,
          comida.origen,
          new Date().toISOString(),
        ],
      );

      for (const alimento of comida.alimentos) {
        await adaptador.ejecutar(
          `INSERT INTO alimento (
             comida_id, nombre, cantidad_g, kcal, proteina_g, carbos_g, azucares_g,
             grasa_g, grasa_saturada_g, grasa_trans_g, fibra_g, confianza
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            comidaId,
            alimento.nombre,
            alimento.cantidadG,
            alimento.kcal,
            alimento.proteinaG,
            alimento.carbosG,
            alimento.azucaresG,
            alimento.grasaG,
            alimento.grasaSaturadaG,
            alimento.grasaTransG,
            alimento.fibraG,
            alimento.confianza,
          ],
        );
      }

      return comidaId;
    },

    async comidasDe(fecha: string): Promise<Comida[]> {
      const filas = await adaptador.consultar<FilaComida>(
        'SELECT * FROM comida WHERE fecha = ? ORDER BY creada_en',
        [fecha],
      );

      const alimentos = await alimentosDe(filas.map((f) => f.id));

      return filas.map((fila) => ({
        id: fila.id,
        fecha: fila.fecha,
        momento: fila.momento,
        descripcion: fila.descripcion,
        fotoUri: fila.foto_uri,
        origen: fila.origen,
        alimentos: alimentos.filter((a) => a.comida_id === fila.id).map(aAlimento),
      }));
    },

    async borrarComida(comidaId: number): Promise<void> {
      await adaptador.ejecutar('DELETE FROM comida WHERE id = ?', [comidaId]);
    },

    /** Reemplaza los alimentos de una comida por los que se le pasen. */
    async reemplazarAlimentos(comidaId: number, alimentos: Alimento[]): Promise<void> {
      await adaptador.ejecutar('DELETE FROM alimento WHERE comida_id = ?', [comidaId]);
      for (const alimento of alimentos) {
        await adaptador.ejecutar(
          `INSERT INTO alimento (
             comida_id, nombre, cantidad_g, kcal, proteina_g, carbos_g, azucares_g,
             grasa_g, grasa_saturada_g, grasa_trans_g, fibra_g, confianza
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            comidaId,
            alimento.nombre,
            alimento.cantidadG,
            alimento.kcal,
            alimento.proteinaG,
            alimento.carbosG,
            alimento.azucaresG,
            alimento.grasaG,
            alimento.grasaSaturadaG,
            alimento.grasaTransG,
            alimento.fibraG,
            alimento.confianza,
          ],
        );
      }
    },

    async guardarObjetivo(objetivo: ObjetivoNutricional): Promise<void> {
      await adaptador.ejecutar(
        `INSERT INTO objetivo_nutricional (
           id, kcal, proteina_g, carbos_g, grasa_g, fibra_g,
           tope_azucares_g, tope_saturada_g, ajuste_manual, calculado_en
         ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           kcal = excluded.kcal,
           proteina_g = excluded.proteina_g,
           carbos_g = excluded.carbos_g,
           grasa_g = excluded.grasa_g,
           fibra_g = excluded.fibra_g,
           tope_azucares_g = excluded.tope_azucares_g,
           tope_saturada_g = excluded.tope_saturada_g,
           ajuste_manual = excluded.ajuste_manual,
           calculado_en = excluded.calculado_en`,
        [
          objetivo.kcal,
          objetivo.proteinaG,
          objetivo.carbosG,
          objetivo.grasaG,
          objetivo.fibraG,
          objetivo.topeAzucaresG,
          objetivo.topeSaturadaG,
          objetivo.ajusteManual ? 1 : 0,
          new Date().toISOString(),
        ],
      );
    },

    async objetivo(): Promise<ObjetivoNutricional | null> {
      const filas = await adaptador.consultar<FilaObjetivo>(
        'SELECT * FROM objetivo_nutricional WHERE id = 1',
      );
      const fila = filas[0];
      if (!fila) return null;

      return {
        kcal: fila.kcal,
        proteinaG: fila.proteina_g,
        carbosG: fila.carbos_g,
        grasaG: fila.grasa_g,
        fibraG: fila.fibra_g,
        topeAzucaresG: fila.tope_azucares_g,
        topeSaturadaG: fila.tope_saturada_g,
        ajusteManual: fila.ajuste_manual === 1,
      };
    },

    /** Fotos de comidas anteriores a una fecha, para el borrado periódico. */
    async fotosAnterioresA(fecha: string): Promise<string[]> {
      const filas = await adaptador.consultar<{ foto_uri: string }>(
        'SELECT foto_uri FROM comida WHERE fecha < ? AND foto_uri IS NOT NULL',
        [fecha],
      );
      return filas.map((fila) => fila.foto_uri);
    },

    async olvidarFotosAnterioresA(fecha: string): Promise<void> {
      await adaptador.ejecutar('UPDATE comida SET foto_uri = NULL WHERE fecha < ?', [fecha]);
    },
  };
}
