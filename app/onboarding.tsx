import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { SelectorDias } from '@/ui/componentes/SelectorDias';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { generarPrograma } from '@/domain/planner/programa';
import { programarAvisoMedicion } from '@/services/avisos';
import { calcularObjetivo } from '@/domain/nutricion/objetivos';
import type { NivelActividad } from '@/domain/nutricion/tipos';
import type { Nivel, Objetivo, Perfil } from '@/data/db/repos/perfil';

const OBJETIVOS: { valor: Objetivo; etiqueta: string }[] = [
  { valor: 'volumen', etiqueta: 'Ganar volumen' },
  { valor: 'definicion', etiqueta: 'Definir' },
  { valor: 'fuerza', etiqueta: 'Ganar fuerza' },
];

const NIVELES: { valor: Nivel; etiqueta: string }[] = [
  { valor: 'principiante', etiqueta: 'Principiante' },
  { valor: 'intermedio', etiqueta: 'Intermedio' },
  { valor: 'avanzado', etiqueta: 'Avanzado' },
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const SEXOS: { valor: Perfil['sexo']; etiqueta: string }[] = [
  { valor: 'hombre', etiqueta: 'Hombre' },
  { valor: 'mujer', etiqueta: 'Mujer' },
  { valor: 'otro', etiqueta: 'Otro' },
];

const ACTIVIDADES: { valor: NivelActividad; etiqueta: string }[] = [
  { valor: 'sedentario', etiqueta: 'Sedentario' },
  { valor: 'ligero', etiqueta: 'Ligero' },
  { valor: 'moderado', etiqueta: 'Moderado' },
  { valor: 'alto', etiqueta: 'Alto' },
  { valor: 'muy_alto', etiqueta: 'Muy alto' },
];

const ANIO_ACTUAL = new Date().getFullYear();

function Opciones<T extends string | number>({
  valores,
  seleccionado,
  onElegir,
  prefijoTestID,
}: {
  valores: { valor: T; etiqueta: string }[];
  seleccionado: T;
  onElegir: (valor: T) => void;
  prefijoTestID: string;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm }}>
      {valores.map((opcion) => {
        const activa = seleccionado === opcion.valor;
        return (
          <Text
            key={String(opcion.valor)}
            testID={`${prefijoTestID}-${opcion.valor}`}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            onPress={() => onElegir(opcion.valor)}
            style={{
              ...tipografia.cuerpo,
              paddingVertical: espaciado.sm,
              paddingHorizontal: espaciado.md,
              borderRadius: radio.sm,
              overflow: 'hidden',
              backgroundColor: activa ? colores.acento : colores.superficieAlta,
              color: activa ? colores.acentoTexto : colores.texto,
            }}
          >
            {opcion.etiqueta}
          </Text>
        );
      })}
    </View>
  );
}

