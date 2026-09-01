import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { Perfil } from '@/data/db/repos/perfil';
import { pesoSugeridoBajada } from '@/domain/planner/descendentes';
import type { MetaDescendente } from '@/domain/planner/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export interface BajadaRegistrada {
  bajada: number;
  pesoLogrado: number;
  repsLogradas: number;
}

const campo = {
  ...tipografia.cuerpo,
  width: 70,
  textAlign: 'center' as const,
  backgroundColor: colores.fondo,
  borderRadius: radio.sm,
  borderWidth: 1,
  borderColor: colores.borde,
  paddingVertical: espaciado.xs,
};

function aNumero(texto: string): number | null {
  const numero = Number.parseFloat(texto.replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
}

/**
 * Serie descendente: se arranca con el peso tope y se van encadenando bajadas
 * sin descansar. No hay meta de repeticiones porque se va al fallo; lo único
 * que se muestra es el total de la última vez, para saber qué batir.
 */
export function TablaDescendente({
  meta,
  perfil,
  bajadas,
  onConfirmar,
  onQuitar,
}: {
  meta: MetaDescendente;
  perfil: Perfil;
  bajadas: BajadaRegistrada[];
  onConfirmar: (bajada: BajadaRegistrada) => void;
  onQuitar: (bajada: number) => void;
}) {
  const [pesos, setPesos] = useState<Record<number, string>>({});
  const [reps, setReps] = useState<Record<number, string>>({});
  const [abiertas, setAbiertas] = useState(1);

  const total = Math.max(abiertas, bajadas.length + (bajadas.length > 0 ? 1 : 0));
  const filas = Array.from({ length: total }, (_, indice) => indice);
  const hechas = new Map(bajadas.map((b) => [b.bajada, b]));

  const repsTotales = bajadas.reduce((suma, b) => suma + b.repsLogradas, 0);
  const objetivo = meta.repsTotalesAnteriores;

  /** El tope viene de la progresión; cada bajada, del peso de la anterior. */
  function pesoPropuesto(indice: number): string {
    const guardado = pesos[indice];
    if (guardado !== undefined) return guardado;

    const hecha = hechas.get(indice);
    if (hecha) return String(hecha.pesoLogrado);

    if (indice === 0) return meta.pesoTope === null ? '' : String(meta.pesoTope);

    const anterior =
      hechas.get(indice - 1)?.pesoLogrado ?? aNumero(pesoPropuesto(indice - 1)) ?? 0;
    return anterior > 0 ? String(pesoSugeridoBajada(anterior, perfil)) : '';
  }

  return (
    <View style={{ gap: espaciado.sm }}>
      <View
        testID="cabecera-descendente"
        style={{
          backgroundColor: colores.superficieAlta,
          borderRadius: radio.md,
          padding: espaciado.md,
          gap: espaciado.xs,
        }}
      >
        <Text style={tipografia.tenue}>Serie descendente · sin descanso entre bajadas</Text>
        <Text testID="reps-totales" style={tipografia.numero}>
          {repsTotales} reps
        </Text>
        <Text style={tipografia.tenue}>
          {objetivo === null
            ? 'Primera vez: haz las que puedas y esto será tu marca.'
            : `A batir: ${objetivo} repeticiones en ${meta.bajadasAnteriores} ${
                meta.bajadasAnteriores === 1 ? 'bajada' : 'bajadas'
              }.`}
        </Text>
      </View>

      {meta.avisoInflado && (
        <Text testID="aviso-inflado" style={{ ...tipografia.tenue, color: colores.aviso }}>
          {meta.avisoInflado}
        </Text>
      )}

      {meta.pesoInicialRequerido && (
        <Text style={tipografia.tenue}>
          Primera vez con este ejercicio: escribe el peso de arranque.
        </Text>
      )}

      {filas.map((indice) => {
        const hecha = hechas.has(indice);

        return (
          <View
            key={indice}
            testID={`bajada-${indice}`}
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
            <Text style={{ ...tipografia.tenue, width: 46 }}>
              {indice === 0 ? 'Tope' : `↓ ${indice}`}
            </Text>

            <TextInput
              testID={`peso-bajada-${indice}`}
              keyboardType="decimal-pad"
              placeholder="kg"
              placeholderTextColor={colores.textoTenue}
              value={pesoPropuesto(indice)}
              onChangeText={(texto) => setPesos({ ...pesos, [indice]: texto })}
              style={campo}
            />
            <Text style={tipografia.tenue}>kg</Text>

            <TextInput
              testID={`reps-bajada-${indice}`}
              keyboardType="number-pad"
              placeholder="reps"
              placeholderTextColor={colores.textoTenue}
              value={reps[indice] ?? String(hechas.get(indice)?.repsLogradas ?? '')}
              onChangeText={(texto) => setReps({ ...reps, [indice]: texto })}
              style={campo}
            />

            <View style={{ flex: 1 }} />

            {hecha && indice > 0 && (
              <Pressable
                testID={`quitar-bajada-${indice}`}
                accessibilityRole="button"
                onPress={() => onQuitar(indice)}
              >
                <Text style={{ ...tipografia.tenue, color: colores.error }}>Quitar</Text>
              </Pressable>
            )}

            <Pressable
              testID={`confirmar-bajada-${indice}`}
              accessibilityRole="button"
              onPress={() => {
                const peso = aNumero(pesoPropuesto(indice));
                const hechasReps = aNumero(reps[indice] ?? '');
                if (peso === null || peso <= 0 || hechasReps === null || hechasReps <= 0) return;

                onConfirmar({ bajada: indice, pesoLogrado: peso, repsLogradas: hechasReps });
                setAbiertas(Math.max(abiertas, indice + 2));
              }}
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

      <Pressable
        testID="otra-bajada"
        accessibilityRole="button"
        onPress={() => setAbiertas(total + 1)}
        style={{
          borderRadius: radio.md,
          borderWidth: 1,
          borderColor: colores.borde,
          padding: espaciado.md,
          alignItems: 'center',
        }}
      >
        <Text style={tipografia.cuerpo}>+ Otra bajada</Text>
      </Pressable>
    </View>
  );
}
