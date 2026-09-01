import type { Musculo } from '@/data/catalog/tipos';
import type { SplitId } from './tipos';

export interface PlantillaDia {
  nombre: string;
  musculos: Musculo[];
}

export interface Split {
  id: SplitId;
  dias: PlantillaDia[];
}

const EMPUJE: PlantillaDia = { nombre: 'Empuje', musculos: ['pectorals', 'delts', 'triceps'] };
const TIRON: PlantillaDia = { nombre: 'Tirón', musculos: ['lats', 'upper-back', 'biceps'] };
const PIERNA: PlantillaDia = {
  nombre: 'Pierna',
  musculos: ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
};

const SPLITS: Record<number, Split> = {
  2: {
    id: 'fullbody2',
    dias: [
      {
        nombre: 'Cuerpo completo A',
        musculos: ['pectorals', 'upper-back', 'quads', 'delts', 'abs'],
      },
      {
        nombre: 'Cuerpo completo B',
        musculos: ['lats', 'glutes', 'hamstrings', 'biceps', 'triceps'],
      },
    ],
  },
  3: { id: 'ppl3', dias: [EMPUJE, TIRON, PIERNA] },
  4: {
    id: 'torso_pierna4',
    dias: [
      { nombre: 'Torso A', musculos: ['pectorals', 'upper-back', 'delts'] },
      { nombre: 'Pierna A', musculos: ['quads', 'glutes', 'calves'] },
      { nombre: 'Torso B', musculos: ['lats', 'pectorals', 'biceps', 'triceps'] },
      { nombre: 'Pierna B', musculos: ['hamstrings', 'glutes', 'abs'] },
    ],
  },
  5: {
    id: 'split5',
    dias: [
      { nombre: 'Pecho y tríceps', musculos: ['pectorals', 'triceps'] },
      { nombre: 'Espalda y bíceps', musculos: ['lats', 'upper-back', 'biceps'] },
      { nombre: 'Pierna', musculos: ['quads', 'glutes', 'hamstrings', 'calves'] },
      { nombre: 'Hombro y trapecio', musculos: ['delts', 'traps'] },
      { nombre: 'Brazos y core', musculos: ['biceps', 'triceps', 'abs'] },
    ],
  },
  6: { id: 'ppl6', dias: [EMPUJE, TIRON, PIERNA, EMPUJE, TIRON, PIERNA] },
};

export function splitPara(diasPorSemana: number): Split {
  const split = SPLITS[diasPorSemana];
  if (!split) throw new Error(`Días por semana no soportados: ${diasPorSemana}`);
  return split;
}
