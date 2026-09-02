import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SiluetaMuscular, vistaPara } from '@/ui/componentes/SiluetaMuscular';
import type { Musculo } from '@/data/catalog/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export type NivelCelebracion = 'chico' | 'medio' | 'grande';

const { width: ANCHO, height: ALTO } = Dimensions.get('window');

const PIEZAS: Record<NivelCelebracion, number> = { chico: 0, medio: 16, grande: 32 };
const DURACION: Record<NivelCelebracion, number> = { chico: 900, medio: 1600, grande: 2200 };
const PALETA = [colores.acento, colores.exito, colores.aviso, colores.texto];

/**
 * Todas las piezas comparten un único `Animated.Value`: lanzar una animación
 * por pieza son treinta y dos bucles simultáneos, que en un móvil de gama media
 * se notan justo cuando la celebración tiene que ir fina. El escalonado sale de
 * darle a cada pieza una ventana de arranque distinta sobre el mismo avance.
 */
function Pieza({
  indice,
  total,
  avance,
}: {
  indice: number;
  total: number;
  avance: Animated.Value;
}) {
  const arranque = ((indice % 8) / 8) * 0.3;

  const desplazamiento = avance.interpolate({
    inputRange: [arranque, 1],
    outputRange: [-60, ALTO],
    extrapolate: 'clamp',
  });
  const giro = avance.interpolate({
    inputRange: [arranque, 1],
    outputRange: ['0deg', `${(indice % 2 === 0 ? 1 : -1) * 720}deg`],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      testID={`confeti-${indice}`}
      style={{
        position: 'absolute',
        left: ((indice + 0.5) / total) * ANCHO,
        width: 8,
        height: 14,
        borderRadius: 2,
        backgroundColor: PALETA[indice % PALETA.length],
        opacity: avance.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
        transform: [{ translateY: desplazamiento }, { rotate: giro }],
      }}
    />
  );
}

/**
 * Overlay de celebración. Se cierra solo, y también al tocar: nunca bloquea al
 * usuario en mitad de una serie.
 */
export function Celebracion({
  visible,
  nivel,
  titulo,
  detalle,
  musculo,
  onCerrar,
}: {
  visible: boolean;
  nivel: NivelCelebracion;
  titulo: string;
  detalle?: string;
  musculo?: Musculo;
  onCerrar: () => void;
}) {
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    if (nivel === 'chico') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Volver a cero deja la celebración lista para repetirse en el siguiente hito.
    avance.setValue(0);
    const animacion = Animated.timing(avance, {
      toValue: 1,
      duration: DURACION[nivel],
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animacion.start();

    const temporizador = setTimeout(onCerrar, DURACION[nivel] + 400);
    return () => {
      animacion.stop();
      clearTimeout(temporizador);
    };
  }, [visible, nivel, onCerrar, avance]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCerrar}>
      <Pressable
        testID="cerrar-celebracion"
        onPress={onCerrar}
        style={{
          flex: 1,
          backgroundColor: '#0E1116E6',
          alignItems: 'center',
          justifyContent: 'center',
          padding: espaciado.lg,
          gap: espaciado.md,
        }}
      >
        {Array.from({ length: PIEZAS[nivel] }, (_, indice) => (
          <Pieza key={indice} indice={indice} total={PIEZAS[nivel]} avance={avance} />
        ))}

        {musculo && (
          <SiluetaMuscular
            principales={[musculo]}
            secundarios={[]}
            vista={vistaPara([musculo])}
            ancho={130}
          />
        )}

        <Text
          testID="titulo-celebracion"
          style={{ ...tipografia.titulo, textAlign: 'center' }}
        >
          {titulo}
        </Text>

        {detalle !== undefined && detalle !== '' && (
          <Text
            testID="detalle-celebracion"
            style={{
              ...tipografia.cuerpo,
              textAlign: 'center',
              color: colores.textoTenue,
              backgroundColor: colores.superficie,
              borderRadius: radio.md,
              padding: espaciado.md,
              overflow: 'hidden',
            }}
          >
            {detalle}
          </Text>
        )}
      </Pressable>
    </Modal>
  );
}
