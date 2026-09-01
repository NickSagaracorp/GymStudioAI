import { ScrollView, Text, View } from 'react-native';
import { Boton } from './Boton';
import { EditorAlimentos } from './EditorAlimentos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { MOMENTOS } from '@/domain/nutricion/tipos';
import type { Alimento, Momento } from '@/domain/nutricion/tipos';

const NOMBRE_MOMENTO: Record<Momento, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snack',
};

/** Cuerpo compartido por el alta con foto, el alta manual y la edición. */
export function FormularioComida({
  titulo,
  momento,
  onMomento,
  alimentos,
  onAlimentos,
  avisos = [],
  onGuardar,
  onCancelar,
  etiquetaGuardar = 'Guardar comida',
  guardando = false,
}: {
  titulo: string;
  momento: Momento;
  onMomento: (momento: Momento) => void;
  alimentos: Alimento[];
  onAlimentos: (alimentos: Alimento[]) => void;
  avisos?: string[];
  onGuardar: () => void;
  onCancelar: () => void;
  etiquetaGuardar?: string;
  guardando?: boolean;
}) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.md,
      }}
    >
      <Text style={tipografia.titulo}>{titulo}</Text>

      {avisos.length > 0 && (
        <View
          testID="avisos"
          style={{
            backgroundColor: colores.superficieAlta,
            borderRadius: radio.md,
            padding: espaciado.md,
            gap: espaciado.xs,
          }}
        >
          {avisos.map((aviso) => (
            <Text key={aviso} style={{ ...tipografia.tenue, color: colores.aviso }}>
              {aviso}
            </Text>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm }}>
        {MOMENTOS.map((valor) => {
          const activo = momento === valor;
          return (
            <Text
              key={valor}
              testID={`momento-${valor}`}
              accessibilityRole="button"
              onPress={() => onMomento(valor)}
              style={{
                ...tipografia.cuerpo,
                paddingVertical: espaciado.sm,
                paddingHorizontal: espaciado.md,
                borderRadius: radio.sm,
                overflow: 'hidden',
                backgroundColor: activo ? colores.acento : colores.superficieAlta,
                color: activo ? colores.acentoTexto : colores.texto,
              }}
            >
              {NOMBRE_MOMENTO[valor]}
            </Text>
          );
        })}
      </View>

      <EditorAlimentos alimentos={alimentos} onCambio={onAlimentos} />

      <Boton
        testID="guardar-comida"
        titulo={guardando ? 'Guardando...' : etiquetaGuardar}
        onPress={onGuardar}
        deshabilitado={alimentos.length === 0 || guardando}
      />
      <Boton titulo="Cancelar" variante="secundario" onPress={onCancelar} />
    </ScrollView>
  );
}
