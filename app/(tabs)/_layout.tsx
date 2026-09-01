import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colores, espaciado } from '@/ui/tema';

/** Iconos con emoji: sin dependencia de una librería de iconos. */
function Icono({ simbolo, activo }: { simbolo: string; activo: boolean }) {
  return <Text style={{ fontSize: 22, opacity: activo ? 1 : 0.45 }}>{simbolo}</Text>;
}

export default function DisposicionPestanas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarStyle: {
          backgroundColor: colores.superficie,
          borderTopColor: colores.borde,
          paddingTop: espaciado.xs,
        },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="hoy"
        options={{
          title: 'Hoy',
          tabBarIcon: ({ focused }) => <Icono simbolo="🏋️" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="comida"
        options={{
          title: 'Comida',
          tabBarIcon: ({ focused }) => <Icono simbolo="🍽️" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ focused }) => <Icono simbolo="📈" activo={focused} />,
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ focused }) => <Icono simbolo="⚙️" activo={focused} />,
        }}
      />
    </Tabs>
  );
}
