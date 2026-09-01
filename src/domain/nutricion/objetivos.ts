import type { Objetivo } from '@/data/db/repos/perfil';
import type { DatosCalculo, NivelActividad, ObjetivoNutricional, Sexo } from './tipos';

const KCAL_POR_GRAMO = { proteina: 4, carbos: 4, grasa: 9 } as const;

export const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
  muy_alto: 1.9,
};

/** Superávit moderado, déficit sostenible o mantenimiento. */
export const AJUSTE_OBJETIVO: Record<Objetivo, number> = {
  volumen: 1.1,
  definicion: 0.8,
  fuerza: 1,
};

const PROTEINA_POR_KG: Record<Objetivo, number> = {
  volumen: 2,
  definicion: 2.2,
  fuerza: 2,
};

const PORCENTAJE_GRASA = 0.25;
const SUELO_GRASA_POR_KG = 0.8;
const FIBRA_POR_1000_KCAL = 14;
const TOPE_PORCENTAJE = 0.1;

export function edadEn(fechaNac: string, hoy: Date = new Date()): number {
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const mes = hoy.getMonth() - nacimiento.getMonth();
  const cumpleAunPorPasar = mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate());
  if (cumpleAunPorPasar) edad -= 1;

  return edad;
}

/** Mifflin-St Jeor. Para `otro` se toma la media de las dos fórmulas. */
export function metabolismoBasal(datos: DatosCalculo, hoy?: Date): number {
  const edad = edadEn(datos.fechaNac, hoy);
  const base = 10 * datos.pesoKg + 6.25 * datos.alturaCm - 5 * edad;

  const porSexo: Record<Sexo, number> = {
    hombre: base + 5,
    mujer: base - 161,
    otro: base + (5 - 161) / 2,
  };

  return porSexo[datos.sexo];
}

export function gastoTotal(datos: DatosCalculo, hoy?: Date): number {
  return metabolismoBasal(datos, hoy) * FACTOR_ACTIVIDAD[datos.nivelActividad];
}

export function caloriasObjetivo(datos: DatosCalculo, hoy?: Date): number {
  return Math.round(gastoTotal(datos, hoy) * AJUSTE_OBJETIVO[datos.objetivo]);
}

/**
 * Reparte las calorías en macros. La proteína se fija por peso corporal, la
 * grasa por porcentaje con un suelo por kilo, y los carbohidratos se quedan
 * con lo que sobra.
 */
export function repartirMacros(
  kcal: number,
  pesoKg: number,
  objetivo: Objetivo,
): Pick<ObjetivoNutricional, 'proteinaG' | 'carbosG' | 'grasaG' | 'fibraG'> {
  const proteinaG = Math.round(pesoKg * PROTEINA_POR_KG[objetivo]);

  const grasaPorPorcentaje = (kcal * PORCENTAJE_GRASA) / KCAL_POR_GRAMO.grasa;
  const grasaG = Math.round(Math.max(grasaPorPorcentaje, pesoKg * SUELO_GRASA_POR_KG));

  const kcalRestantes =
    kcal - proteinaG * KCAL_POR_GRAMO.proteina - grasaG * KCAL_POR_GRAMO.grasa;
  const carbosG = Math.max(0, Math.round(kcalRestantes / KCAL_POR_GRAMO.carbos));

  const fibraG = Math.round((kcal / 1000) * FIBRA_POR_1000_KCAL);

  return { proteinaG, carbosG, grasaG, fibraG };
}

export function calcularObjetivo(datos: DatosCalculo, hoy?: Date): ObjetivoNutricional {
  const kcal = caloriasObjetivo(datos, hoy);

  return {
    kcal,
    ...repartirMacros(kcal, datos.pesoKg, datos.objetivo),
    topeAzucaresG: Math.round((kcal * TOPE_PORCENTAJE) / KCAL_POR_GRAMO.carbos),
    topeSaturadaG: Math.round((kcal * TOPE_PORCENTAJE) / KCAL_POR_GRAMO.grasa),
    ajusteManual: false,
  };
}

/** El usuario fija las calorías a mano y los macros se reparten sobre su cifra. */
export function objetivoConCalorias(
  kcal: number,
  pesoKg: number,
  objetivo: Objetivo,
): ObjetivoNutricional {
  return {
    kcal,
    ...repartirMacros(kcal, pesoKg, objetivo),
    topeAzucaresG: Math.round((kcal * TOPE_PORCENTAJE) / KCAL_POR_GRAMO.carbos),
    topeSaturadaG: Math.round((kcal * TOPE_PORCENTAJE) / KCAL_POR_GRAMO.grasa),
    ajusteManual: true,
  };
}
