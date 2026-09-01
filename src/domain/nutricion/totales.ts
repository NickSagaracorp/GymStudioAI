import type { Alimento, Comida, Macros, Momento, ObjetivoNutricional } from './tipos';
import { MACROS_CERO } from './tipos';

const CAMPOS: (keyof Macros)[] = [
  'kcal',
  'proteinaG',
  'carbosG',
  'azucaresG',
  'grasaG',
  'grasaSaturadaG',
  'grasaTransG',
  'fibraG',
];

export function sumarMacros(a: Macros, b: Macros): Macros {
  const suma = { ...MACROS_CERO };
  for (const campo of CAMPOS) suma[campo] = a[campo] + b[campo];
  return suma;
}

export function sumarAlimentos(alimentos: Alimento[]): Macros {
  return alimentos.reduce<Macros>(sumarMacros, MACROS_CERO);
}

export interface TotalesDia {
  total: Macros;
  porMomento: Record<Momento, Macros>;
}

export function totalesDelDia(comidas: Comida[]): TotalesDia {
  const porMomento: Record<Momento, Macros> = {
    desayuno: { ...MACROS_CERO },
    almuerzo: { ...MACROS_CERO },
    cena: { ...MACROS_CERO },
    snack: { ...MACROS_CERO },
  };

  let total = { ...MACROS_CERO };

  for (const comida of comidas) {
    const macros = sumarAlimentos(comida.alimentos);
    porMomento[comida.momento] = sumarMacros(porMomento[comida.momento], macros);
    total = sumarMacros(total, macros);
  }

  return { total, porMomento };
}

export interface ProgresoMacro {
  consumido: number;
  objetivo: number;
  /** Puede pasar de 100 cuando se supera el objetivo. */
  porcentaje: number;
}

export interface ProgresoDia {
  kcal: ProgresoMacro;
  proteina: ProgresoMacro;
  carbos: ProgresoMacro;
  grasa: ProgresoMacro;
  fibra: ProgresoMacro;
  azucaresExcedidos: boolean;
  saturadaExcedida: boolean;
  /** Cualquier cantidad de grasa trans cuenta como exceso. */
  transExcedida: boolean;
}

function progreso(consumido: number, objetivo: number): ProgresoMacro {
  return {
    consumido,
    objetivo,
    porcentaje: objetivo > 0 ? Math.round((consumido / objetivo) * 100) : 0,
  };
}

export function progresoContra(objetivo: ObjetivoNutricional, total: Macros): ProgresoDia {
  return {
    kcal: progreso(total.kcal, objetivo.kcal),
    proteina: progreso(total.proteinaG, objetivo.proteinaG),
    carbos: progreso(total.carbosG, objetivo.carbosG),
    grasa: progreso(total.grasaG, objetivo.grasaG),
    fibra: progreso(total.fibraG, objetivo.fibraG),
    azucaresExcedidos: total.azucaresG > objetivo.topeAzucaresG,
    saturadaExcedida: total.grasaSaturadaG > objetivo.topeSaturadaG,
    transExcedida: total.grasaTransG > 0,
  };
}
