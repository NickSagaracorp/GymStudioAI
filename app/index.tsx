import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/ui/ContextoApp';
import { colores } from '@/ui/tema';

export default function Inicio() {
  const { perfil } = useApp();

  useEffect(() => {
    perfil.obtener().then((existente) => {
      router.replace(existente ? '/hoy' : '/onboarding');
    });
  }, [perfil]);

  return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
}
