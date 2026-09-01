import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraMacro, LineaTope } from '@/ui/componentes/BarraMacro';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { progresoContra, totalesDelDia } from '@/domain/nutricion/totales';
import type { ProgresoDia } from '@/domain/nutricion/totales';
import { MACROS_CERO, MOMENTOS } from '@/domain/nutricion/tipos';
import type { Comida, Macros, Momento, ObjetivoNutricional } from '@/domain/nutricion/tipos';

const NOMBRE_MOMENTO: Record<Momento, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack: 'Snacks',
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const nueva = new Date(`${fecha}T12:00:00`);
  nueva.setDate(nueva.getDate() + dias);
  return nueva.toISOString().slice(0, 10);
}

const tarjeta = {
  backgroundColor: colores.superficie,
  borderRadius: radio.md,
  padding: espaciado.md,
  gap: espaciado.sm,
};

export default function PantallaComida() {
  const { nutricion } = useApp();

  const [fecha, setFecha] = useState(hoyIso());
  const [comidas, setComidas] = useState<Comida[]>([]);
  const [objetivo, setObjetivo] = useState<ObjetivoNutricional | null>(null);
  const [total, setTotal] = useState<Macros>(MACROS_CERO);
  const [progreso, setProgreso] = useState<ProgresoDia | null>(null);
  const [detalle, setDetalle] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      (async () => {
        const [lista, meta] = await Promise.all([nutricion.comidasDe(fecha), nutricion.objetivo()]);
        if (!vivo) return;

        const { total: suma } = totalesDelDia(lista);
        setComidas(lista);
        setObjetivo(meta);
        setTotal(suma);
        setProgreso(meta ? progresoContra(meta, suma) : null);
      })();

      return () => {
        vivo = false;
      };
    }, [nutricion, fecha]),
  );

  const esHoy = fecha === hoyIso();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: espaciado.md }}>
        <Pressable testID="dia-anterior" onPress={() => setFecha(sumarDias(fecha, -1))}>
          <Text style={tipografia.seccion}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={tipografia.titulo}>{esHoy ? 'Hoy' : fecha}</Text>
          {!esHoy && <Text style={tipografia.tenue}>{fecha}</Text>}
        </View>
        {!esHoy && (
          <Pressable testID="dia-siguiente" onPress={() => setFecha(sumarDias(fecha, 1))}>
            <Text style={tipografia.seccion}>›</Text>
          </Pressable>
        )}
      </View>

      {progreso && objetivo ? (
        <View style={tarjeta} testID="resumen-macros">
          <BarraMacro etiqueta="Calorías" progreso={progreso.kcal} unidad="kcal" destacada />
          <BarraMacro etiqueta="Proteína" progreso={progreso.proteina} />
          <BarraMacro etiqueta="Carbohidratos" progreso={progreso.carbos} />
          <BarraMacro etiqueta="Grasa" progreso={progreso.grasa} />

          <Pressable testID="ver-detalle" onPress={() => setDetalle(!detalle)}>
            <Text style={{ ...tipografia.tenue, color: colores.acento }}>
              {detalle ? 'Ocultar detalle' : 'Ver detalle'}
            </Text>
          </Pressable>

          {detalle && (
            <View style={{ gap: espaciado.xs }} testID="detalle-macros">
              <BarraMacro etiqueta="Fibra" progreso={progreso.fibra} />
              <LineaTope
                etiqueta="Azúcares"
                consumido={total.azucaresG}
                tope={objetivo.topeAzucaresG}
                excedido={progreso.azucaresExcedidos}
              />
              <LineaTope
                etiqueta="Grasa saturada"
                consumido={total.grasaSaturadaG}
                tope={objetivo.topeSaturadaG}
                excedido={progreso.saturadaExcedida}
              />
              <LineaTope
                etiqueta="Grasa trans"
                consumido={total.grasaTransG}
                tope={null}
                excedido={progreso.transExcedida}
              />
              <LineaTope
                etiqueta="Grasa insaturada"
                consumido={Math.max(0, total.grasaG - total.grasaSaturadaG - total.grasaTransG)}
                tope={null}
                excedido={false}
              />
            </View>
          )}
        </View>
      ) : (
        <View style={tarjeta}>
          <Text style={tipografia.seccion}>Sin objetivo todavía</Text>
          <Text style={tipografia.tenue}>
            Calcula tus objetivos de calorías y macros desde Ajustes.
          </Text>
        </View>
      )}

      {MOMENTOS.map((momento) => {
        const delMomento = comidas.filter((c) => c.momento === momento);
        if (delMomento.length === 0) return null;

        return (
          <View key={momento} style={{ gap: espaciado.sm }}>
            <Text style={tipografia.seccion}>{NOMBRE_MOMENTO[momento]}</Text>
            {delMomento.map((comida) => {
              const kcal = comida.alimentos.reduce((suma, a) => suma + a.kcal, 0);
              return (
                <Pressable
                  key={comida.id}
                  testID={`comida-${comida.id}`}
                  onPress={() => router.push(`/comida/${comida.id}`)}
                  style={{ ...tarjeta, flexDirection: 'row', alignItems: 'center' }}
                >
                  {comida.fotoUri && (
                    <Image
                      source={{ uri: comida.fotoUri }}
                      style={{ width: 56, height: 56, borderRadius: radio.sm }}
                    />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={tipografia.cuerpo}>
                      {comida.descripcion?.trim() ||
                        comida.alimentos.map((a) => a.nombre).join(', ') ||
                        'Comida sin alimentos'}
                    </Text>
                    <Text style={tipografia.tenue}>
                      {Math.round(kcal)} kcal · {comida.alimentos.length} alimentos
                      {comida.origen === 'ia' ? ' · IA' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}

      {comidas.length === 0 && (
        <Text testID="sin-comidas" style={tipografia.tenue}>
          No has registrado nada este día.
        </Text>
      )}

      <View style={{ gap: espaciado.sm }}>
        <Boton
          testID="anadir-con-foto"
          titulo="Añadir con foto"
          onPress={() => router.push(`/comida/nueva?fecha=${fecha}`)}
        />
        <Boton
          testID="anadir-a-mano"
          titulo="Añadir a mano"
          variante="secundario"
          onPress={() => router.push(`/comida/manual?fecha=${fecha}`)}
        />
      </View>
    </ScrollView>
  );
}
