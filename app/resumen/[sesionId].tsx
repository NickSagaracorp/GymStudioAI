import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { cerrarSesion } from '@/nucleo/cerrarSesion';
import type { ResumenSesion } from '@/nucleo/cerrarSesion';

export default function Resumen() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const { sesion, retos } = useApp();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);

  useEffect(() => {
    let vivo = true;
    cerrarSesion({ sesiones: sesion, retos }, Number(sesionId)).then((calculado) => {
      if (vivo) setResumen(calculado);
    });
    return () => {
      vivo = false;
    };
  }, [sesionId, sesion, retos]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colores.fondo,
        padding: espaciado.lg,
        gap: espaciado.lg,
        justifyContent: 'center',
      }}
    >
      <Text style={tipografia.titulo}>Entrenamiento terminado</Text>

      <View
        style={{
          backgroundColor: colores.superficie,
          borderRadius: radio.md,
          padding: espaciado.md,
          gap: espaciado.sm,
        }}
      >
        <Text style={tipografia.tenue}>Series completadas</Text>
        <Text testID="series-completadas" style={tipografia.numero}>
          {resumen?.seriesCompletadas ?? 0}
        </Text>
        <Text style={tipografia.tenue}>Volumen total</Text>
        <Text testID="volumen" style={tipografia.numero}>
          {Math.round(resumen?.volumenKg ?? 0)} kg
        </Text>
      </View>

      {(resumen?.retosLogrados ?? []).map((reto) => (
        <View
          key={reto.id}
          style={{ backgroundColor: colores.exito, borderRadius: radio.md, padding: espaciado.md }}
        >
          <Text style={{ ...tipografia.cuerpo, color: colores.fondo, fontWeight: '700' }}>
            Reto completado: {reto.titulo}
          </Text>
        </View>
      ))}

      <Boton titulo="Volver a inicio" onPress={() => router.replace('/hoy')} />
    </View>
  );
}
