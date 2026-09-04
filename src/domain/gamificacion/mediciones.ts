import type { Objetivo } from '@/data/db/repos/perfil';
import type { Medicion, TipoMedida } from '@/data/db/repos/mediciones';

/** Por debajo de esto es ruido de báscula y de cinta métrica. */
export const UMBRAL_KG = 0.3;
export const UMBRAL_CM = 0.5;

export interface Veredicto {
  hayProgreso: boolean;
  titulo: string;
  detalle: string;
}

export interface ContextoAnimo {
  entrenamientosDelMes: number;
  rachaActual: number;
}

interface Criterio {
  medidas: TipoMedida[];
  /** -1 si progresar es bajar, 1 si es subir. */
  direccion: -1 | 1;
}

const CRITERIOS: Record<Objetivo, Criterio> = {
  definicion: { medidas: ['cintura'], direccion: -1 },
  volumen: { medidas: ['pecho', 'brazo_der', 'brazo_izq'], direccion: 1 },
  fuerza: { medidas: ['pecho', 'brazo_der', 'brazo_izq'], direccion: 1 },
};

const ETIQUETA: Partial<Record<TipoMedida, string>> = {
  cintura: 'de cintura',
  pecho: 'de pecho',
  brazo_der: 'de brazo derecho',
  brazo_izq: 'de brazo izquierdo',
};

function formatear(delta: number, unidad: string): string {
  const signo = delta > 0 ? '+' : '−';
  const valor = Math.abs(delta).toFixed(1).replace('.', ',').replace(/,0$/, '');
  return `${signo}${valor} ${unidad}`;
}

function cuenta(delta: number, direccion: -1 | 1, umbral: number): boolean {
  return Math.abs(delta) >= umbral && Math.sign(delta) === direccion;
}

export function evaluarMedicion(
  objetivo: Objetivo,
  anterior: Medicion | null,
  actual: Medicion,
  contexto: ContextoAnimo,
): Veredicto {
  if (!anterior) {
    return {
      hayProgreso: false,
      titulo: 'Punto de partida',
      detalle: 'Guardado. A partir de hoy cada medición se compara con esta.',
    };
  }

  const criterio = CRITERIOS[objetivo];
  const logros: string[] = [];

  const deltaPeso = actual.pesoKg - anterior.pesoKg;
  if (cuenta(deltaPeso, criterio.direccion, UMBRAL_KG)) {
    logros.push(formatear(deltaPeso, 'kg'));
  }

  for (const medida of criterio.medidas) {
    const antes = anterior.medidas[medida];
    const ahora = actual.medidas[medida];
    if (antes === undefined || ahora === undefined) continue;
    const delta = ahora - antes;
    if (cuenta(delta, criterio.direccion, UMBRAL_CM)) {
      logros.push(`${formatear(delta, 'cm')} ${ETIQUETA[medida] ?? ''}`.trim());
    }
  }

  if (logros.length > 0) {
    return {
      hayProgreso: true,
      titulo: '¡Vas por buen camino!',
      detalle: logros.join(' · '),
    };
  }

  const racha =
    contexto.rachaActual > 0 ? ` y una racha de ${contexto.rachaActual} días` : '';

  return {
    hayProgreso: false,
    titulo: 'Sigue ahí',
    detalle:
      'El cuerpo no cambia en línea recta. Llevas ' +
      `${contexto.entrenamientosDelMes} entrenamientos este mes${racha}: ` +
      'eso es lo que construye el resultado.',
  };
}
