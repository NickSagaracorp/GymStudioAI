import { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { generarPrograma } from '@/domain/planner/programa';
import { calcularObjetivo, objetivoConCalorias } from '@/domain/nutricion/objetivos';
import { programarAvisoMedicion } from '@/services/avisos';
import { MODELO_POR_DEFECTO } from '@/services/ia/analizador';
import {
  CLAVE_API,
  CLAVE_CONSERVAR_FOTOS,
  CLAVE_MODELO,
  apiKey as leerApiKey,
  conservarFotos as leerConservarFotos,
  guardar as guardarAjuste,
  modelo as leerModelo,
  usaClavePorDefecto,
} from '@/services/ia/configuracion';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const SEMANAS_A_DESCARGAR = 2;

export default function Ajustes() {
  const { perfil, programa, catalogo, cache, nutricion, mediciones } = useApp();

  const [apiKey, setApiKey] = useState('');
  const [porDefecto, setPorDefecto] = useState(false);
  const [modelo, setModelo] = useState('');
  const [conservarFotos, setConservarFotos] = useState(true);
  const [kcalObjetivo, setKcalObjetivo] = useState<number | null>(null);
  const [tamanoCache, setTamanoCache] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const [clave, esPorDefecto, nombreModelo, conservar, objetivo, total] = await Promise.all([
        leerApiKey(),
        usaClavePorDefecto(),
        leerModelo(),
        leerConservarFotos(),
        nutricion.objetivo(),
        cache.tamanoTotal(),
      ]);
      if (!vivo) return;

      setApiKey(clave);
      setPorDefecto(esPorDefecto);
      setModelo(nombreModelo);
      setConservarFotos(conservar);
      setKcalObjetivo(objetivo?.kcal ?? null);
      setTamanoCache(total);
    })();

    return () => {
      vivo = false;
    };
  }, [cache, nutricion]);

  async function guardarClave() {
    const limpia = apiKey.trim();
    if (limpia !== '' && !limpia.startsWith('sk-')) {
      setMensaje('La clave de OpenAI debería empezar por "sk-".');
      return;
    }
    await guardarAjuste(CLAVE_API, limpia);
    setPorDefecto(await usaClavePorDefecto());
    setMensaje(limpia === '' ? 'Clave borrada.' : 'Clave guardada.');
  }

  async function guardarModelo() {
    const limpio = modelo.trim() === '' ? MODELO_POR_DEFECTO : modelo.trim();
    setModelo(limpio);
    await guardarAjuste(CLAVE_MODELO, limpio);
    setMensaje(`Modelo guardado: ${limpio}`);
  }

  async function alternarFotos() {
    const nuevo = !conservarFotos;
    setConservarFotos(nuevo);
    await guardarAjuste(CLAVE_CONSERVAR_FOTOS, nuevo ? 'si' : 'no');
    setMensaje(nuevo ? 'Se conservarán las fotos.' : 'Las fotos se descartarán tras analizarlas.');
  }

  async function borrarFotosAntiguas() {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const fecha = limite.toISOString().slice(0, 10);

    const fotos = await nutricion.fotosAnterioresA(fecha);
    await nutricion.olvidarFotosAnterioresA(fecha);
    setMensaje(
      fotos.length === 0
        ? 'No había fotos de más de 30 días.'
        : `Se olvidaron ${fotos.length} fotos de más de 30 días.`,
    );
  }

  async function recalcularObjetivo() {
    const miPerfil = await perfil.obtener();
    const historial = await mediciones.historial();
    const ultima = historial[historial.length - 1];

    if (!miPerfil || !ultima) {
      setMensaje('Hace falta una medición de peso para calcular el objetivo.');
      return;
    }

    const objetivo = calcularObjetivo({
      sexo: miPerfil.sexo,
      fechaNac: miPerfil.fechaNac,
      alturaCm: miPerfil.alturaCm,
      pesoKg: ultima.pesoKg,
      nivelActividad: miPerfil.nivelActividad,
      objetivo: miPerfil.objetivo,
    });

    await nutricion.guardarObjetivo(objetivo);
    setKcalObjetivo(objetivo.kcal);
    setMensaje(`Objetivo recalculado: ${objetivo.kcal} kcal al día.`);
  }

  async function fijarCalorias() {
    if (kcalObjetivo === null || kcalObjetivo < 800) {
      setMensaje('Escribe unas calorías realistas, por encima de 800.');
      return;
    }

    const miPerfil = await perfil.obtener();
    const historial = await mediciones.historial();
    const ultima = historial[historial.length - 1];
    if (!miPerfil || !ultima) return;

    await nutricion.guardarObjetivo(
      objetivoConCalorias(kcalObjetivo, ultima.pesoKg, miPerfil.objetivo),
    );
    setMensaje('Objetivo fijado a mano.');
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
      {porDefecto && (
        <Text testID="aviso-clave-por-defecto" style={{ ...tipografia.tenue, color: colores.aviso }}>
          Cargada desde el fichero .env del proyecto. Escribe otra aquí para reemplazarla.
        </Text>
      )}
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

      <Text style={tipografia.seccion}>Nutrición</Text>
      <Text style={tipografia.tenue}>Modelo de IA para analizar las fotos.</Text>
      <TextInput
        testID="campo-modelo"
        value={modelo}
        onChangeText={setModelo}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={MODELO_POR_DEFECTO}
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
      <Boton titulo="Guardar modelo" variante="secundario" onPress={guardarModelo} />

      <Boton
        testID="alternar-fotos"
        titulo={conservarFotos ? 'Fotos: se conservan' : 'Fotos: se descartan'}
        variante="secundario"
        onPress={alternarFotos}
      />
      <Boton
        titulo="Olvidar fotos de más de 30 días"
        variante="secundario"
        onPress={borrarFotosAntiguas}
      />

      <CampoNumero
        etiqueta="Calorías objetivo"
        sufijo="kcal"
        valor={kcalObjetivo}
        onCambio={setKcalObjetivo}
        testID="campo-kcal"
      />
      <Boton titulo="Fijar estas calorías" variante="secundario" onPress={fijarCalorias} />
      <Boton
        testID="recalcular-objetivo"
        titulo="Recalcular desde mis datos"
        variante="secundario"
        onPress={recalcularObjetivo}
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
    </ScrollView>
  );
}
