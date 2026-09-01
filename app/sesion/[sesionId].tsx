import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CronometroDescanso } from '@/ui/componentes/CronometroDescanso';
import { GifEjercicio } from '@/ui/componentes/GifEjercicio';
import { TablaSeries } from '@/ui/componentes/TablaSeries';
import type { SerieConfirmada } from '@/ui/componentes/TablaSeries';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { nombreMusculo } from '@/ui/nombres';
import { calcularMeta } from '@/domain/planner/progresion';
import type { EjercicioDia, Meta } from '@/domain/planner/tipos';
import type { Perfil } from '@/data/db/repos/perfil';

const ANCHO = Dimensions.get('window').width;

const chip = {
  ...tipografia.tenue,
  paddingHorizontal: espaciado.sm,
  paddingVertical: espaciado.xs,
  borderRadius: radio.sm,
  overflow: 'hidden' as const,
};

export default function PantallaSesion() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const identificador = Number(sesionId);
  const { programa, sesion, catalogo, perfil } = useApp();

  const [ejercicios, setEjercicios] = useState<EjercicioDia[]>([]);
  const [nombreDia, setNombreDia] = useState('');
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [hechas, setHechas] = useState<Record<string, SerieConfirmada[]>>({});
  const [descanso, setDescanso] = useState<number | null>(null);
  const [datosPerfil, setDatosPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const [miPerfil, activo] = await Promise.all([perfil.obtener(), programa.activo()]);
      if (!miPerfil || !activo || !vivo) return;

      const dias = await programa.diasDe(activo.id);
      const borradores = await Promise.all(
        dias.map(async (dia) => ({ dia, sesionId: (await sesion.borradorDe(dia.id))?.id })),
      );
      const encontrado = borradores.find((fila) => fila.sesionId === identificador)?.dia;
      if (!encontrado || !vivo) return;

      const registradas = await sesion.seriesDe(identificador);
      const porEjercicio: Record<string, SerieConfirmada[]> = {};
      for (const serie of registradas) {
        porEjercicio[serie.ejercicioId] = [
          ...(porEjercicio[serie.ejercicioId] ?? []),
          {
            numero: serie.numero,
            pesoLogrado: serie.pesoLogrado,
            repsLogradas: serie.repsLogradas,
          },
        ];
      }

      const calculadas: Record<string, Meta> = {};
      for (const ejercicio of encontrado.ejercicios) {
        const historial = await sesion.historialDe(ejercicio.ejercicioId);
        calculadas[ejercicio.ejercicioId] = calcularMeta(
          historial.filter((s) => s.sesionId !== identificador),
          ejercicio,
          miPerfil,
        );
      }

      if (!vivo) return;
      setDatosPerfil(miPerfil);
      setNombreDia(`Semana ${encontrado.semana} · ${encontrado.nombre}`);
      setEjercicios(encontrado.ejercicios);
      setMetas(calculadas);
      setHechas(porEjercicio);
    })();

    return () => {
      vivo = false;
    };
  }, [identificador, programa, sesion, perfil]);

  const totalSeries = useMemo(
    () => ejercicios.reduce((suma, e) => suma + (metas[e.ejercicioId]?.series ?? e.series), 0),
    [ejercicios, metas],
  );

  const seriesHechas = useMemo(
    () => Object.values(hechas).reduce((suma, lista) => suma + lista.length, 0),
    [hechas],
  );

  const confirmar = useCallback(
    async (ejercicio: EjercicioDia, serie: SerieConfirmada) => {
      const meta = metas[ejercicio.ejercicioId];

      await sesion.registrarSerie({
        sesionId: identificador,
        ejercicioId: ejercicio.ejercicioId,
        numero: serie.numero,
        pesoMeta: meta?.pesoMeta ?? null,
        repsMeta: meta?.repsMeta ?? ejercicio.repMin,
        pesoLogrado: serie.pesoLogrado,
        repsLogradas: serie.repsLogradas,
      });

      setHechas((anterior) => {
        const lista = (anterior[ejercicio.ejercicioId] ?? []).filter(
          (s) => s.numero !== serie.numero,
        );
        return { ...anterior, [ejercicio.ejercicioId]: [...lista, serie] };
      });
      setDescanso(ejercicio.descansoSeg);
    },
    [identificador, metas, sesion],
  );

  if (!datosPerfil || ejercicios.length === 0) {
    return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo, paddingTop: espaciado.xl * 2 }}>
      <View style={{ paddingHorizontal: espaciado.lg, gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>{nombreDia}</Text>
        <Text style={tipografia.tenue}>
          {seriesHechas} de {totalSeries} series
        </Text>
        <BarraProgreso valor={seriesHechas} total={totalSeries} />
      </View>

      <FlatList
        data={ejercicios}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.ejercicioId}
        renderItem={({ item }) => {
          const ficha = catalogo.porId(item.ejercicioId);
          const meta = metas[item.ejercicioId];
          if (!ficha || !meta) return <View style={{ width: ANCHO }} />;

          return (
            <ScrollView
              style={{ width: ANCHO }}
              contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.md }}
            >
              <GifEjercicio ejercicio={ficha} />
              <Text style={tipografia.seccion}>{ficha.nombre}</Text>

              <View style={{ flexDirection: 'row', gap: espaciado.sm, flexWrap: 'wrap' }}>
                <Text
                  style={{
                    ...chip,
                    color: colores.acentoTexto,
                    backgroundColor: colores.acento,
                  }}
                >
                  {nombreMusculo(ficha.musculo)}
                </Text>
                {ficha.musculosSecundarios.map((musculo) => (
                  <Text
                    key={musculo}
                    style={{
                      ...chip,
                      color: colores.texto,
                      backgroundColor: colores.superficieAlta,
                    }}
                  >
                    {nombreMusculo(musculo)}
                  </Text>
                ))}
              </View>

              {meta.pesoInicialRequerido && (
                <Text style={tipografia.tenue}>
                  Primera vez con este ejercicio: escribe el peso con el que empiezas.
                </Text>
              )}

              <TablaSeries
                meta={meta}
                conCarga={item.equipamiento !== 'bodyweight'}
                registradas={hechas[item.ejercicioId] ?? []}
                onConfirmar={(serie) => confirmar(item, serie)}
              />
            </ScrollView>
          );
        }}
      />

      <View style={{ padding: espaciado.lg }}>
        <Boton
          testID="terminar-sesion"
          titulo="Terminar entrenamiento"
          onPress={() => router.replace(`/resumen/${identificador}`)}
        />
      </View>

      <Modal visible={descanso !== null} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000AA' }}>
          {descanso !== null && (
            <CronometroDescanso segundos={descanso} onFin={() => setDescanso(null)} />
          )}
        </View>
      </Modal>
    </View>
  );
}
