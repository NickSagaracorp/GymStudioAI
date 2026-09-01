import type { Alimento, Confianza } from './tipos';

const CANTIDAD_MINIMA_G = 1;
const CANTIDAD_MAXIMA_G = 2000;
/** Margen que se tolera entre las calorías declaradas y las que dan los macros. */
const DESVIACION_MAXIMA = 0.25;

export interface ResultadoValidacion {
  alimentos: Alimento[];
  descartados: number;
  avisos: string[];
}

function numeroValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

function confianzaDe(valor: unknown): Confianza | null {
  return valor === 'alta' || valor === 'media' || valor === 'baja' ? valor : null;
}

export function kcalDeMacros(proteinaG: number, carbosG: number, grasaG: number): number {
  return proteinaG * 4 + carbosG * 4 + grasaG * 9;
}

/**
 * Sanea lo que devuelve la IA. Nunca lanza: un modelo puede devolver
 * cualquier cosa, y un análisis a medias es preferible a una pantalla rota.
 */
export function validarAnalisis(bruto: unknown): ResultadoValidacion {
  const avisos: string[] = [];

  if (typeof bruto !== 'object' || bruto === null) {
    return { alimentos: [], descartados: 0, avisos: ['La respuesta no tenía el formato esperado.'] };
  }

  const lista = (bruto as { alimentos?: unknown }).alimentos;
  if (!Array.isArray(lista)) {
    return { alimentos: [], descartados: 0, avisos: ['La respuesta no traía lista de alimentos.'] };
  }

  const alimentos: Alimento[] = [];
  let descartados = 0;

  for (const entrada of lista) {
    if (typeof entrada !== 'object' || entrada === null) {
      descartados += 1;
      continue;
    }

    const bruto = entrada as Record<string, unknown>;
    const nombre = typeof bruto.nombre === 'string' ? bruto.nombre.trim() : '';

    const numeros = {
      cantidadG: bruto.cantidadG,
      kcal: bruto.kcal,
      proteinaG: bruto.proteinaG,
      carbosG: bruto.carbosG,
      azucaresG: bruto.azucaresG ?? 0,
      grasaG: bruto.grasaG,
      grasaSaturadaG: bruto.grasaSaturadaG ?? 0,
      grasaTransG: bruto.grasaTransG ?? 0,
      fibraG: bruto.fibraG ?? 0,
    };

    const todosValidos = Object.values(numeros).every(numeroValido);
    if (nombre === '' || !todosValidos) {
      descartados += 1;
      continue;
    }

    const valores = numeros as Record<keyof typeof numeros, number>;

    if (valores.cantidadG < CANTIDAD_MINIMA_G || valores.cantidadG > CANTIDAD_MAXIMA_G) {
      descartados += 1;
      continue;
    }

    if (valores.azucaresG > valores.carbosG) {
      descartados += 1;
      continue;
    }

    if (valores.grasaSaturadaG + valores.grasaTransG > valores.grasaG) {
      descartados += 1;
      continue;
    }

    // Las calorías mandan solo si cuadran con los macros; si no, se recalculan.
    let kcal = valores.kcal;
    const kcalCalculadas = kcalDeMacros(valores.proteinaG, valores.carbosG, valores.grasaG);
    const referencia = Math.max(kcalCalculadas, 1);

    if (Math.abs(kcal - kcalCalculadas) / referencia > DESVIACION_MAXIMA) {
      kcal = Math.round(kcalCalculadas);
      avisos.push(`Se recalcularon las calorías de ${nombre} a partir de sus macros.`);
    }

    alimentos.push({
      nombre,
      cantidadG: valores.cantidadG,
      kcal,
      proteinaG: valores.proteinaG,
      carbosG: valores.carbosG,
      azucaresG: valores.azucaresG,
      grasaG: valores.grasaG,
      grasaSaturadaG: valores.grasaSaturadaG,
      grasaTransG: valores.grasaTransG,
      fibraG: valores.fibraG,
      confianza: confianzaDe(bruto.confianza),
    });
  }

  if (descartados > 0) {
    avisos.push(
      descartados === 1
        ? 'Se descartó 1 alimento con datos incoherentes.'
        : `Se descartaron ${descartados} alimentos con datos incoherentes.`,
    );
  }

  return { alimentos, descartados, avisos };
}

/** Reescala las macros de un alimento al cambiar la cantidad en gramos. */
export function escalarAlimento(alimento: Alimento, cantidadG: number): Alimento {
  if (alimento.cantidadG <= 0 || cantidadG <= 0) return { ...alimento, cantidadG };

  const factor = cantidadG / alimento.cantidadG;
  const escalar = (valor: number): number => Math.round(valor * factor * 10) / 10;

  return {
    ...alimento,
    cantidadG,
    kcal: Math.round(alimento.kcal * factor),
    proteinaG: escalar(alimento.proteinaG),
    carbosG: escalar(alimento.carbosG),
    azucaresG: escalar(alimento.azucaresG),
    grasaG: escalar(alimento.grasaG),
    grasaSaturadaG: escalar(alimento.grasaSaturadaG),
    grasaTransG: escalar(alimento.grasaTransG),
    fibraG: escalar(alimento.fibraG),
  };
}
