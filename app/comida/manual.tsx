import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { ALIMENTO_VACIO } from '@/ui/componentes/EditorAlimentos';
import { FormularioComida } from '@/ui/componentes/FormularioComida';
import type { Alimento, Momento } from '@/domain/nutricion/tipos';

function momentoSegunHora(): Momento {
  const hora = new Date().getHours();
  if (hora < 11) return 'desayuno';
  if (hora < 17) return 'almuerzo';
  if (hora < 22) return 'cena';
  return 'snack';
}

export default function ComidaManual() {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  const { nutricion } = useApp();

  const [momento, setMomento] = useState<Momento>(momentoSegunHora());
  const [alimentos, setAlimentos] = useState<Alimento[]>([{ ...ALIMENTO_VACIO }]);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (guardando) return;
    setGuardando(true);

    await nutricion.guardarComida({
      fecha: fecha && fecha !== '' ? fecha : new Date().toISOString().slice(0, 10),
      momento,
      descripcion: null,
      fotoUri: null,
      origen: 'manual',
      alimentos,
    });

    router.back();
  }

  return (
    <FormularioComida
      titulo="Añadir a mano"
      momento={momento}
      onMomento={setMomento}
      alimentos={alimentos}
      onAlimentos={setAlimentos}
      onGuardar={guardar}
      onCancelar={() => router.back()}
      guardando={guardando}
    />
  );
}
