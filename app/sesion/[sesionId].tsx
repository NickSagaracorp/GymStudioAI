import { useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, FlatList, Modal, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { BarraEjercicios } from '@/ui/componentes/BarraEjercicios';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CronometroDescanso } from '@/ui/componentes/CronometroDescanso';
import { TarjetaEjercicio } from '@/ui/componentes/TarjetaEjercicio';
import { ejercicioCompleto } from '@/domain/gamificacion/logros';
import { useSesion } from '@/ui/hooks/useSesion';
import { colores, espaciado, tipografia } from '@/ui/tema';
import type { EjercicioDia } from '@/domain/planner/tipos';

const ANCHO = Dimensions.get('window').width;

export default function PantallaSesion() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const identificador = Number(sesionId);
  const { catalogo } = useApp();

  const {
    ejercicios,
    nombreDia,
    metas,
    metasDescendentes,
    descendentes,
    hechas,
    bajadas,
    descanso,
    setDescanso,
    datosPerfil,
    totalSeries,
    seriesHechas,
    confirmar,
    confirmarBajada,
    quitarBajada,
    alternarDescendente,
  } = useSesion(identificador);

  const lista = useRef<FlatList<EjercicioDia>>(null);
  const [indice, setIndice] = useState(0);

  const completos = useMemo(
    () =>
      ejercicios.map((ejercicio) =>
        ejercicioCompleto({
          esDescendente: descendentes.has(ejercicio.ejercicioId),
          seriesRegistradas: (hechas[ejercicio.ejercicioId] ?? []).length,
          seriesMeta: metas[ejercicio.ejercicioId]?.series ?? ejercicio.series,
          bajadasRegistradas: (bajadas[ejercicio.ejercicioId] ?? []).length,
        }),
      ),
    [ejercicios, descendentes, hechas, metas, bajadas],
  );

  function irA(destino: number) {
    const limitado = Math.max(0, Math.min(ejercicios.length - 1, destino));
    setIndice(limitado);
    lista.current?.scrollToIndex({ index: limitado, animated: true });
  }

  function siguiente() {
    if (completos[indice]) return irA(indice + 1);

    const ficha = catalogo.porId(ejercicios[indice]?.ejercicioId ?? '');
    Alert.alert(
      'Te faltan series',
      `Aún no has confirmado todas las series de ${ficha?.nombre ?? 'este ejercicio'}.`,
      [
        { text: 'Quedarme', style: 'cancel' },
        { text: 'Seguir igual', onPress: () => irA(indice + 1) },
      ],
    );
  }

  function terminar() {
    const pendientes = completos.filter((completo) => !completo).length;
    if (pendientes === 0) return router.replace(`/resumen/${identificador}`);

    Alert.alert(
      'Quedan ejercicios',
      `Te faltan ${pendientes} ${pendientes === 1 ? 'ejercicio' : 'ejercicios'} del día.`,
      [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Terminar igual', onPress: () => router.replace(`/resumen/${identificador}`) },
      ],
    );
  }

  if (!datosPerfil || ejercicios.length === 0) {
    return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo, paddingTop: espaciado.xl * 2 }}>
      <View style={{ paddingHorizontal: espaciado.lg, gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>{nombreDia}</Text>
        <Text style={tipografia.tenue}>
          Ejercicio {indice + 1} de {ejercicios.length} · {seriesHechas} de {totalSeries} series
        </Text>
        <BarraProgreso valor={seriesHechas} total={totalSeries} />
      </View>

      <FlatList
        ref={lista}
        data={ejercicios}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(evento) =>
          setIndice(Math.round(evento.nativeEvent.contentOffset.x / ANCHO))
        }
        keyExtractor={(item) => item.ejercicioId}
        renderItem={({ item }) => {
          const ficha = catalogo.porId(item.ejercicioId);
          const meta = metas[item.ejercicioId];
          const metaDesc = metasDescendentes[item.ejercicioId];
          const esDescendente = descendentes.has(item.ejercicioId);
          if (!ficha || !meta || !metaDesc) return <View style={{ width: ANCHO }} />;

          return (
            <TarjetaEjercicio
              ejercicio={item}
              ficha={ficha}
              meta={meta}
              metaDesc={metaDesc}
              perfil={datosPerfil}
              esDescendente={esDescendente}
              hechas={hechas[item.ejercicioId] ?? []}
              bajadas={bajadas[item.ejercicioId] ?? []}
              ancho={ANCHO}
              onConfirmar={(serie) => confirmar(item, serie)}
              onConfirmarBajada={(registro) => confirmarBajada(item, registro)}
              onQuitarBajada={(bajada) => quitarBajada(item.ejercicioId, bajada)}
              onAlternarDescendente={() => alternarDescendente(item.ejercicioId)}
            />
          );
        }}
      />

      <BarraEjercicios
        total={ejercicios.length}
        indice={indice}
        completos={completos}
        onAnterior={() => irA(indice - 1)}
        onSiguiente={siguiente}
        onTerminar={terminar}
        onIrA={irA}
      />

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
