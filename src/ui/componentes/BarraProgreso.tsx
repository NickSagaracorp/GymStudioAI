import { View } from 'react-native';
import { colores, radio } from '@/ui/tema';

export function BarraProgreso({ valor, total }: { valor: number; total: number }) {
  const porcentaje = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;

  return (
    <View
      testID="barra-progreso"
      accessibilityValue={{ now: porcentaje, min: 0, max: 100 }}
      style={{ height: 8, backgroundColor: colores.borde, borderRadius: radio.sm }}
    >
      <View
        style={{
          width: `${porcentaje}%`,
          height: 8,
          backgroundColor: colores.acento,
          borderRadius: radio.sm,
        }}
      />
    </View>
  );
}
