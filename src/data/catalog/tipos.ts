export const MUSCULOS = [
  'abs',
  'biceps',
  'calves',
  'delts',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'pectorals',
  'quads',
  'traps',
  'triceps',
  'upper-back',
] as const;

export type Musculo = (typeof MUSCULOS)[number];

export type Equipamiento = 'dumbbell' | 'bodyweight';

export interface Ejercicio {
  id: string;
  nombre: string;
  musculo: Musculo;
  equipamiento: Equipamiento;
  musculosSecundarios: Musculo[];
  miniatura: string;
  gifUrl: string;
}

export interface Catalogo {
  todos(): Ejercicio[];
  porId(id: string): Ejercicio | undefined;
  porMusculo(musculo: Musculo): Ejercicio[];
  buscar(texto: string): Ejercicio[];
}
