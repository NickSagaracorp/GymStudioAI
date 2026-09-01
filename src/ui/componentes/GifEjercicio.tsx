import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { MINIATURAS } from '../../../assets/thumbs';
import { useApp } from '@/ui/ContextoApp';
import type { Ejercicio } from '@/data/catalog/tipos';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

/**
 * Muestra la animación del ejercicio. Mientras no está descargada, y siempre
 * que no haya red, se ve la miniatura empaquetada: el entrenamiento nunca se
 * interrumpe por esto.
 */
export function GifEjercicio({ ejercicio, alto = 220 }: { ejercicio: Ejercicio; alto?: number }) {
  const { cache } = useApp();
  const [rutaGif, setRutaGif] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    setRutaGif(null);
    setFallo(false);

    cache.asegurar(ejercicio.id, ejercicio.gifUrl).then((ruta) => {
      if (!vivo) return;
      if (ruta) setRutaGif(ruta);
      else setFallo(true);
    });

    return () => {
      vivo = false;
    };
  }, [cache, ejercicio.id, ejercicio.gifUrl]);

  const miniatura = MINIATURAS[ejercicio.miniatura];

  return (
    <View style={{ gap: espaciado.xs }}>
      <Image
        testID="imagen-ejercicio"
        source={rutaGif ? { uri: rutaGif } : miniatura}
        style={{
          width: '100%',
          height: alto,
          borderRadius: radio.md,
          backgroundColor: colores.superficie,
        }}
        resizeMode="contain"
      />
      {fallo && (
        <Text testID="aviso-sin-conexion" style={tipografia.tenue}>
          Sin conexión · se muestra la imagen estática
        </Text>
      )}
    </View>
  );
}
