import { Pressable, Text, View } from 'react-native';
import { Boton } from '@/ui/componentes/Boton';
import { colores, espaciado } from '@/ui/tema';

/**
 * Puntos de posición y avance. El botón de terminar solo aparece en el último
 * ejercicio: pulsarlo por error era lo que cerraba la sesión entera.
 */
export function BarraEjercicios({
  total,
  indice,
  completos,
  onAnterior,
  onSiguiente,
  onTerminar,
  onIrA,
}: {
  total: number;
  indice: number;
  completos: boolean[];
  onAnterior: () => void;
  onSiguiente: () => void;
  onTerminar: () => void;
  onIrA: (indice: number) => void;
}) {
  const esUltimo = indice >= total - 1;

  return (
    <View style={{ padding: espaciado.lg, gap: espaciado.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: espaciado.sm }}>
        {Array.from({ length: total }, (_, posicion) => (
          <Pressable
            key={posicion}
            testID={`punto-${posicion}`}
            accessibilityRole="button"
            accessibilityState={{ selected: posicion === indice }}
            onPress={() => onIrA(posicion)}
            style={{
              width: posicion === indice ? 24 : 10,
              height: 10,
              borderRadius: 5,
              backgroundColor:
                posicion === indice
                  ? colores.acento
                  : completos[posicion]
                    ? colores.exito
                    : colores.borde,
            }}
          />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        {indice > 0 && (
          <View style={{ width: 96 }}>
            <Boton
              testID="ejercicio-anterior"
              titulo="‹ Anterior"
              variante="secundario"
              onPress={onAnterior}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {esUltimo ? (
            <Boton testID="terminar-sesion" titulo="Terminar entrenamiento" onPress={onTerminar} />
          ) : (
            <Boton testID="siguiente-ejercicio" titulo="Siguiente ejercicio" onPress={onSiguiente} />
          )}
        </View>
      </View>
    </View>
  );
}
