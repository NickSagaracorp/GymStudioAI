import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { generarPrograma } from '@/domain/planner/programa';
import { programarAvisoMedicion } from '@/services/avisos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

export const CLAVE_API = 'openai_api_key';

const SEMANAS_A_DESCARGAR = 2;

export default function Ajustes() {
  const { perfil, programa, catalogo, cache } = useApp();

  const [apiKey, setApiKey] = useState('');
  const [tamanoCache, setTamanoCache] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    SecureStore.getItemAsync(CLAVE_API)
      .then((valor) => {
        if (vivo) setApiKey(valor ?? '');
      })
      .catch(() => undefined);
    cache.tamanoTotal().then((total) => {
      if (vivo) setTamanoCache(total);
    });
    return () => {
      vivo = false;
    };
  }, [cache]);

  async function guardarClave() {
    const limpia = apiKey.trim();
    if (limpia !== '' && !limpia.startsWith('sk-')) {
      setMensaje('La clave de OpenAI debería empezar por "sk-".');
      return;
    }
    await SecureStore.setItemAsync(CLAVE_API, limpia);
    setMensaje(limpia === '' ? 'Clave borrada.' : 'Clave guardada.');
  }

  async function descargarPlan() {
    if (ocupado) return;
    setOcupado(true);

    const activo = await programa.activo();
    if (!activo) {
      setOcupado(false);
      return;
    }

    const dias = await programa.diasDe(activo.id);
    const ids = new Set(
      dias
        .filter((dia) => dia.semana <= SEMANAS_A_DESCARGAR)
        .flatMap((dia) => dia.ejercicios.map((e) => e.ejercicioId)),
    );

    let hechas = 0;
    for (const id of ids) {
      const ficha = catalogo.porId(id);
      if (ficha) await cache.asegurar(ficha.id, ficha.gifUrl);
      hechas += 1;
      setMensaje(`Descargando animaciones... ${hechas} de ${ids.size}`);
    }

    setTamanoCache(await cache.tamanoTotal());
    setMensaje(`Listo: ${ids.size} animaciones disponibles sin conexión.`);
    setOcupado(false);
  }

  async function regenerar() {
    if (ocupado) return;
    setOcupado(true);

    const miPerfil = await perfil.obtener();
    if (miPerfil) {
      const plan = generarPrograma(miPerfil, catalogo, `${miPerfil.objetivo}-${Date.now()}`);
      await programa.guardar(plan);
      await programarAvisoMedicion(miPerfil.diaMedicion);
      setMensaje('Programa regenerado. Tu histórico se conserva.');
    }

    setOcupado(false);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{
        padding: espaciado.lg,
        paddingTop: espaciado.xl * 2,
        gap: espaciado.md,
      }}
    >
      <Text style={tipografia.titulo}>Ajustes</Text>

      <Text style={tipografia.seccion}>Clave de OpenAI</Text>
      <Text style={tipografia.tenue}>
        Se guarda cifrada en el dispositivo. Se usará para el análisis de comidas.
      </Text>
      <TextInput
        testID="campo-api-key"
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholderTextColor={colores.textoTenue}
        style={{
          ...tipografia.cuerpo,
          backgroundColor: colores.superficie,
          borderRadius: radio.sm,
          borderWidth: 1,
          borderColor: colores.borde,
          paddingHorizontal: espaciado.md,
          paddingVertical: espaciado.sm,
        }}
      />
      <Boton titulo="Guardar clave" variante="secundario" onPress={guardarClave} />

      <Text style={tipografia.seccion}>Animaciones</Text>
      <Text style={tipografia.tenue}>
        Caché ocupada: {(tamanoCache / 1024 / 1024).toFixed(1)} MB
      </Text>
      <Boton
        testID="descargar-plan"
        titulo="Descargar mi plan"
        variante="secundario"
        onPress={descargarPlan}
        deshabilitado={ocupado}
      />
      <Boton
        titulo="Vaciar caché"
        variante="secundario"
        onPress={async () => {
          await cache.vaciar();
          setTamanoCache(0);
          setMensaje('Caché vaciada.');
        }}
      />

      <Text style={tipografia.seccion}>Programa</Text>
      <Boton
        titulo="Regenerar programa"
        variante="secundario"
        onPress={regenerar}
        deshabilitado={ocupado}
      />

      {mensaje !== '' && (
        <Text testID="mensaje-ajustes" style={tipografia.tenue}>
          {mensaje}
        </Text>
      )}

      <Boton titulo="Volver" onPress={() => router.back()} />
    </ScrollView>
  );
}
