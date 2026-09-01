import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { Boton } from '@/ui/componentes/Boton';
import { CampoNumero } from '@/ui/componentes/CampoNumero';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';
import { generarPrograma } from '@/domain/planner/programa';
import { programarAvisoMedicion } from '@/services/avisos';
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
  const { perfil: repoPerfilApp, programa, catalogo } = useApp();

  const [nombre, setNombre] = useState('');
  const [alturaCm, setAlturaCm] = useState<number | null>(175);
  const [objetivo, setObjetivo] = useState<Objetivo>('volumen');
  const [nivel, setNivel] = useState<Nivel>('principiante');
  const [diasPorSemana, setDiasPorSemana] = useState(3);
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
    mancuernaMinKg !== null &&
    mancuernaMaxKg !== null &&
    incrementoKg !== null &&
    incrementoKg > 0;

  async function terminar() {
    if (!listo || guardando) return;
    setGuardando(true);

    const nuevo: Perfil = {
      nombre: nombre.trim(),
      sexo: 'otro',
      fechaNac: '1990-01-01',
      alturaCm: alturaCm as number,
      nivel,
      objetivo,
      diasPorSemana,
      mancuernaMinKg: mancuernaMinKg as number,
      mancuernaMaxKg: mancuernaMaxKg as number,
      incrementoKg: incrementoKg as number,
      tieneBanco,
      tieneBarraDominadas,
      diaMedicion,
    };

    await repoPerfilApp.guardar(nuevo);
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

      <CampoNumero
        etiqueta="Altura"
        sufijo="cm"
        valor={alturaCm}
        onCambio={setAlturaCm}
        testID="campo-altura"
      />

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
        <Text style={tipografia.seccion}>Días por semana</Text>
        <Opciones
          valores={[2, 3, 4, 5, 6].map((d) => ({ valor: d, etiqueta: String(d) }))}
          seleccionado={diasPorSemana}
          onElegir={setDiasPorSemana}
          prefijoTestID="dias"
        />
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
