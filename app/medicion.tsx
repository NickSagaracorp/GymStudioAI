import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { Celebracion } from '@/ui/componentes/Celebracion';
import { TIPOS_MEDIDA } from '@/data/db/repos/mediciones';
import type { TipoMedida } from '@/data/db/repos/mediciones';
import { evaluarMedicion } from '@/domain/gamificacion/mediciones';
import type { Veredicto } from '@/domain/gamificacion/mediciones';
import { calcularRacha } from '@/domain/gamificacion/racha';
import { diaLocal, sumarDias } from '@/domain/gamificacion/fechas';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

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
  const { mediciones, perfil, sesion } = useApp();
  const [pesoKg, setPesoKg] = useState<number | null>(null);
  const [valores, setValores] = useState<Partial<Record<TipoMedida, number>>>({});
  const [guardando, setGuardando] = useState(false);
  const [veredicto, setVeredicto] = useState<Veredicto | null>(null);

  async function guardar() {
    if (pesoKg === null || guardando) return;
    setGuardando(true);

    // El historial se lee antes de guardar: la última entrada es con la que hay
    // que comparar, y después de guardar la última sería la de hoy.
    const historial = await mediciones.historial();
    const anterior = historial[historial.length - 1] ?? null;

    const hoy = diaLocal(new Date());
    await mediciones.guardar({ fecha: hoy, pesoKg, notas: null, medidas: valores });

    const [miPerfil, fechas] = await Promise.all([perfil.obtener(), sesion.fechasCompletadas()]);
    const desdeHaceUnMes = sumarDias(hoy, -30);

    setVeredicto(
      evaluarMedicion(
        miPerfil?.objetivo ?? 'volumen',
        anterior,
        { id: 0, fecha: hoy, pesoKg, notas: null, medidas: valores },
        {
          entrenamientosDelMes: fechas.filter((fecha) => fecha >= desdeHaceUnMes).length,
          rachaActual: calcularRacha(fechas, miPerfil?.diasSemana ?? [], hoy).actual,
        },
      ),
    );
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
        deshabilitado={pesoKg === null || guardando || veredicto !== null}
      />
      <Boton titulo="Cancelar" variante="secundario" onPress={() => router.back()} />

      {veredicto?.hayProgreso && (
        <Celebracion
          visible
          nivel="grande"
          titulo={veredicto.titulo}
          detalle={veredicto.detalle}
          onCerrar={() => router.back()}
        />
      )}

      {veredicto && !veredicto.hayProgreso && (
        <View
          style={{
            backgroundColor: colores.superficie,
            borderRadius: radio.md,
            padding: espaciado.md,
            gap: espaciado.sm,
          }}
        >
          <Text style={tipografia.seccion}>{veredicto.titulo}</Text>
          <Text style={tipografia.tenue}>{veredicto.detalle}</Text>
          <Boton testID="volver-medicion" titulo="Volver" onPress={() => router.back()} />
        </View>
      )}
    </ScrollView>
  );
}
