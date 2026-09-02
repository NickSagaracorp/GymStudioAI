import { Dimensions, FlatList, Modal, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { CronometroDescanso } from '@/ui/componentes/CronometroDescanso';
import { TarjetaEjercicio } from '@/ui/componentes/TarjetaEjercicio';
import { useSesion } from '@/ui/hooks/useSesion';
import { colores, espaciado, tipografia } from '@/ui/tema';

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
              onQuitarBajada={(indice) => quitarBajada(item.ejercicioId, indice)}
              onAlternarDescendente={() => alternarDescendente(item.ejercicioId)}
            />
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
