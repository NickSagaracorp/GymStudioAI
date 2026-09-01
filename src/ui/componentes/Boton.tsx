import { Pressable, Text } from 'react-native';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export function Boton({
  titulo,
  onPress,
  testID,
  variante = 'primario',
  deshabilitado = false,
}: {
  titulo: string;
  onPress: () => void;
  testID?: string;
  variante?: 'primario' | 'secundario';
  deshabilitado?: boolean;
}) {
  const esPrimario = variante === 'primario';

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={{
        backgroundColor: esPrimario ? colores.acento : colores.superficieAlta,
        opacity: deshabilitado ? 0.4 : 1,
        paddingVertical: espaciado.md,
        paddingHorizontal: espaciado.lg,
        borderRadius: radio.md,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          ...tipografia.cuerpo,
          fontWeight: '600',
          color: esPrimario ? colores.acentoTexto : colores.texto,
        }}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}
