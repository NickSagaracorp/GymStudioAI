import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { FormularioComida } from '@/ui/componentes/FormularioComida';
import { colores, espaciado } from '@/ui/tema';
import type { Alimento, Comida, Momento } from '@/domain/nutricion/tipos';

export default function EditarComida() {
  const { comidaId } = useLocalSearchParams<{ comidaId: string }>();
  const identificador = Number(comidaId);
  const { nutricion } = useApp();

  const [comida, setComida] = useState<Comida | null>(null);
  const [momento, setMomento] = useState<Momento>('almuerzo');
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;

    (async () => {
      // La comida puede ser de cualquier día, así que se busca por su fecha.
      const hoy = new Date();
      for (let atras = 0; atras < 60 && vivo; atras += 1) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - atras);
        const dia = fecha.toISOString().slice(0, 10);

        const encontrada = (await nutricion.comidasDe(dia)).find((c) => c.id === identificador);
        if (encontrada) {
          if (!vivo) return;
          setComida(encontrada);
          setMomento(encontrada.momento);
          setAlimentos(encontrada.alimentos);
          return;
        }
      }
    })();

    return () => {
      vivo = false;
    };
  }, [identificador, nutricion]);

  async function guardar() {
    if (guardando) return;
    setGuardando(true);
    await nutricion.reemplazarAlimentos(identificador, alimentos);
    router.back();
  }

  async function borrar() {
    await nutricion.borrarComida(identificador);
    router.back();
  }

  if (!comida) return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <FormularioComida
        titulo="Editar comida"
        momento={momento}
        onMomento={setMomento}
        alimentos={alimentos}
        onAlimentos={setAlimentos}
        onGuardar={guardar}
        onCancelar={() => router.back()}
        etiquetaGuardar="Guardar cambios"
        guardando={guardando}
      />
      <View style={{ padding: espaciado.lg }}>
        <Boton testID="borrar-comida" titulo="Borrar comida" variante="secundario" onPress={borrar} />
      </View>
    </View>
  );
}
