import { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { crearContenedor } from '@/nucleo/contenedor';
import type { Contenedor } from '@/nucleo/contenedor';
import { colores, espaciado, tipografia } from '@/ui/tema';

const Contexto = createContext<Contenedor | null>(null);

export function ProveedorApp({ children }: { children: React.ReactNode }) {
  const [contenedor, setContenedor] = useState<Contenedor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    crearContenedor()
      .then((creado) => {
        if (vivo) setContenedor(creado);
      })
      .catch((fallo: unknown) => {
        if (vivo) setError(fallo instanceof Error ? fallo.message : String(fallo));
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (error) {
    return (
      <View
        testID="error-app"
        style={{
          flex: 1,
          backgroundColor: colores.fondo,
          justifyContent: 'center',
          padding: espaciado.lg,
          gap: espaciado.sm,
        }}
      >
        <Text style={tipografia.seccion}>No se pudo abrir la aplicación</Text>
        <Text style={tipografia.tenue}>{error}</Text>
      </View>
    );
  }

  if (!contenedor) {
    return (
      <View
        testID="cargando-app"
        style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}
      >
        <ActivityIndicator color={colores.acento} />
      </View>
    );
  }

  return <Contexto.Provider value={contenedor}>{children}</Contexto.Provider>;
}

export function useApp(): Contenedor {
  const contenedor = useContext(Contexto);
  if (!contenedor) throw new Error('useApp fuera de ProveedorApp');
  return contenedor;
}
