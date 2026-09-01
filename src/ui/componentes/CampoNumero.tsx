import { Text, TextInput, View } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export function CampoNumero({
  etiqueta,
  valor,
  onCambio,
  testID,
  sufijo,
}: {
  etiqueta: string;
  valor: number | null;
  onCambio: (valor: number | null) => void;
  testID: string;
  sufijo?: string;
}) {
  return (
    <View style={{ marginBottom: espaciado.md }}>
      <Text style={tipografia.tenue}>
        {etiqueta}
        {sufijo ? ` (${sufijo})` : ''}
      </Text>
      <TextInput
        testID={testID}
        keyboardType="decimal-pad"
        placeholderTextColor={colores.textoTenue}
        value={valor === null ? '' : String(valor)}
        onChangeText={(texto) => {
          const limpio = texto.replace(',', '.');
          const numero = Number.parseFloat(limpio);
          onCambio(limpio === '' || Number.isNaN(numero) ? null : numero);
        }}
        style={{
          ...tipografia.cuerpo,
          backgroundColor: colores.superficie,
          borderRadius: radio.sm,
          borderWidth: 1,
          borderColor: colores.borde,
          paddingHorizontal: espaciado.md,
          paddingVertical: espaciado.sm,
          marginTop: espaciado.xs,
        }}
      />
    </View>
  );
}
