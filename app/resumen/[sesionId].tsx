import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { Celebracion } from '@/ui/componentes/Celebracion';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { cerrarSesion } from '@/nucleo/cerrarSesion';
import type { ResumenSesion } from '@/nucleo/cerrarSesion';
import { calcularRacha } from '@/domain/gamificacion/racha';
import type { Racha } from '@/domain/gamificacion/racha';
import { diaLocal } from '@/domain/gamificacion/fechas';

export default function Resumen() {
  const { sesionId } = useLocalSearchParams<{ sesionId: string }>();
  const { sesion, retos, perfil, logros } = useApp();
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);
  const [racha, setRacha] = useState<Racha>({ actual: 0, record: 0 });
  const [festejando, setFestejando] = useState(true);

  useEffect(() => {
    let vivo = true;
    cerrarSesion({ sesiones: sesion, retos }, Number(sesionId)).then((calculado) => {
      if (vivo) setResumen(calculado);
    });
    return () => {
      vivo = false;
    };
  }, [sesionId, sesion, retos]);

  // La dependencia en `resumen` importa: `cerrarSesion` es lo que marca la
  // sesión como completada, y hasta que eso pasa `fechasCompletadas()` no
  // incluye la de hoy.
  useEffect(() => {
    if (!resumen) return;
    let vivo = true;

    (async () => {
      const [miPerfil, fechas] = await Promise.all([perfil.obtener(), sesion.fechasCompletadas()]);
      if (!vivo || !miPerfil) return;
      setRacha(calcularRacha(fechas, miPerfil.diasSemana, diaLocal(new Date())));
    })();

    return () => {
      vivo = false;
    };
  }, [perfil, sesion, resumen]);

  useEffect(() => {
    if (racha.actual > 0) void logros.marcar(`racha:${racha.actual}`);
  }, [racha, logros]);

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

      {racha.actual > 0 && (
        <Text testID="racha-resumen" style={tipografia.cuerpo}>
          {`🔥 ${racha.actual} ${racha.actual === 1 ? 'día' : 'días'} de racha`}
        </Text>
      )}

      <Boton titulo="Volver a inicio" onPress={() => router.replace('/hoy')} />

      <Celebracion
        visible={resumen !== null && festejando}
        nivel="grande"
        titulo="¡Entrenamiento terminado!"
        detalle={`${resumen?.seriesCompletadas ?? 0} series · ${Math.round(resumen?.volumenKg ?? 0)} kg`}
        onCerrar={() => setFestejando(false)}
      />
    </View>
  );
}
