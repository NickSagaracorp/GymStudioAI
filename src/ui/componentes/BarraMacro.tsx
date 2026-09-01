import { Text, View } from 'react-native';
import type { ProgresoMacro } from '@/domain/nutricion/totales';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

function redondear(valor: number): number {
  return Math.round(valor);
}

export function BarraMacro({
  etiqueta,
  progreso,
  unidad = 'g',
  destacada = false,
}: {
  etiqueta: string;
  progreso: ProgresoMacro;
  unidad?: string;
  destacada?: boolean;
}) {
  const relleno = Math.min(100, progreso.porcentaje);
  const pasado = progreso.porcentaje > 100;

  return (
    <View style={{ gap: espaciado.xs }} testID={`macro-${etiqueta}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={destacada ? tipografia.cuerpo : tipografia.tenue}>{etiqueta}</Text>
        <Text style={destacada ? tipografia.cuerpo : tipografia.tenue}>
          {redondear(progreso.consumido)} / {redondear(progreso.objetivo)} {unidad}
        </Text>
      </View>

      <View
        style={{
          height: destacada ? 12 : 8,
          backgroundColor: colores.borde,
          borderRadius: radio.sm,
        }}
      >
        <View
          testID={`relleno-${etiqueta}`}
          style={{
            width: `${relleno}%`,
            height: destacada ? 12 : 8,
            backgroundColor: pasado ? colores.aviso : colores.acento,
            borderRadius: radio.sm,
          }}
        />
      </View>
    </View>
  );
}

export function LineaTope({
  etiqueta,
  consumido,
  tope,
  excedido,
}: {
  etiqueta: string;
  consumido: number;
  tope: number | null;
  excedido: boolean;
}) {
  return (
    <View
      testID={`tope-${etiqueta}`}
      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
    >
      <Text style={tipografia.tenue}>{etiqueta}</Text>
      <Text
        style={{
          ...tipografia.tenue,
          color: excedido ? colores.error : colores.textoTenue,
        }}
      >
        {redondear(consumido)} g{tope === null ? '' : ` · máx ${redondear(tope)} g`}
      </Text>
    </View>
  );
}