export default function Onboarding() {
  const { perfil: repoPerfilApp, programa, catalogo, mediciones, nutricion } = useApp();

  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Perfil['sexo']>('hombre');
  const [anioNac, setAnioNac] = useState<number | null>(ANIO_ACTUAL - 30);
  const [alturaCm, setAlturaCm] = useState<number | null>(175);
  const [pesoKg, setPesoKg] = useState<number | null>(75);
  const [nivelActividad, setNivelActividad] = useState<NivelActividad>('moderado');
  const [objetivo, setObjetivo] = useState<Objetivo>('volumen');
  const [nivel, setNivel] = useState<Nivel>('principiante');
  const [agenda, setAgenda] = useState<number[]>([1, 3, 5]);
  const [mancuernaMinKg, setMancuernaMinKg] = useState<number | null>(2);
  const [mancuernaMaxKg, setMancuernaMaxKg] = useState<number | null>(20);
  const [incrementoKg, setIncrementoKg] = useState<number | null>(2);
  const [tieneBanco, setTieneBanco] = useState(true);
  const [tieneBarraDominadas, setTieneBarraDominadas] = useState(false);
  const [diaMedicion, setDiaMedicion] = useState(0);
  const [guardando, setGuardando] = useState(false);

  const listo =
    nombre.trim().length > 0 &&
    alturaCm !== null &&
    pesoKg !== null &&
    anioNac !== null &&
    anioNac > 1900 &&
    anioNac <= ANIO_ACTUAL - 12 &&
    mancuernaMinKg !== null &&
    mancuernaMaxKg !== null &&
    incrementoKg !== null &&
    incrementoKg > 0;

  async function terminar() {
    if (!listo || guardando) return;
    setGuardando(true);

    const nuevo: Perfil = {
      nombre: nombre.trim(),
      sexo,
      fechaNac: `${anioNac}-01-01`,
      alturaCm: alturaCm as number,
      nivel,
      objetivo,
      diasPorSemana: agenda.length,
      diasSemana: agenda,
      mancuernaMinKg: mancuernaMinKg as number,
      mancuernaMaxKg: mancuernaMaxKg as number,
      incrementoKg: incrementoKg as number,
      tieneBanco,
      tieneBarraDominadas,
      diaMedicion,
      nivelActividad,
    };

    await repoPerfilApp.guardar(nuevo);

    // El peso inicial arranca la gráfica de progreso desde el primer día.
    await mediciones.guardar({
      fecha: new Date().toISOString().slice(0, 10),
      pesoKg: pesoKg as number,
      notas: null,
      medidas: {},
    });

    await nutricion.guardarObjetivo(
      calcularObjetivo({
        sexo,
        fechaNac: nuevo.fechaNac,
        alturaCm: nuevo.alturaCm,
        pesoKg: pesoKg as number,
        nivelActividad,
        objetivo,
      }),
    );
    const plan = generarPrograma(nuevo, catalogo, `${nuevo.objetivo}-${Date.now()}`);
    await programa.guardar(plan);
    await programarAvisoMedicion(diaMedicion);
    router.replace('/hoy');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.lg, paddingTop: espaciado.xl * 2 }}
    >
      <Text style={tipografia.titulo}>Vamos a montar tu plan</Text>

      <View>
        <Text style={tipografia.tenue}>¿Cómo te llamas?</Text>
        <TextInput
          testID="campo-nombre"
          value={nombre}
          onChangeText={setNombre}
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
          }}
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Sexo</Text>
        <Text style={tipografia.tenue}>
          Cambia la fórmula que calcula tu gasto calórico.
        </Text>
        <Opciones valores={SEXOS} seleccionado={sexo} onElegir={setSexo} prefijoTestID="sexo" />
      </View>

      <CampoNumero
        etiqueta="Año de nacimiento"
        valor={anioNac}
        onCambio={setAnioNac}
        testID="campo-anio"
      />

      <CampoNumero
        etiqueta="Altura"
        sufijo="cm"
        valor={alturaCm}
        onCambio={setAlturaCm}
        testID="campo-altura"
      />

      <CampoNumero
        etiqueta="Peso actual"
        sufijo="kg"
        valor={pesoKg}
        onCambio={setPesoKg}
        testID="campo-peso"
      />

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Actividad diaria</Text>
        <Text style={tipografia.tenue}>
          Sin contar los entrenamientos: cuánto te mueves en tu día a día.
        </Text>
        <Opciones
          valores={ACTIVIDADES}
          seleccionado={nivelActividad}
          onElegir={setNivelActividad}
          prefijoTestID="actividad"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Objetivo</Text>
        <Opciones
          valores={OBJETIVOS}
          seleccionado={objetivo}
          onElegir={setObjetivo}
          prefijoTestID="objetivo"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Nivel</Text>
        <Opciones valores={NIVELES} seleccionado={nivel} onElegir={setNivel} prefijoTestID="nivel" />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Qué días entrenas</Text>
        <SelectorDias seleccionados={agenda} onCambio={setAgenda} />
        <Text style={tipografia.tenue}>
          Entre 2 y 6 días. Tu racha solo cuenta estos días.
        </Text>
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Tus mancuernas</Text>
        <CampoNumero
          etiqueta="Peso mínimo"
          sufijo="kg"
          valor={mancuernaMinKg}
          onCambio={setMancuernaMinKg}
          testID="campo-min"
        />
        <CampoNumero
          etiqueta="Peso máximo"
          sufijo="kg"
          valor={mancuernaMaxKg}
          onCambio={setMancuernaMaxKg}
          testID="campo-max"
        />
        <CampoNumero
          etiqueta="Salto entre pesos"
          sufijo="kg"
          valor={incrementoKg}
          onCambio={setIncrementoKg}
          testID="campo-incremento"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Qué más tienes</Text>
        <Text style={tipografia.tenue}>
          Sin banco el press de banca pasa a flexiones; sin barra, las dominadas a remo invertido.
        </Text>
        <Opciones
          valores={[
            { valor: 'si', etiqueta: 'Con banco' },
            { valor: 'no', etiqueta: 'Sin banco' },
          ]}
          seleccionado={tieneBanco ? 'si' : 'no'}
          onElegir={(valor) => setTieneBanco(valor === 'si')}
          prefijoTestID="banco"
        />
        <Opciones
          valores={[
            { valor: 'si', etiqueta: 'Con barra de dominadas' },
            { valor: 'no', etiqueta: 'Sin barra' },
          ]}
          seleccionado={tieneBarraDominadas ? 'si' : 'no'}
          onElegir={(valor) => setTieneBarraDominadas(valor === 'si')}
          prefijoTestID="barra"
        />
      </View>

      <View style={{ gap: espaciado.sm }}>
        <Text style={tipografia.seccion}>Día para pesarte</Text>
        <Opciones
          valores={DIAS_SEMANA.map((etiqueta, indice) => ({ valor: indice, etiqueta }))}
          seleccionado={diaMedicion}
          onElegir={setDiaMedicion}
          prefijoTestID="dia-medicion"
        />
      </View>

      <Boton
        testID="boton-terminar"
        titulo={guardando ? 'Creando...' : 'Crear mi plan'}
        onPress={terminar}
        deshabilitado={!listo || guardando}
      />
    </ScrollView>
  );
}
