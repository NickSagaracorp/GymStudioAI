import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { TIPOS_MEDIDA } from '@/data/db/repos/mediciones';
import type { TipoMedida } from '@/data/db/repos/mediciones';
import { colores, espaciado, tipografia } from '@/ui/tema';

const ETIQUETAS: Record<TipoMedida, string> = {
  cuello: 'Cuello',
  pecho: 'Pecho',
  cintura: 'Cintura',
  cadera: 'Cadera',
  brazo_izq: 'Brazo izquierdo',
  brazo_der: 'Brazo derecho',
  muslo_izq: 'Muslo izquierdo',
  muslo_der: 'Muslo derecho',
  pantorrilla: 'Pantorrilla',
};

export default function Medicion() {
  const { mediciones } = useApp();
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [valores, setValores] = useState<Partial<Record<TipoMedida, number>>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (pesoKg === null || guardando) return;
    setGuardando(true);

    await mediciones.guardar({
      fecha: new Date().toISOString().slice(0, 10),
      pesoKg,
      notas: null,
      medidas: valores,
    });
    router.back();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.sm,
      }}
    >
      <Text style={tipografia.titulo}>Medidas de hoy</Text>

      <CampoNumero
        etiqueta="Peso"
        sufijo="kg"
        valor={pesoKg}
        onCambio={setPesoKg}
        testID="campo-peso"
      />

      <Text style={tipografia.tenue}>El resto es opcional. Guarda solo lo que midas.</Text>

      {TIPOS_MEDIDA.map((tipo) => (
        <CampoNumero
          key={tipo}
          etiqueta={ETIQUETAS[tipo]}
          sufijo="cm"
          valor={valores[tipo] ?? null}
          onCambio={(valor) =>
            setValores((anterior) => {
              const siguiente = { ...anterior };
              if (valor === null) delete siguiente[tipo];
              else siguiente[tipo] = valor;
              return siguiente;
            })
          }
          testID={`campo-${tipo}`}
        />
      ))}

      <Boton
        testID="guardar-medicion"
        titulo="Guardar"
        onPress={guardar}
        deshabilitado={pesoKg === null || guardando}
      />
      <Boton titulo="Cancelar" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}
