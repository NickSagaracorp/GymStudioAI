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

const campoMacro = { ...campoCantidad, width: 62 };

/** Campos de macros editables: sin ellos no se podría registrar nada a mano. */
const MACROS_EDITABLES = [
  { clave: 'kcal', etiqueta: 'kcal' },
  { clave: 'proteinaG', etiqueta: 'P' },
  { clave: 'carbosG', etiqueta: 'C' },
  { clave: 'grasaG', etiqueta: 'G' },
] as const;

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
  const [borradoresMacro, setBorradoresMacro] = useState<Record<string, string>>({});
  const total = sumarAlimentos(alimentos);

  function cambiarCantidad(indice: number, texto: string) {
    setBorradores({ ...borradores, [indice]: texto });

    const cantidad = Number.parseFloat(texto.replace(',', '.'));
    const original = alimentos[indice];
    if (!original || Number.isNaN(cantidad) || cantidad <= 0) return;

    setBorradoresMacro(
      Object.fromEntries(
        Object.entries(borradoresMacro).filter(([clave]) => !clave.startsWith(`${indice}-`)),
      ),
    );

    onCambio(
      alimentos.map((alimento, i) => (i === indice ? escalarAlimento(original, cantidad) : alimento)),
    );
  }

  function cambiarMacro(
    indice: number,
    clave: (typeof MACROS_EDITABLES)[number]['clave'],
    texto: string,
  ) {
    setBorradoresMacro({ ...borradoresMacro, [`${indice}-${clave}`]: texto });

    const valor = Number.parseFloat(texto.replace(',', '.'));
    if (Number.isNaN(valor) || valor < 0) return;

    onCambio(
      alimentos.map((alimento, i) => (i === indice ? { ...alimento, [clave]: valor } : alimento)),
    );
  }

  function cambiarNombre(indice: number, nombre: string) {
    onCambio(alimentos.map((alimento, i) => (i === indice ? { ...alimento, nombre } : alimento)));
  }

  function borrar(indice: number) {
    onCambio(alimentos.filter((_, i) => i !== indice));
    setBorradores({});
    setBorradoresMacro({});
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

            <View style={{ flex: 1 }} />

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

          <View style={{ flexDirection: 'row', gap: espaciado.sm, flexWrap: 'wrap' }}>
            {MACROS_EDITABLES.map(({ clave, etiqueta }) => (
              <View key={clave} style={{ alignItems: 'center', gap: 2 }}>
                <Text style={tipografia.tenue}>{etiqueta}</Text>
                <TextInput
                  testID={`${clave}-${indice}`}
                  keyboardType="decimal-pad"
                  value={borradoresMacro[`${indice}-${clave}`] ?? String(alimento[clave])}
                  onChangeText={(texto) => cambiarMacro(indice, clave, texto)}
                  style={campoMacro}
                />
              </View>
            ))}
          </View>
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
