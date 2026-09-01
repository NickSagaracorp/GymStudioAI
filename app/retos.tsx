import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import type { Reto, TipoReto } from '@/data/db/repos/retos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

interface Plantilla {
  tipo: TipoReto;
  etiqueta: string;
  metaPorDefecto: number;
  titulo: (meta: number) => string;
}

const PLANTILLAS: Plantilla[] = [
  {
    tipo: 'sesiones',
    etiqueta: 'Entrenamientos',
    metaPorDefecto: 12,
    titulo: (meta) => `${meta} entrenamientos en 30 días`,
  },
  {
    tipo: 'volumen',
    etiqueta: 'Volumen (kg)',
    metaPorDefecto: 20000,
    titulo: (meta) => `${meta} kg de volumen en 30 días`,
  },
];

const DIAS_DE_RETO = 30;

function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

const ESTADOS: Record<string, string> = {
  activo: 'En marcha',
  logrado: 'Completado',
  fallido: 'Vencido',
};

export default function Retos() {
  const { retos } = useApp();
  const [lista, setLista] = useState<Reto[]>([]);
  const [indicePlantilla, setIndicePlantilla] = useState(0);
  const [meta, setMeta] = useState<number | null>(PLANTILLAS[0]?.metaPorDefecto ?? 12);

  const recargar = useCallback(() => {
    let vivo = true;
    retos.todos().then((todos) => {
      if (vivo) setLista(todos);
    });
    return () => {
      vivo = false;
    };
  }, [retos]);

  useFocusEffect(recargar);

  async function crear() {
    const plantilla = PLANTILLAS[indicePlantilla];
    if (!plantilla || meta === null || meta <= 0) return;

    await retos.crear({
      titulo: plantilla.titulo(meta),
      tipo: plantilla.tipo,
      ejercicioId: null,
      metaValor: meta,
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: enDias(DIAS_DE_RETO),
    });
    recargar();
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.md,
      }}
    >
      <Text style={tipografia.titulo}>Retos</Text>
      <Text style={tipografia.tenue}>Un objetivo medible con fecha límite, a 30 días.</Text>

      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        {PLANTILLAS.map((plantilla, indice) => {
          const activa = indicePlantilla === indice;
          return (
            <Text
              key={plantilla.tipo}
              testID={`plantilla-${plantilla.tipo}`}
              accessibilityRole="button"
              onPress={() => {
                setIndicePlantilla(indice);
                setMeta(plantilla.metaPorDefecto);
              }}
              style={{
                ...tipografia.cuerpo,
                paddingVertical: espaciado.sm,
                paddingHorizontal: espaciado.md,
                borderRadius: radio.sm,
                overflow: 'hidden',
                backgroundColor: activa ? colores.acento : colores.superficieAlta,
                color: activa ? colores.acentoTexto : colores.texto,
              }}
            >
              {plantilla.etiqueta}
            </Text>
          );
        })}
      </View>

      <CampoNumero etiqueta="Meta" valor={meta} onCambio={setMeta} testID="campo-meta" />
      <Boton
        testID="crear-reto"
        titulo="Crear reto"
        onPress={crear}
        deshabilitado={meta === null || meta <= 0}
      />

      {lista.map((reto) => (
        <View
          key={reto.id}
          style={{
            backgroundColor: colores.superficie,
            borderRadius: radio.md,
            padding: espaciado.md,
            gap: espaciado.sm,
          }}
        >
          <Text style={tipografia.cuerpo}>{reto.titulo}</Text>
          <BarraProgreso valor={reto.valorActual} total={reto.metaValor} />
          <Text style={tipografia.tenue}>
            {ESTADOS[reto.estado]} · {Math.round(reto.valorActual)} de {reto.metaValor}
          </Text>
        </View>
      ))}

      <Boton titulo="Volver" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}
