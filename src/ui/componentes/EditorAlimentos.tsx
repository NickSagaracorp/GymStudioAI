import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Alimento } from '@/domain/nutricion/tipos';
import { sumarAlimentos } from '@/domain/nutricion/totales';
import { escalarAlimento } from '@/domain/nutricion/validacion';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const campoCantidad = {
  ...tipografia.cuerpo,
  width: 74,
  textAlign: 'center' as const,
  backgroundColor: colores.fondo,
  borderRadius: radio.sm,
  borderWidth: 1,
  borderColor: colores.borde,
  paddingVertical: espaciado.xs,
};

export const ALIMENTO_VACIO: Alimento = {
  nombre: 'Alimento',
  cantidadG: 100,
  kcal: 0,
  proteinaG: 0,
  carbosG: 0,
  azucaresG: 0,
  grasaG: 0,
  grasaSaturadaG: 0,
  grasaTransG: 0,
  fibraG: 0,
  confianza: null,
};

/**
 * Lista editable de alimentos. Cambiar la cantidad reescala las macros, porque
 * el error habitual de la IA es la ración, no la identificación del alimento.
 */
export function EditorAlimentos({
  alimentos,
  onCambio,
}: {
  alimentos: Alimento[];
  onCambio: (alimentos: Alimento[]) => void;
}) {
  const [borradores, setBorradores] = useState<Record<number, string>>({});
  const total = sumarAlimentos(alimentos);

  function cambiarCantidad(indice: number, texto: string) {
    setBorradores({ ...borradores, [indice]: texto });

    const cantidad = Number.parseFloat(texto.replace(',', '.'));
    const original = alimentos[indice];
    if (!original || Number.isNaN(cantidad) || cantidad <= 0) return;

    onCambio(
      alimentos.map((alimento, i) => (i === indice ? escalarAlimento(original, cantidad) : alimento)),
    );
  }

  function cambiarNombre(indice: number, nombre: string) {
    onCambio(alimentos.map((alimento, i) => (i === indice ? { ...alimento, nombre } : alimento)));
  }

  function borrar(indice: number) {
    onCambio(alimentos.filter((_, i) => i !== indice));
    setBorradores({});
  }

  return (
    <View style={{ gap: espaciado.md }}>
      <View
        testID="total-comida"
        style={{
          backgroundColor: colores.superficieAlta,
          borderRadius: radio.md,
          padding: espaciado.md,
          gap: espaciado.xs,
        }}
      >
        <Text style={tipografia.tenue}>Total de la comida</Text>
        <Text style={tipografia.numero}>{Math.round(total.kcal)} kcal</Text>
        <Text style={tipografia.tenue}>
          P {Math.round(total.proteinaG)} g · C {Math.round(total.carbosG)} g · G{' '}
          {Math.round(total.grasaG)} g
        </Text>
      </View>

      {alimentos.length === 0 && (
        <Text testID="sin-alimentos" style={tipografia.tenue}>
          No hay alimentos. Añade uno para poder guardar.
        </Text>
      )}

      {alimentos.map((alimento, indice) => (
        <View
          key={`${alimento.nombre}-${indice}`}
          testID={`alimento-${indice}`}
          style={{
            backgroundColor: colores.superficie,
            borderRadius: radio.md,
            padding: espaciado.md,
            gap: espaciado.sm,
            borderWidth: alimento.confianza === 'baja' ? 1 : 0,
            borderColor: colores.aviso,
          }}
        >
          <TextInput
            testID={`nombre-${indice}`}
            value={alimento.nombre}
            onChangeText={(texto) => cambiarNombre(indice, texto)}
            style={{ ...tipografia.cuerpo, paddingVertical: 0 }}
          />

          {alimento.confianza === 'baja' && (
            <Text testID={`aviso-${indice}`} style={{ ...tipografia.tenue, color: colores.aviso }}>
              Estimación poco fiable, revisa la cantidad.
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.sm }}>
            <TextInput
              testID={`cantidad-${indice}`}
              keyboardType="decimal-pad"
              value={borradores[indice] ?? String(alimento.cantidadG)}
              onChangeText={(texto) => cambiarCantidad(indice, texto)}
              style={campoCantidad}
            />
            <Text style={tipografia.tenue}>g</Text>

            <Text testID={`kcal-${indice}`} style={{ ...tipografia.cuerpo, flex: 1 }}>
              {Math.round(alimento.kcal)} kcal
            </Text>

            <Pressable
              testID={`borrar-${indice}`}
              accessibilityRole="button"
              onPress={() => borrar(indice)}
              style={{
                paddingHorizontal: espaciado.sm,
                paddingVertical: espaciado.xs,
                borderRadius: radio.sm,
                backgroundColor: colores.superficieAlta,
              }}
            >
              <Text style={{ ...tipografia.tenue, color: colores.error }}>Quitar</Text>
            </Pressable>
          </View>

          <Text testID={`macros-${indice}`} style={tipografia.tenue}>
            P {alimento.proteinaG} g · C {alimento.carbosG} g · G {alimento.grasaG} g
          </Text>
        </View>
      ))}

      <Pressable
        testID="anadir-alimento"
        accessibilityRole="button"
        onPress={() => onCambio([...alimentos, { ...ALIMENTO_VACIO }])}
        style={{
          borderRadius: radio.md,
          borderWidth: 1,
          borderColor: colores.borde,
          padding: espaciado.md,
          alignItems: 'center',
        }}
      >
        <Text style={tipografia.cuerpo}>+ Añadir alimento</Text>
      </Pressable>
    </View>
  );
}
