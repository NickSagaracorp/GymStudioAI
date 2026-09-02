import { ScrollView, Text, View } from 'react-native';
import { GifEjercicio } from '@/ui/componentes/GifEjercicio';
import { TablaSeries } from '@/ui/componentes/TablaSeries';
import type { SerieConfirmada } from '@/ui/componentes/TablaSeries';
import { TablaDescendente } from '@/ui/componentes/TablaDescendente';
import type { BajadaRegistrada } from '@/ui/componentes/TablaDescendente';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { nombreMusculo } from '@/ui/nombres';
import type { EjercicioDia, Meta, MetaDescendente } from '@/domain/planner/tipos';
import type { Perfil } from '@/data/db/repos/perfil';
import type { Ejercicio } from '@/data/catalog/tipos';

const chip = {
  ...tipografia.tenue,
  paddingHorizontal: espaciado.sm,
  paddingVertical: espaciado.xs,
  borderRadius: radio.sm,
  overflow: 'hidden' as const,
};

/**
 * Una página de la sesión: la ficha del ejercicio, el interruptor de serie
 * descendente y la tabla de registro correspondiente (normal o descendente).
 */
export function TarjetaEjercicio({
  ejercicio,
  ficha,
  meta,
  metaDesc,
  perfil,
  esDescendente,
  hechas,
  bajadas,
  ancho,
  onConfirmar,
  onConfirmarBajada,
  onQuitarBajada,
  onAlternarDescendente,
}: {
  ejercicio: EjercicioDia;
  ficha: Ejercicio;
  meta: Meta;
  metaDesc: MetaDescendente;
  perfil: Perfil;
  esDescendente: boolean;
  hechas: SerieConfirmada[];
  bajadas: BajadaRegistrada[];
  ancho: number;
  onConfirmar: (serie: SerieConfirmada) => void;
  onConfirmarBajada: (registro: BajadaRegistrada) => void;
  onQuitarBajada: (indice: number) => void;
  onAlternarDescendente: () => void;
}) {
  return (
    <ScrollView
      style={{ width: ancho }}
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

      {ejercicio.equipamiento !== 'bodyweight' && (
        <Text
          testID={`interruptor-descendente-${ejercicio.ejercicioId}`}
          accessibilityRole="button"
          accessibilityState={{ selected: esDescendente }}
          onPress={onAlternarDescendente}
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
          perfil={perfil}
          bajadas={bajadas}
          onConfirmar={onConfirmarBajada}
          onQuitar={onQuitarBajada}
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
            conCarga={ejercicio.equipamiento !== 'bodyweight'}
            registradas={hechas}
            onConfirmar={onConfirmar}
          />
        </>
      )}
    </ScrollView>
  );
}
