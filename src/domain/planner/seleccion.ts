import type { Ejercicio, Musculo } from '@/data/catalog/tipos';
import type { Perfil } from '@/data/db/repos/perfil';

export interface Ancla {
  principal: string;
  alternativa?: string;
  requiere?: 'banco' | 'barra';
}

/**
 * El ancla es el ejercicio que se repite todo el mesociclo, y por eso es el
 * único sobre el que la progresión de carga tiene sentido. Se prefiere siempre
 * la variante con mancuerna cuando el catálogo la tiene.
 */
export const ANCLAS: Record<Musculo, Ancla> = {
  pectorals: {
    principal: 'pectorals/dumbbell-bench-press',
    alternativa: 'pectorals/push-up',
    requiere: 'banco',
  },
  lats: {
    principal: 'lats/chin-up',
    alternativa: 'upper-back/inverted-row-bent-knees',
    requiere: 'barra',
  },
  'upper-back': { principal: 'upper-back/dumbbell-bent-over-row' },
  delts: { principal: 'delts/dumbbell-arnold-press' },
  triceps: { principal: 'triceps/dumbbell-close-grip-press' },
  biceps: { principal: 'biceps/dumbbell-biceps-curl' },
  forearms: { principal: 'forearms/dumbbell-reverse-wrist-curl' },
  quads: { principal: 'quads/dumbbell-goblet-squat' },
  glutes: { principal: 'glutes/dumbbell-romanian-deadlift' },
  hamstrings: { principal: 'hamstrings/dumbbell-lying-femoral' },
  calves: { principal: 'calves/dumbbell-standing-calf-raise' },
  abs: { principal: 'abs/crunch-floor' },
  traps: { principal: 'traps/dumbbell-shrug' },
};

export function anclaPara(musculo: Musculo, perfil: Perfil): string {
  const ancla = ANCLAS[musculo];
  if (ancla.requiere === 'banco' && !perfil.tieneBanco && ancla.alternativa) {
    return ancla.alternativa;
  }
  if (ancla.requiere === 'barra' && !perfil.tieneBarraDominadas && ancla.alternativa) {
    return ancla.alternativa;
  }
  return ancla.principal;
}

/** Hash de cadena a entero de 32 bits (xmur3). */
function semillaNumerica(texto: string): number {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h ^= h >>> 16;
  return h >>> 0;
}

/** Generador pseudoaleatorio determinista (mulberry32). */
function generador(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function barajarDeterminista<T>(items: T[], semilla: string): T[] {
  const copia = [...items];
  const aleatorio = generador(semillaNumerica(semilla));
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    const temporal = copia[i] as T;
    copia[i] = copia[j] as T;
    copia[j] = temporal;
  }
  return copia;
}

export function accesoriosPara(opciones: {
  candidatos: Ejercicio[];
  semilla: string;
  excluir: string[];
  cantidad: number;
}): Ejercicio[] {
  const { candidatos, semilla, excluir, cantidad } = opciones;
  if (candidatos.length === 0 || cantidad <= 0) return [];

  const barajados = barajarDeterminista(candidatos, semilla);
  const excluidos = new Set(excluir);
  const libres = barajados.filter((e) => !excluidos.has(e.id));

  if (libres.length >= cantidad) return libres.slice(0, cantidad);

  // Músculos con muy pocos ejercicios (trapecio, isquios) obligan a reutilizar.
  const relleno = barajados.filter((e) => !libres.includes(e));
  return [...libres, ...relleno].slice(0, cantidad);
}
