import type { Objetivo } from '@/data/db/repos/perfil';

export const NIVELES_ACTIVIDAD = [
  'sedentario',
  'ligero',
  'moderado',
  'alto',
  'muy_alto',
] as const;

export type NivelActividad = (typeof NIVELES_ACTIVIDAD)[number];

export type Sexo = 'hombre' | 'mujer' | 'otro';

export type Confianza = 'alta' | 'media' | 'baja';

export const MOMENTOS = ['desayuno', 'almuerzo', 'cena', 'snack'] as const;
export type Momento = (typeof MOMENTOS)[number];

/** Lo que aporta un alimento. Todo en gramos salvo las calorías. */
export interface Macros {
  kcal: number;
  proteinaG: number;
  carbosG: number;
  azucaresG: number;
  grasaG: number;
  grasaSaturadaG: number;
  grasaTransG: number;
  fibraG: number;
}

export interface Alimento extends Macros {
  nombre: string;
  cantidadG: number;
  confianza: Confianza | null;
}

export interface Comida {
  id: number;
  fecha: string;
  momento: Momento;
  descripcion: string | null;
  fotoUri: string | null;
  origen: 'ia' | 'manual';
  alimentos: Alimento[];
}

export interface DatosCalculo {
  sexo: Sexo;
  fechaNac: string;
  alturaCm: number;
  pesoKg: number;
  nivelActividad: NivelActividad;
  objetivo: Objetivo;
}

export interface ObjetivoNutricional {
  kcal: number;
  proteinaG: number;
  carbosG: number;
  grasaG: number;
  fibraG: number;
  /** Límites recomendados, no metas que haya que alcanzar. */
  topeAzucaresG: number;
  topeSaturadaG: number;
  ajusteManual: boolean;
}

export const MACROS_CERO: Macros = {
  kcal: 0,
  proteinaG: 0,
  carbosG: 0,
  azucaresG: 0,
  grasaG: 0,
  grasaSaturadaG: 0,
  grasaTransG: 0,
  fibraG: 0,
};
