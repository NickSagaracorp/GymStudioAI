import type { Musculo } from '@/data/catalog/tipos';

/** El catálogo trae los músculos en inglés; la interfaz va siempre en español. */
export const NOMBRE_MUSCULO: Record<Musculo, string> = {
  abs: 'Abdomen',
  biceps: 'Bíceps',
  calves: 'Gemelos',
  delts: 'Hombros',
  forearms: 'Antebrazos',
  glutes: 'Glúteos',
  hamstrings: 'Isquios',
  lats: 'Dorsales',
  pectorals: 'Pecho',
  quads: 'Cuádriceps',
  traps: 'Trapecio',
  triceps: 'Tríceps',
  'upper-back': 'Espalda alta',
};

export function nombreMusculo(musculo: Musculo): string {
  return NOMBRE_MUSCULO[musculo];
}
