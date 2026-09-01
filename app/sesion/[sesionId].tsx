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
import { TablaDescendente } from '@/ui/componentes/TablaDescendente';
import type { BajadaRegistrada } from '@/ui/componentes/TablaDescendente';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { nombreMusculo } from '@/ui/nombres';
import { calcularMeta } from '@/domain/planner/progresion';
import { calcularMetaDescendente } from '@/domain/planner/descendentes';
import type { EjercicioDia, Meta, MetaDescendente } from '@/domain/planner/tipos';
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
  const { programa, sesion, catalogo, perfil, ejercicios: preferencias } = useApp();

  const [ejercicios, setEjercicios] = useState<EjercicioDia[]>([]);
  const [nombreDia, setNombreDia] = useState('');
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [metasDescendentes, setMetasDescendentes] = useState<Record<string, MetaDescendente>>({});
  const [descendentes, setDescendentes] = useState<Set<string>>(new Set());
  const [hechas, setHechas] = useState<Record<string, SerieConfirmada[]>>({});
  const [bajadas, setBajadas] = useState<Record<string, BajadaRegistrada[]>>({});
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

      const marcados = new Set(await preferencias.descendentes());

      const registradas = await sesion.seriesDe(identificador);
      const porEjercicio: Record<string, SerieConfirmada[]> = {};
      const porBajada: Record<string, BajadaRegistrada[]> = {};

      for (const serie of registradas) {
        if (marcados.has(serie.ejercicioId)) {
          porBajada[serie.ejercicioId] = [
            ...(porBajada[serie.ejercicioId] ?? []),
            {
              bajada: serie.bajada,
              pesoLogrado: serie.pesoLogrado ?? 0,
              repsLogradas: serie.repsLogradas,
            },
          ];
        } else {
          porEjercicio[serie.ejercicioId] = [
            ...(porEjercicio[serie.ejercicioId] ?? []),
            {
              numero: serie.numero,
              pesoLogrado: serie.pesoLogrado,
              repsLogradas: serie.repsLogradas,
            },
          ];
        }
      }

      const calculadas: Record<string, Meta> = {};
      const calculadasDesc: Record<string, MetaDescendente> = {};

      for (const ejercicio of encontrado.ejercicios) {
        const historial = (await sesion.historialDe(ejercicio.ejercicioId)).filter(
          (s) => s.sesionId !== identificador,
        );

        calculadas[ejercicio.ejercicioId] = calcularMeta(historial, ejercicio, miPerfil);
        calculadasDesc[ejercicio.ejercicioId] = calcularMetaDescendente(
          historial,
          ejercicio.ejercicioId,
          miPerfil,
        );
      }

      if (!vivo) return;
      setDatosPerfil(miPerfil);
      setNombreDia(`Semana ${encontrado.semana} · ${encontrado.nombre}`);
      setEjercicios(encontrado.ejercicios);
      setMetas(calculadas);
      setMetasDescendentes(calculadasDesc);
      setDescendentes(marcados);
      setHechas(porEjercicio);
      setBajadas(porBajada);
    })();

    return () => {
      vivo = false;
    };
  }, [identificador, programa, sesion, perfil, preferencias]);

  const totalSeries = useMemo(
    () => ejercicios.reduce((suma, e) => suma + (metas[e.ejercicioId]?.series ?? e.series), 0),
    [ejercicios, metas],
  );

  const seriesHechas = useMemo(
    () =>
      Object.values(hechas).reduce((suma, lista) => suma + lista.length, 0) +
      // Una descendente cuenta como una serie del día, no como una por bajada.
      Object.values(bajadas).filter((lista) => lista.length > 0).length,
    [hechas, bajadas],
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

  const confirmarBajada = useCallback(
    async (ejercicio: EjercicioDia, registro: BajadaRegistrada) => {
      await sesion.registrarSerie({
        sesionId: identificador,
        ejercicioId: ejercicio.ejercicioId,
        numero: 1,
        bajada: registro.bajada,
        pesoMeta: null,
        repsMeta: 0,
        pesoLogrado: registro.pesoLogrado,
        repsLogradas: registro.repsLogradas,
      });

      setBajadas((anterior) => {
        const lista = (anterior[ejercicio.ejercicioId] ?? []).filter(
          (b) => b.bajada !== registro.bajada,
        );
        return {
          ...anterior,
          [ejercicio.ejercicioId]: [...lista, registro].sort((a, b) => a.bajada - b.bajada),
        };
      });
    },
    [identificador, sesion],
  );

  const quitarBajada = useCallback(
    async (ejercicioId: string, indice: number) => {
      await sesion.borrarBajada(identificador, ejercicioId, indice);
      setBajadas((anterior) => ({
        ...anterior,
        [ejercicioId]: (anterior[ejercicioId] ?? []).filter((b) => b.bajada !== indice),
      }));
    },
    [identificador, sesion],
  );

  const alternarDescendente = useCallback(
    async (ejercicioId: string) => {
      const activo = !descendentes.has(ejercicioId);
      await preferencias.marcarDescendente(ejercicioId, activo);

      setDescendentes((anterior) => {
        const copia = new Set(anterior);
        if (activo) copia.add(ejercicioId);
        else copia.delete(ejercicioId);
        return copia;
      });
    },
    [descendentes, preferencias],
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
          const metaDesc = metasDescendentes[item.ejercicioId];
          const esDescendente = descendentes.has(item.ejercicioId);
          if (!ficha || !meta || !metaDesc) return <View style={{ width: ANCHO }} />;

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

              {item.equipamiento !== 'bodyweight' && (
                <Text
                  testID={`interruptor-descendente-${item.ejercicioId}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: esDescendente }}
                  onPress={() => alternarDescendente(item.ejercicioId)}
                  style={{
                    ...tipografia.tenue,
                    alignSelf: 'flex-start',
                    paddingVertical: espaciado.sm,
                    paddingHorizontal: espaciado.md,
                    borderRadius: radio.sm,
                    overflow: 'hidden',
                    backgroundColor: esDescendente ? colores.acento : colores.superficieAlta,
                    color: esDescendente ? colores.acentoTexto : colores.texto,
                  }}
                >
                  {esDescendente ? 'Serie descendente activada' : 'Hacer serie descendente'}
                </Text>
              )}

              {esDescendente ? (
                <TablaDescendente
                  meta={metaDesc}
                  perfil={datosPerfil}
                  bajadas={bajadas[item.ejercicioId] ?? []}
                  onConfirmar={(registro) => confirmarBajada(item, registro)}
                  onQuitar={(indice) => quitarBajada(item.ejercicioId, indice)}
                />
              ) : (
                <>
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
                </>
              )}
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
