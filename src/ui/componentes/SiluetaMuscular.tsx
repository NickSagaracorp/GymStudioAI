import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import type { Musculo } from '@/data/catalog/tipos';
import { colores } from '@/ui/tema';

type Forma =
  | { tipo: 'elipse'; cx: number; cy: number; rx: number; ry: number }
  | { tipo: 'rect'; x: number; y: number; ancho: number; alto: number; radio: number };

type Regiones = Partial<Record<Musculo, Forma[]>>;

/**
 * Silueta esquemática sobre un lienzo de 100×220. No es una lámina de
 * anatomía: son regiones reconocibles, ligeras de pintar y coloreables.
 */
const CONTORNO =
  'M50 6 c6 0 10 5 10 11 s-4 11-10 11 s-10-5-10-11 S44 6 50 6 Z ' +
  'M36 30 h28 l10 8 c3 2 4 5 4 8 v22 c0 4-1 7-3 10 l-5 8 v6 h-4 ' +
  'l-3 34 v42 h-9 v-40 l-4-26 h-2 l-4 26 v40 h-9 v-42 l-3-34 h-4 v-6 ' +
  'l-5-8 c-2-3-3-6-3-10 V46 c0-3 1-6 4-8 Z';

const FRONTAL: Regiones = {
  pectorals: [
    { tipo: 'elipse', cx: 43, cy: 50, rx: 8, ry: 6 },
    { tipo: 'elipse', cx: 57, cy: 50, rx: 8, ry: 6 },
  ],
  delts: [
    { tipo: 'elipse', cx: 31, cy: 44, rx: 6, ry: 7 },
    { tipo: 'elipse', cx: 69, cy: 44, rx: 6, ry: 7 },
  ],
  biceps: [
    { tipo: 'elipse', cx: 28, cy: 60, rx: 4.5, ry: 9 },
    { tipo: 'elipse', cx: 72, cy: 60, rx: 4.5, ry: 9 },
  ],
  forearms: [
    { tipo: 'elipse', cx: 26, cy: 78, rx: 4, ry: 9 },
    { tipo: 'elipse', cx: 74, cy: 78, rx: 4, ry: 9 },
  ],
  abs: [{ tipo: 'rect', x: 44, y: 60, ancho: 12, alto: 24, radio: 4 }],
  quads: [
    { tipo: 'elipse', cx: 44, cy: 128, rx: 7, ry: 20 },
    { tipo: 'elipse', cx: 56, cy: 128, rx: 7, ry: 20 },
  ],
  calves: [
    { tipo: 'elipse', cx: 44, cy: 176, rx: 5.5, ry: 15 },
    { tipo: 'elipse', cx: 56, cy: 176, rx: 5.5, ry: 15 },
  ],
};

const POSTERIOR: Regiones = {
  traps: [{ tipo: 'rect', x: 41, y: 33, ancho: 18, alto: 11, radio: 5 }],
  delts: [
    { tipo: 'elipse', cx: 31, cy: 44, rx: 6, ry: 7 },
    { tipo: 'elipse', cx: 69, cy: 44, rx: 6, ry: 7 },
  ],
  'upper-back': [{ tipo: 'rect', x: 39, y: 46, ancho: 22, alto: 11, radio: 4 }],
  lats: [
    { tipo: 'elipse', cx: 40, cy: 66, rx: 7, ry: 13 },
    { tipo: 'elipse', cx: 60, cy: 66, rx: 7, ry: 13 },
  ],
  triceps: [
    { tipo: 'elipse', cx: 28, cy: 60, rx: 4.5, ry: 9 },
    { tipo: 'elipse', cx: 72, cy: 60, rx: 4.5, ry: 9 },
  ],
  forearms: [
    { tipo: 'elipse', cx: 26, cy: 78, rx: 4, ry: 9 },
    { tipo: 'elipse', cx: 74, cy: 78, rx: 4, ry: 9 },
  ],
  glutes: [
    { tipo: 'elipse', cx: 44, cy: 98, rx: 8, ry: 8 },
    { tipo: 'elipse', cx: 56, cy: 98, rx: 8, ry: 8 },
  ],
  hamstrings: [
    { tipo: 'elipse', cx: 44, cy: 130, rx: 7, ry: 18 },
    { tipo: 'elipse', cx: 56, cy: 130, rx: 7, ry: 18 },
  ],
  calves: [
    { tipo: 'elipse', cx: 44, cy: 176, rx: 5.5, ry: 15 },
    { tipo: 'elipse', cx: 56, cy: 176, rx: 5.5, ry: 15 },
  ],
};

export type VistaSilueta = 'frontal' | 'posterior';

/** Elige la vista que muestra más de los músculos del día. */
export function vistaPara(musculos: Musculo[]): VistaSilueta {
  const cuenta = (regiones: Regiones): number =>
    musculos.filter((musculo) => regiones[musculo] !== undefined).length;
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
  const regiones = vista === 'frontal' ? FRONTAL : POSTERIOR;

  const colorDe = (musculo: Musculo): string => {
    if (principales.includes(musculo)) return colores.musculoPrincipal;
    if (secundarios.includes(musculo)) return colores.musculoSecundario;
    return colores.musculoInactivo;
  };

  return (
    <Svg width={ancho} height={(ancho * 220) / 100} viewBox="0 0 100 220">
      <Path d={CONTORNO} fill={colores.superficieAlta} />
      {Object.entries(regiones).flatMap(([musculo, formas]) =>
        (formas ?? []).map((forma, indice) => {
          const identificador = `region-${musculo}-${indice}`;
          const relleno = colorDe(musculo as Musculo);

          return forma.tipo === 'elipse' ? (
            <Ellipse
              key={identificador}
              testID={identificador}
              cx={forma.cx}
              cy={forma.cy}
              rx={forma.rx}
              ry={forma.ry}
              fill={relleno}
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
            />
          );
        }),
      )}
    </Svg>
  );
}
