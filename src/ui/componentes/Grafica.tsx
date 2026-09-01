import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colores, espaciado, tipografia } from '@/ui/tema';

export interface Punto {
  etiqueta: string;
  valor: number;
}

const ANCHO = 300;
const ALTO = 90;

function formatear(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(1);
}

export interface Coordenada {
  x: number;
  y: number;
}

/**
 * Proyecta los valores sobre el lienzo. Cuando todos son iguales la línea va
 * centrada, no pegada al borde inferior.
 */
export function coordenadasDe(puntos: Punto[], ancho = ANCHO, alto = ALTO): Coordenada[] {
  if (puntos.length === 0) return [];

  const valores = puntos.map((p) => p.valor);
  const minimo = Math.min(...valores);
  const rango = Math.max(...valores) - minimo;

  return puntos.map((punto, indice) => ({
    x: puntos.length === 1 ? ancho / 2 : (indice / (puntos.length - 1)) * ancho,
    y: rango === 0 ? alto / 2 : alto - ((punto.valor - minimo) / rango) * alto,
  }));
}

/**
 * Con un solo registro no hay evolución que dibujar, así que se muestra el
 * valor y ya. La línea aparece a partir del segundo, que es cuando significa
 * algo.
 */
export function Grafica({ puntos, titulo }: { puntos: Punto[]; titulo: string }) {
  const ultimo = puntos[puntos.length - 1];

  if (!ultimo) {
    return (
      <Text testID={`grafica-vacia-${titulo}`} style={tipografia.tenue}>
        Sin datos de {titulo} todavía.
      </Text>
    );
  }

  const cabecera = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}
    >
      <Text style={tipografia.cuerpo}>{titulo}</Text>
      <Text testID={`valor-${titulo}`} style={{ ...tipografia.seccion, color: colores.acento }}>
        {formatear(ultimo.valor)}
      </Text>
    </View>
  );

  if (puntos.length === 1) {
    return (
      <View style={{ gap: espaciado.xs }}>
        {cabecera}
        <Text testID={`unico-${titulo}`} style={tipografia.tenue}>
          Primer registro, {ultimo.etiqueta}. La evolución aparece con la siguiente medición.
        </Text>
      </View>
    );
  }

  const coordenadas = coordenadasDe(puntos);
  const primero = puntos[0];
  const variacion = ultimo.valor - (primero?.valor ?? 0);

  return (
    <View style={{ gap: espaciado.xs }}>
      {cabecera}
      <Svg width="100%" height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`}>
        <Polyline
          testID={`linea-${titulo}`}
          points={coordenadas.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={colores.acento}
          strokeWidth={2}
        />
        {coordenadas.map((c, indice) => (
          <Circle key={indice} cx={c.x} cy={c.y} r={3} fill={colores.acento} />
        ))}
      </Svg>
      <Text testID={`variacion-${titulo}`} style={tipografia.tenue}>
        Desde {primero?.etiqueta} · {variacion >= 0 ? '+' : ''}
        {formatear(variacion)}
      </Text>
    </View>
  );
}
