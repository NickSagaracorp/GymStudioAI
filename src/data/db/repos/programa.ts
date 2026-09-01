import type { Adaptador } from '../adaptador';
import type { DiaPlan, EjercicioDia, ProgramaPlan, SplitId } from '@/domain/planner/tipos';
import type { Musculo } from '@/data/catalog/tipos';

export interface DiaGuardado extends DiaPlan {
  id: number;
}

export interface ProgramaGuardado {
  id: number;
  plan: ProgramaPlan;
}

interface FilaDia {
  id: number;
  semana: number;
  dia: number;
  nombre: string;
  musculos: string;
}

interface FilaEjercicio {
  dia_programa_id: number;
  orden: number;
  ejercicio_id: string;
  musculo_objetivo: Musculo;
  equipamiento: EjercicioDia['equipamiento'];
  es_ancla: number;
  series: number;
  rep_min: number;
  rep_max: number;
  descanso_seg: number;
}

function aEjercicioDia(fila: FilaEjercicio): EjercicioDia {
  return {
    orden: fila.orden,
    ejercicioId: fila.ejercicio_id,
    musculoObjetivo: fila.musculo_objetivo,
    equipamiento: fila.equipamiento,
    esAncla: fila.es_ancla === 1,
    series: fila.series,
    repMin: fila.rep_min,
    repMax: fila.rep_max,
    descansoSeg: fila.descanso_seg,
  };
}

export function repoPrograma(adaptador: Adaptador) {
  async function diasDe(programaId: number): Promise<DiaGuardado[]> {
    const filasDia = await adaptador.consultar<FilaDia>(
      `SELECT id, semana, dia, nombre, musculos FROM dia_programa
       WHERE programa_id = ? ORDER BY semana, dia`,
      [programaId],
    );
    const filasEjercicio = await adaptador.consultar<FilaEjercicio>(
      `SELECT e.* FROM ejercicio_dia e
       JOIN dia_programa d ON d.id = e.dia_programa_id
       WHERE d.programa_id = ?
       ORDER BY e.dia_programa_id, e.orden`,
      [programaId],
    );

    return filasDia.map((fila) => ({
      id: fila.id,
      semana: fila.semana,
      dia: fila.dia,
      nombre: fila.nombre,
      musculos: JSON.parse(fila.musculos) as Musculo[],
      ejercicios: filasEjercicio
        .filter((e) => e.dia_programa_id === fila.id)
        .map(aEjercicioDia),
    }));
  }

  return {
    diasDe,

    async guardar(plan: ProgramaPlan): Promise<number> {
      await adaptador.ejecutar('UPDATE programa SET activo = 0 WHERE activo = 1');

      const programaId = await adaptador.insertar(
        `INSERT INTO programa (objetivo, semanas, dias_por_semana, split, creado_en, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [plan.objetivo, plan.semanas, plan.diasPorSemana, plan.split, new Date().toISOString()],
      );

      for (const dia of plan.dias) {
        const diaId = await adaptador.insertar(
          `INSERT INTO dia_programa (programa_id, semana, dia, nombre, musculos)
           VALUES (?, ?, ?, ?, ?)`,
          [programaId, dia.semana, dia.dia, dia.nombre, JSON.stringify(dia.musculos)],
        );

        for (const ejercicio of dia.ejercicios) {
          await adaptador.ejecutar(
            `INSERT INTO ejercicio_dia (
               dia_programa_id, orden, ejercicio_id, musculo_objetivo, equipamiento,
               es_ancla, series, rep_min, rep_max, descanso_seg
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              diaId,
              ejercicio.orden,
              ejercicio.ejercicioId,
              ejercicio.musculoObjetivo,
              ejercicio.equipamiento,
              ejercicio.esAncla ? 1 : 0,
              ejercicio.series,
              ejercicio.repMin,
              ejercicio.repMax,
              ejercicio.descansoSeg,
            ],
          );
        }
      }

      return programaId;
    },

    async activo(): Promise<ProgramaGuardado | null> {
      const filas = await adaptador.consultar<{
        id: number;
        objetivo: ProgramaPlan['objetivo'];
        semanas: number;
        dias_por_semana: number;
        split: SplitId;
      }>('SELECT id, objetivo, semanas, dias_por_semana, split FROM programa WHERE activo = 1');

      const fila = filas[0];
      if (!fila) return null;

      return {
        id: fila.id,
        plan: {
          objetivo: fila.objetivo,
          split: fila.split,
          semanas: fila.semanas,
          diasPorSemana: fila.dias_por_semana,
          dias: await diasDe(fila.id),
        },
      };
    },

    async diaDe(programaId: number, semana: number, dia: number): Promise<DiaGuardado | null> {
      const dias = await diasDe(programaId);
      return dias.find((d) => d.semana === semana && d.dia === dia) ?? null;
    },
  };
}
