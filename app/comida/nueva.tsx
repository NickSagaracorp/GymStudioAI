import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { FormularioComida } from '@/ui/componentes/FormularioComida';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { crearAnalizadorOpenAI, ErrorAnalisis } from '@/services/ia/analizador';
import { apiKey, conservarFotos, modelo } from '@/services/ia/configuracion';
import { prepararFoto } from '@/services/ia/imagen';
import type { Alimento, Momento } from '@/domain/nutricion/tipos';

type Paso = 'foto' | 'analizando' | 'revision';

function momentoSegunHora(): Momento {
  const hora = new Date().getHours();
  if (hora < 11) return 'desayuno';
  if (hora < 17) return 'almuerzo';
  if (hora < 22) return 'cena';
  return 'snack';
}

export default function NuevaComida() {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();
  const { nutricion } = useApp();

  const [paso, setPaso] = useState<Paso>('foto');
  const [uriFoto, setUriFoto] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [alimentos, setAlimentos] = useState<Alimento[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [momento, setMomento] = useState<Momento>(momentoSegunHora());
  const [guardando, setGuardando] = useState(false);

  async function elegirFoto(desdeCamara: boolean) {
    setError(null);
    const ImagePicker = await import('expo-image-picker');

    const permiso = desdeCamara
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      setError('Hace falta permiso para usar la cámara o la galería.');
      return;
    }

    const resultado = desdeCamara
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (!resultado.canceled && resultado.assets[0]) {
      setUriFoto(resultado.assets[0].uri);
    }
  }

  async function analizar() {
    if (!uriFoto) return;
    setPaso('analizando');
    setError(null);

    try {
      const [clave, nombreModelo] = await Promise.all([apiKey(), modelo()]);
      const preparada = await prepararFoto(uriFoto);

      const analizador = crearAnalizadorOpenAI({
        fetch,
        apiKey: clave,
        modelo: nombreModelo,
      });

      const resultado = await analizador.analizar({
        imagenBase64: preparada.base64,
        descripcion,
      });

      setUriFoto(preparada.uri);
      setAlimentos(resultado.alimentos);
      setAvisos(resultado.avisos);
      setPaso('revision');
    } catch (fallo) {
      setError(
        fallo instanceof ErrorAnalisis
          ? fallo.message
          : 'No se pudo analizar la foto. Puedes registrarla a mano.',
      );
      setPaso('foto');
    }
  }

  async function guardar() {
    if (guardando) return;
    setGuardando(true);

    const conservar = await conservarFotos();
    await nutricion.guardarComida({
      fecha: fecha ?? new Date().toISOString().slice(0, 10),
      momento,
      descripcion: descripcion.trim() === '' ? null : descripcion.trim(),
      fotoUri: conservar ? uriFoto : null,
      origen: 'ia',
      alimentos,
    });

    router.back();
  }

  if (paso === 'revision') {
    return (
      <FormularioComida
        titulo="Revisa el análisis"
        momento={momento}
        onMomento={setMomento}
        alimentos={alimentos}
        onAlimentos={setAlimentos}
        avisos={[
          'La IA estima las raciones a ojo. Corrige las cantidades antes de guardar.',
          ...avisos,
        ]}
        onGuardar={guardar}
        onCancelar={() => router.back()}
        guardando={guardando}
      />
    );
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
      <Text style={tipografia.titulo}>Añadir con foto</Text>

      {uriFoto ? (
        <Image
          testID="vista-previa"
          source={{ uri: uriFoto }}
          style={{ width: '100%', height: 240, borderRadius: radio.md }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            height: 240,
            borderRadius: radio.md,
            borderWidth: 1,
            borderColor: colores.borde,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={tipografia.tenue}>Sin foto todavía</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        <View style={{ flex: 1 }}>
          <Boton testID="hacer-foto" titulo="Cámara" onPress={() => elegirFoto(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Boton
            testID="elegir-foto"
            titulo="Galería"
            variante="secundario"
            onPress={() => elegirFoto(false)}
          />
        </View>
      </View>

      <View>
        <Text style={tipografia.tenue}>Descripción (opcional, pero ayuda mucho)</Text>
        <TextInput
          testID="campo-descripcion"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          placeholder="pechuga a la plancha con arroz, plato hondo"
          placeholderTextColor={colores.textoTenue}
          style={{
            ...tipografia.cuerpo,
            backgroundColor: colores.superficie,
            borderRadius: radio.sm,
            borderWidth: 1,
            borderColor: colores.borde,
            paddingHorizontal: espaciado.md,
            paddingVertical: espaciado.sm,
            marginTop: espaciado.xs,
            minHeight: 72,
          }}
        />
      </View>

      {error && (
        <Text testID="error-analisis" style={{ ...tipografia.tenue, color: colores.error }}>
          {error}
        </Text>
      )}

      {paso === 'analizando' ? (
        <View style={{ alignItems: 'center', gap: espaciado.sm, paddingVertical: espaciado.md }}>
          <ActivityIndicator color={colores.acento} />
          <Text style={tipografia.tenue}>Analizando la foto, puede tardar unos segundos...</Text>
        </View>
      ) : (
        <Boton
          testID="analizar"
          titulo="Analizar"
          onPress={analizar}
          deshabilitado={uriFoto === null}
        />
      )}

      <Boton
        titulo="Registrar a mano"
        variante="secundario"
        onPress={() => router.replace(`/comida/manual?fecha=${fecha ?? ''}`)}
      />
      <Boton titulo="Cancelar" variante="secundario" onPress={() => router.back()} />
    </ScrollView>
  );
}
