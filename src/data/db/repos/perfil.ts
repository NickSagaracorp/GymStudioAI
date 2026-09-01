import type { Adaptador } from '../adaptador';
import type { NivelActividad } from '@/domain/nutricion/tipos';

export type Nivel = 'principiante' | 'intermedio' | 'avanzado';
export type Objetivo = 'volumen' | 'definicion' | 'fuerza';

export interface Perfil {
  nombre: string;
  sexo: 'hombre' | 'mujer' | 'otro';
  fechaNac: string;
  alturaCm: number;
  nivel: Nivel;
  objetivo: Objetivo;
  diasPorSemana: number;
  mancuernaMinKg: number;
  mancuernaMaxKg: number;
  /** Salto real entre mancuernas disponibles. Marca el escalón de progresión. */
  incrementoKg: number;
  tieneBanco: boolean;
  tieneBarraDominadas: boolean;
  /** 0 = domingo, 6 = sábado. */
  diaMedicion: number;
  nivelActividad: NivelActividad;
}

interface FilaPerfil {
  nombre: string;
  sexo: Perfil['sexo'];
  fecha_nac: string;
  altura_cm: number;
  nivel: Nivel;
  objetivo: Objetivo;
  dias_por_semana: number;
  mancuerna_min_kg: number;
  mancuerna_max_kg: number;
  incremento_kg: number;
  tiene_banco: number;
  tiene_barra_dominadas: number;
  dia_medicion: number;
  nivel_actividad: NivelActividad | null;
}

export function repoPerfil(adaptador: Adaptador) {
  return {
    async obtener(): Promise<Perfil | null> {
      const filas = await adaptador.consultar<FilaPerfil>('SELECT * FROM perfil WHERE id = 1');
      const fila = filas[0];
      if (!fila) return null;

      return {
        nombre: fila.nombre,
        sexo: fila.sexo,
        fechaNac: fila.fecha_nac,
        alturaCm: fila.altura_cm,
        nivel: fila.nivel,
        objetivo: fila.objetivo,
        diasPorSemana: fila.dias_por_semana,
        mancuernaMinKg: fila.mancuerna_min_kg,
        mancuernaMaxKg: fila.mancuerna_max_kg,
        incrementoKg: fila.incremento_kg,
        tieneBanco: fila.tiene_banco === 1,
        tieneBarraDominadas: fila.tiene_barra_dominadas === 1,
        diaMedicion: fila.dia_medicion,
        nivelActividad: fila.nivel_actividad ?? 'moderado',
      };
    },

    async guardar(perfil: Perfil): Promise<void> {
      await adaptador.ejecutar(
        `INSERT INTO perfil (
           id, nombre, sexo, fecha_nac, altura_cm, nivel, objetivo, dias_por_semana,
           mancuerna_min_kg, mancuerna_max_kg, incremento_kg, tiene_banco,
           tiene_barra_dominadas, dia_medicion, nivel_actividad, creado_en
         ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           nombre = excluded.nombre,
           sexo = excluded.sexo,
           fecha_nac = excluded.fecha_nac,
           altura_cm = excluded.altura_cm,
           nivel = excluded.nivel,
           objetivo = excluded.objetivo,
           dias_por_semana = excluded.dias_por_semana,
           mancuerna_min_kg = excluded.mancuerna_min_kg,
           mancuerna_max_kg = excluded.mancuerna_max_kg,
           incremento_kg = excluded.incremento_kg,
           tiene_banco = excluded.tiene_banco,
           tiene_barra_dominadas = excluded.tiene_barra_dominadas,
           dia_medicion = excluded.dia_medicion,
           nivel_actividad = excluded.nivel_actividad`,
        [
          perfil.nombre,
          perfil.sexo,
          perfil.fechaNac,
          perfil.alturaCm,
          perfil.nivel,
          perfil.objetivo,
          perfil.diasPorSemana,
          perfil.mancuernaMinKg,
          perfil.mancuernaMaxKg,
          perfil.incrementoKg,
          perfil.tieneBanco ? 1 : 0,
          perfil.tieneBarraDominadas ? 1 : 0,
          perfil.diaMedicion,
          perfil.nivelActividad,
          new Date().toISOString(),
        ],
      );
    },
  };
}
