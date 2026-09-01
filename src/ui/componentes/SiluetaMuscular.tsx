import Svg, { Ellipse, Rect } from 'react-native-svg';
import type { Musculo } from '@/data/catalog/tipos';
import { colores } from '@/ui/tema';

type Forma =
  | { tipo: 'elipse'; cx: number; cy: number; rx: number; ry: number }
  | { tipo: 'rect'; x: number; y: number; ancho: number; alto: number; radio: number };

/** Una pieza sin músculo es relleno anatómico: cabeza, cuello, cadera, pies. */
interface Pieza {
  musculo?: Musculo;
  forma: Forma;
}

const elipse = (cx: number, cy: number, rx: number, ry: number): Forma => ({
  tipo: 'elipse',
  cx,
  cy,
  rx,
  ry,
});

const rect = (x: number, y: number, ancho: number, alto: number, radio = 4): Forma => ({
  tipo: 'rect',
  x,
  y,
  ancho,
  alto,
  radio,
});

/**
 * El cuerpo se dibuja con las propias regiones musculares más piezas neutras,
 * en un lienzo de 100×220. No hay contorno aparte: así el resaltado no puede
 * desalinearse del cuerpo, porque es el cuerpo.
 */
const ESQUELETO: Pieza[] = [
  { forma: elipse(50, 14, 8, 9.5) }, // cabeza
  { forma: rect(45.5, 21, 9, 7, 2) }, // cuello
  { forma: rect(36, 30, 28, 46, 8) }, // masa del torso
  { forma: rect(39, 74, 22, 12, 5) }, // cadera
  { forma: elipse(23, 90, 4, 4) }, // mano izquierda
  { forma: elipse(77, 90, 4, 4) }, // mano derecha
  { forma: elipse(43.5, 128, 6, 5) }, // rodilla izquierda
  { forma: elipse(56.5, 128, 6, 5) }, // rodilla derecha
  { forma: rect(38, 172, 11, 7, 3) }, // pie izquierdo
  { forma: rect(51, 172, 11, 7, 3) }, // pie derecho
];

const BRAZOS_COMUNES: Pieza[] = [
  { musculo: 'forearms', forma: elipse(22.5, 74, 4.5, 12) },
  { musculo: 'forearms', forma: elipse(77.5, 74, 4.5, 12) },
];

const PIERNAS_COMUNES: Pieza[] = [
  { musculo: 'calves', forma: elipse(43.5, 150, 6.5, 17) },
  { musculo: 'calves', forma: elipse(56.5, 150, 6.5, 17) },
];

const FRONTAL: Pieza[] = [
  ...ESQUELETO,
  { musculo: 'delts', forma: elipse(32.5, 36, 7, 7.5) },
  { musculo: 'delts', forma: elipse(67.5, 36, 7, 7.5) },
  { musculo: 'pectorals', forma: elipse(43.5, 44, 8, 7) },
  { musculo: 'pectorals', forma: elipse(56.5, 44, 8, 7) },
  { musculo: 'abs', forma: rect(43, 54, 14, 20, 5) },
  { musculo: 'biceps', forma: elipse(26, 52, 5, 11) },
  { musculo: 'biceps', forma: elipse(74, 52, 5, 11) },
  ...BRAZOS_COMUNES,
  { musculo: 'quads', forma: elipse(43.5, 104, 8.5, 21) },
  { musculo: 'quads', forma: elipse(56.5, 104, 8.5, 21) },
  ...PIERNAS_COMUNES,
];

const POSTERIOR: Pieza[] = [
  ...ESQUELETO,
  { musculo: 'traps', forma: rect(41, 29, 18, 13, 6) },
  { musculo: 'delts', forma: elipse(32.5, 36, 7, 7.5) },
  { musculo: 'delts', forma: elipse(67.5, 36, 7, 7.5) },
  { musculo: 'upper-back', forma: rect(38.5, 44, 23, 12, 5) },
  { musculo: 'lats', forma: elipse(40.5, 63, 8, 12) },
  { musculo: 'lats', forma: elipse(59.5, 63, 8, 12) },
  { musculo: 'triceps', forma: elipse(26, 52, 5, 11) },
  { musculo: 'triceps', forma: elipse(74, 52, 5, 11) },
  ...BRAZOS_COMUNES,
  { musculo: 'glutes', forma: elipse(44, 84, 9, 9) },
  { musculo: 'glutes', forma: elipse(56, 84, 9, 9) },
  { musculo: 'hamstrings', forma: elipse(43.5, 106, 8.5, 19) },
  { musculo: 'hamstrings', forma: elipse(56.5, 106, 8.5, 19) },
  ...PIERNAS_COMUNES,
];

export type VistaSilueta = 'frontal' | 'posterior';

function musculosDe(piezas: Pieza[]): Musculo[] {
  return piezas.flatMap((pieza) => (pieza.musculo ? [pieza.musculo] : []));
}

/** Elige la vista que muestra más de los músculos del día. */
export function vistaPara(musculos: Musculo[]): VistaSilueta {
  const cuenta = (piezas: Pieza[]): number => {
    const disponibles = new Set(musculosDe(piezas));
    return musculos.filter((musculo) => disponibles.has(musculo)).length;
  };
  return cuenta(POSTERIOR) > cuenta(FRONTAL) ? 'posterior' : 'frontal';
}

export interface PropiedadesSilueta {
  principales: Musculo[];
  secundarios: Musculo[];
  vista: VistaSilueta;
  ancho?: number;
}

export function SiluetaMuscular({
  principales,
  secundarios,
  vista,
  ancho = 140,
}: PropiedadesSilueta) {
  const piezas = vista === 'frontal' ? FRONTAL : POSTERIOR;
  const vistos = new Map<Musculo, number>();

  const colorDe = (musculo?: Musculo): string => {
    if (!musculo) return colores.superficieAlta;
    if (principales.includes(musculo)) return colores.musculoPrincipal;
    if (secundarios.includes(musculo)) return colores.musculoSecundario;
    return colores.musculoInactivo;
  };

  return (
    <Svg width={ancho} height={(ancho * 220) / 100} viewBox="0 0 100 220">
      {piezas.map((pieza, posicion) => {
        let identificador = `pieza-${posicion}`;
        if (pieza.musculo) {
          const indice = vistos.get(pieza.musculo) ?? 0;
          vistos.set(pieza.musculo, indice + 1);
          identificador = `region-${pieza.musculo}-${indice}`;
        }

        const relleno = colorDe(pieza.musculo);
        const { forma } = pieza;

        return forma.tipo === 'elipse' ? (
          <Ellipse
            key={identificador}
            testID={identificador}
            cx={forma.cx}
            cy={forma.cy}
            rx={forma.rx}
            ry={forma.ry}
            fill={relleno}
            stroke={colores.fondo}
            strokeWidth={0.9}
          />
        ) : (
          <Rect
            key={identificador}
            testID={identificador}
            x={forma.x}
            y={forma.y}
            width={forma.ancho}
            height={forma.alto}
            rx={forma.radio}
            fill={relleno}
            stroke={colores.fondo}
            strokeWidth={0.9}
          />
        );
      })}
    </Svg>
  );
}
