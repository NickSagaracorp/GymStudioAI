import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProveedorApp } from '@/ui/ContextoApp';
import { colores } from '@/ui/tema';

export default function DisposicionRaiz() {
  return (
    <ProveedorApp>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colores.fondo },
        }}
      />
    </ProveedorApp>
  );
}
