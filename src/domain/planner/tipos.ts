import type { Equipamiento, Musculo } from '@/data/catalog/tipos';

export type SplitId = 'fullbody2' | 'ppl3' | 'torso_pierna4' | 'split5' | 'ppl6';

export interface EjercicioDia {
  orden: number;
  ejercicioId: string;
  musculoObjetivo: Musculo;
  equipamiento: Equipamiento;
  esAncla: boolean;
  series: number;
  repMin: number;
  repMax: number;
  descansoSeg: number;
}

export interface DiaPlan {
  semana: number;
  dia: number;
  nombre: string;
  musculos: Musculo[];
  ejercicios: EjercicioDia[];
}

export interface ProgramaPlan {
  objetivo: 'volumen' | 'definicion' | 'fuerza';
  split: SplitId;
  semanas: number;
  diasPorSemana: number;
  dias: DiaPlan[];
}

/** Una serie ya registrada, tal y como la devuelve el repositorio de sesiones. */
export interface SerieHecha {
  sesionId: number;
  ejercicioId: string;
  numero: number;
  /** 0 en una serie normal; 1, 2, 3... en las bajadas de una descendente. */
  bajada: number;
  pesoLogrado: number | null;
  repsLogradas: number;
  completadaEn: string;
}

export interface Meta {
  /** null en ejercicios de peso corporal. */
  pesoMeta: number | null;
  repsMeta: number;
  series: number;
  /** true la primera vez: la interfaz debe pedir el peso inicial. */
  pesoInicialRequerido: boolean;
}

/**
 * Meta de una serie descendente. No hay objetivo de repeticiones porque se va
 * al fallo: lo único que se muestra es qué superar.
 */
export interface MetaDescendente {
  /** Peso de arranque. null la primera vez con el ejercicio. */
  pesoTope: number | null;
  pesoInicialRequerido: boolean;
  /** Repeticiones totales de la última sesión, las que hay que batir. */
  repsTotalesAnteriores: number | null;
  bajadasAnteriores: number | null;
  /**
   * Se llenó cuando el total mejoró pero con más bajadas que la vez anterior:
   * el peso no sube y conviene decir por qué.
   */
  avisoInflado: string | null;
}
