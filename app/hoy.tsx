import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { BarraProgreso } from '@/ui/componentes/BarraProgreso';
import { SiluetaMuscular, vistaPara } from '@/ui/componentes/SiluetaMuscular';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { duracionEstimadaMin, siguienteDia } from '@/domain/planner/agenda';
import type { DiaGuardado } from '@/data/db/repos/programa';
import type { Reto } from '@/data/db/repos/retos';
import type { Perfil } from '@/data/db/repos/perfil';

const tarjeta = {
  backgroundColor: colores.superficie,
  borderRadius: radio.md,
  padding: espaciado.md,
  gap: espaciado.sm,
};

export default function Hoy() {
  const { programa, sesion, retos, perfil, mediciones } = useApp();

  const [dia, setDia] = useState<DiaGuardado | null>(null);
  const [totalDias, setTotalDias] = useState(0);
  const [completados, setCompletados] = useState(0);
  const [activos, setActivos] = useState<Reto[]>([]);
  const [datosPerfil, setDatosPerfil] = useState<Perfil | null>(null);
  const [tocaPesarse, setTocaPesarse] = useState(false);
  const [cargado, setCargado] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;

      (async () => {
        const [activo, hechos, listaRetos, miPerfil] = await Promise.all([
          programa.activo(),
          sesion.diasCompletados(),
          retos.activos(),
          perfil.obtener(),
        ]);
        if (!vivo) return;

        const dias = activo ? await programa.diasDe(activo.id) : [];
        if (!vivo) return;

        setDia(siguienteDia(dias, hechos));
        setTotalDias(dias.length);
        setCompletados(hechos.filter((id) => dias.some((d) => d.id === id)).length);
        setActivos(listaRetos);
        setDatosPerfil(miPerfil);

        if (miPerfil) {
          const hoy = new Date();
          const fecha = hoy.toISOString().slice(0, 10);
          const yaMedido = await mediciones.hayEn(fecha);
          if (vivo) setTocaPesarse(hoy.getDay() === miPerfil.diaMedicion && !yaMedido);
        }

        if (vivo) setCargado(true);
      })();

      return () => {
        vivo = false;
      };
    }, [programa, sesion, retos, perfil, mediciones]),
  );

  async function empezar() {
    if (!dia) return;
    const borrador = await sesion.borradorDe(dia.id);
    const sesionId = borrador?.id ?? (await sesion.crear(dia.id));
    router.push(`/sesion/${sesionId}`);
  }

  if (!cargado) {
    return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.lg,
      }}
    >
      <View>
        <Text style={tipografia.titulo}>
          Hola{datosPerfil ? `, ${datosPerfil.nombre}` : ''}
        </Text>
        {totalDias > 0 && (
          <Text style={tipografia.tenue}>
            {completados} de {totalDias} entrenamientos del programa
          </Text>
        )}
      </View>

      {tocaPesarse && (
        <View style={tarjeta} testID="tarjeta-medicion">
          <Text style={tipografia.seccion}>Toca pesarte</Text>
          <Text style={tipografia.tenue}>Registra tu peso y medidas de esta semana.</Text>
          <Boton
            titulo="Registrar medidas"
            variante="secundario"
            onPress={() => router.push('/medicion')}
          />
        </View>
      )}

      {dia ? (
        <View style={tarjeta} testID="tarjeta-dia">
          <Text style={tipografia.tenue}>
            Semana {dia.semana} · Día {dia.dia}
          </Text>
          <Text style={tipografia.titulo}>{dia.nombre}</Text>

          <View style={{ flexDirection: 'row', gap: espaciado.md, alignItems: 'center' }}>
            <SiluetaMuscular
              principales={dia.musculos}
              secundarios={[]}
              vista={vistaPara(dia.musculos)}
              ancho={110}
            />
            <View style={{ gap: espaciado.xs, flex: 1 }}>
              <Text style={tipografia.cuerpo}>{dia.ejercicios.length} ejercicios</Text>
              <Text style={tipografia.tenue}>
                {dia.ejercicios.reduce((suma, e) => suma + e.series, 0)} series
              </Text>
              <Text style={tipografia.tenue}>~{duracionEstimadaMin(dia)} min</Text>
            </View>
          </View>

          <Boton testID="boton-empezar" titulo="Empezar entrenamiento" onPress={empezar} />
        </View>
      ) : (
        <View style={tarjeta}>
          <Text style={tipografia.seccion}>Programa terminado</Text>
          <Text style={tipografia.tenue}>
            Has completado las 8 semanas. Genera uno nuevo desde Ajustes.
          </Text>
        </View>
      )}

      {activos.length > 0 && (
        <View style={{ gap: espaciado.sm }}>
          <Text style={tipografia.seccion}>Retos</Text>
          {activos.map((reto) => (
            <View key={reto.id} style={tarjeta}>
              <Text style={tipografia.cuerpo}>{reto.titulo}</Text>
              <BarraProgreso valor={reto.valorActual} total={reto.metaValor} />
              <Text style={tipografia.tenue}>
                {Math.round(reto.valorActual)} de {reto.metaValor} · hasta {reto.fechaFin}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: espaciado.sm }}>
        <Boton titulo="Ver progreso" variante="secundario" onPress={() => router.push('/progreso')} />
        <Boton titulo="Mis retos" variante="secundario" onPress={() => router.push('/retos')} />
        <Boton titulo="Ajustes" variante="secundario" onPress={() => router.push('/ajustes')} />
      </View>
    </ScrollView>
  );
}
