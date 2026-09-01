import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colores, espaciado, tipografia } from '@/ui/tema';

export interface Punto {
  etiqueta: string;
  valor: number;
}

const ANCHO = 300;
const ALTO = 110;

export function Grafica({ puntos, titulo }: { puntos: Punto[]; titulo: string }) {
  if (puntos.length === 0) {
    return (
      <Text testID={`grafica-vacia-${titulo}`} style={tipografia.tenue}>
        Sin datos de {titulo} todavía.
      </Text>
    );
  }

  const valores = puntos.map((p) => p.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = maximo - minimo || 1;

  const coordenadas = puntos.map((punto, indice) => ({
    x: puntos.length === 1 ? ANCHO / 2 : (indice / (puntos.length - 1)) * ANCHO,
    y: ALTO - ((punto.valor - minimo) / rango) * ALTO,
  }));

  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const variacion = (ultimo?.valor ?? 0) - (primero?.valor ?? 0);

  return (
    <View style={{ gap: espaciado.xs }}>
      <Text style={tipografia.cuerpo}>{titulo}</Text>
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
      <Text style={tipografia.tenue}>
        {primero?.etiqueta} → {ultimo?.etiqueta} · {variacion >= 0 ? '+' : ''}
        {variacion.toFixed(1)}
      </Text>
    </View>
  );
}
