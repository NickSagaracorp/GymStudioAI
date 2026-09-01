import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { Grafica } from '@/ui/componentes/Grafica';
import { TIPOS_MEDIDA } from '@/data/db/repos/mediciones';
import type { Medicion } from '@/data/db/repos/mediciones';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const ETIQUETAS_CORTAS: Record<string, string> = {
  cuello: 'Cuello',
  pecho: 'Pecho',
  cintura: 'Cintura',
  cadera: 'Cadera',
  brazo_izq: 'Brazo izq.',
  brazo_der: 'Brazo der.',
  muslo_izq: 'Muslo izq.',
  muslo_der: 'Muslo der.',
  pantorrilla: 'Pantorrilla',
};

export default function Progreso() {
  const { mediciones, sesion } = useApp();
  const [historial, setHistorial] = useState<Medicion[]>([]);
  const [entrenamientos, setEntrenamientos] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      (async () => {
        const [lista, completadas] = await Promise.all([
          mediciones.historial(),
          sesion.completadasEntre('2000-01-01', '2999-12-31'),
        ]);
        if (!vivo) return;
        setHistorial(lista);
        setEntrenamientos(completadas.length);
      })();
      return () => {
        vivo = false;
      };
    }, [mediciones, sesion]),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.lg,
      }}
    >
      <Text style={tipografia.titulo}>Progreso</Text>

      <View
        style={{
          backgroundColor: colores.superficie,
          borderRadius: radio.md,
          padding: espaciado.md,
          gap: espaciado.xs,
        }}
      >
        <Text style={tipografia.tenue}>Entrenamientos completados</Text>
        <Text testID="entrenamientos-totales" style={tipografia.numero}>
          {entrenamientos}
        </Text>
      </View>

      <Grafica
        titulo="Peso (kg)"
        puntos={historial.map((m) => ({ etiqueta: m.fecha, valor: m.pesoKg }))}
      />

      {TIPOS_MEDIDA.map((tipo) => {
        const puntos = historial
          .filter((m) => m.medidas[tipo] !== undefined)
          .map((m) => ({ etiqueta: m.fecha, valor: m.medidas[tipo] as number }));

        return puntos.length > 0 ? (
          <Grafica key={tipo} titulo={`${ETIQUETAS_CORTAS[tipo]} (cm)`} puntos={puntos} />
        ) : null;
      })}

      <Boton titulo="Registrar medidas" onPress={() => router.push('/medicion')} />
      <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}
