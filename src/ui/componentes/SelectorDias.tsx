import { Text, View } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

/** Índice 0 = domingo, para cuadrar con `Date.getDay()`. */
const ETIQUETAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];

export const MIN_DIAS = 2;
export const MAX_DIAS = 6;

/** Chips de lunes a domingo. Devuelve siempre la agenda ordenada. */
export function SelectorDias({
  seleccionados,
  onCambio,
}: {
  seleccionados: number[];
  onCambio: (dias: number[]) => void;
}) {
  function alternar(dia: number) {
    const activo = seleccionados.includes(dia);
    if (activo && seleccionados.length <= MIN_DIAS) return;
    if (!activo && seleccionados.length >= MAX_DIAS) return;

    const siguiente = activo
      ? seleccionados.filter((d) => d !== dia)
      : [...seleccionados, dia];

    onCambio([...siguiente].sort((a, b) => a - b));
  }

  return (
    <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
      {ORDEN.map((dia) => {
        const activo = seleccionados.includes(dia);
        return (
          <Text
            key={dia}
            testID={`dia-agenda-${dia}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => alternar(dia)}
            style={{
              ...tipografia.cuerpo,
              width: 38,
              paddingVertical: espaciado.sm,
              borderRadius: radio.sm,
              overflow: 'hidden',
              textAlign: 'center',
              backgroundColor: activo ? colores.acento : colores.superficieAlta,
              color: activo ? colores.acentoTexto : colores.texto,
            }}
          >
            {ETIQUETAS[dia]}
          </Text>
        );
      })}
    </View>
  );
}
