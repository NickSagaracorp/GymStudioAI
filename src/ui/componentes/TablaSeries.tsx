import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Meta } from '@/domain/planner/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export interface SerieConfirmada {
  numero: number;
  pesoLogrado: number | null;
  repsLogradas: number;
}

function aNumero(texto: string): number | null {
  const numero = Number.parseFloat(texto.replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
}

const campo = {
  ...tipografia.cuerpo,
  width: 56,
  textAlign: 'center' as const,
  backgroundColor: colores.fondo,
  borderRadius: radio.sm,
  borderWidth: 1,
  borderColor: colores.borde,
  paddingVertical: espaciado.xs,
};

/**
 * Una fila por serie con la meta a la izquierda y lo logrado a la derecha. Los
 * campos vienen precargados con la meta: confirmar una serie que salió como
 * estaba previsto es un solo toque.
 */
export function TablaSeries({
  meta,
  registradas,
  onConfirmar,
}: {
  meta: Meta;
  registradas: SerieConfirmada[];
  onConfirmar: (serie: SerieConfirmada) => void;
}) {
  const numeros = Array.from({ length: meta.series }, (_, indice) => indice + 1);
  const hechas = new Map(registradas.map((s) => [s.numero, s]));

  const [pesos, setPesos] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});

  const pesoDe = (numero: number): string =>
    pesos[numero] ?? String(hechas.get(numero)?.pesoLogrado ?? meta.pesoMeta ?? '');
  const repsDe = (numero: number): string =>
    reps[numero] ?? String(hechas.get(numero)?.repsLogradas ?? meta.repsMeta);

  return (
    <View style={{ gap: espaciado.sm }}>
      {numeros.map((numero) => {
        const hecha = hechas.has(numero);

        return (
          <View
            key={numero}
            testID={`fila-${numero}`}
            accessibilityState={{ checked: hecha }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: espaciado.sm,
              backgroundColor: hecha ? colores.superficieAlta : colores.superficie,
              borderRadius: radio.sm,
              padding: espaciado.sm,
            }}
          >
            <Text style={{ ...tipografia.tenue, width: 18 }}>{numero}</Text>

            <Text testID={`meta-${numero}`} style={{ ...tipografia.tenue, width: 92 }}>
              {meta.pesoMeta === null
                ? `${meta.repsMeta} reps`
                : `${meta.pesoMeta} kg × ${meta.repsMeta}`}
            </Text>

            {meta.pesoMeta !== null && (
              <TextInput
                testID={`peso-${numero}`}
                keyboardType="decimal-pad"
                value={pesoDe(numero)}
                onChangeText={(texto) => setPesos({ ...pesos, [numero]: texto })}
                style={campo}
              />
            )}

            <TextInput
              testID={`reps-${numero}`}
              keyboardType="number-pad"
              value={repsDe(numero)}
              onChangeText={(texto) => setReps({ ...reps, [numero]: texto })}
              style={campo}
            />

            <Pressable
              testID={`confirmar-${numero}`}
              accessibilityRole="button"
              onPress={() =>
                onConfirmar({
                  numero,
                  pesoLogrado: meta.pesoMeta === null ? null : aNumero(pesoDe(numero)),
                  repsLogradas: aNumero(repsDe(numero)) ?? 0,
                })
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: hecha ? colores.exito : colores.borde,
              }}
            >
              <Text style={{ color: colores.fondo, fontWeight: '700' }}>✓</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
