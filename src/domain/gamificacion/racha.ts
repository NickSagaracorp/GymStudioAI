import { diaSemanaDe, lunesDe, sumarDias } from './fechas';

export type EstadoDia = 'fuego' | 'extra' | 'helado' | 'pendiente' | 'futuro' | 'descanso';

export interface DiaMarcador {
  /** YYYY-MM-DD. */
  dia: string;
  /** 0 = domingo, 6 = sábado. */
  indiceSemana: number;
  estado: EstadoDia;
}

export interface Racha {
  actual: number;
  record: number;
}

/** Tope de seguridad: nadie tiene diez años de historial en esta app. */
const MAX_DIAS = 3650;

function esDeAgenda(dia: string, agenda: number[]): boolean {
  return agenda.includes(diaSemanaDe(dia));
}

function diasDeAgendaEntre(desde: string, hasta: string, agenda: number[]): string[] {
  const lista: string[] = [];
  let cursor = desde;
  for (let paso = 0; paso < MAX_DIAS && cursor <= hasta; paso += 1) {
    if (esDeAgenda(cursor, agenda)) lista.push(cursor);
    cursor = sumarDias(cursor, 1);
  }
  return lista;
}

/** Los siete días de la semana de `hoy`, de lunes a domingo. */
export function semanaDe(
  diasEntrenados: string[],
  agenda: number[],
  hoy: string,
): DiaMarcador[] {
  const hechos = new Set(diasEntrenados);
  const lunes = lunesDe(hoy);

  return Array.from({ length: 7 }, (_, paso) => {
    const dia = sumarDias(lunes, paso);
    const entrenado = hechos.has(dia);

    let estado: EstadoDia;
    if (!esDeAgenda(dia, agenda)) estado = entrenado ? 'extra' : 'descanso';
    else if (entrenado) estado = 'fuego';
    else if (dia < hoy) estado = 'helado';
    else if (dia === hoy) estado = 'pendiente';
    else estado = 'futuro';

    return { dia, indiceSemana: diaSemanaDe(dia), estado };
  });
}

/**
 * Recorre solo los días de la agenda: un domingo de descanso no rompe nada.
 * El día de hoy, si aún está pendiente, tampoco rompe: queda tiempo de entrenar.
 */
export function calcularRacha(
  diasEntrenados: string[],
  agenda: number[],
  hoy: string,
): Racha {
  if (agenda.length === 0 || diasEntrenados.length === 0) return { actual: 0, record: 0 };

  const hechos = new Set(diasEntrenados);
  const primero = [...diasEntrenados].sort()[0] as string;

  let corriendo = 0;
  let record = 0;

  for (const dia of diasDeAgendaEntre(primero, hoy, agenda)) {
    if (hechos.has(dia)) {
      corriendo += 1;
      record = Math.max(record, corriendo);
    } else if (dia !== hoy) {
      corriendo = 0;
    }
  }

  return { actual: corriendo, record };
}
