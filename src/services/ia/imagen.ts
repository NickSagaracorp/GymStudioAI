const LADO_MAXIMO = 1024;
const CALIDAD = 0.7;

export interface ImagenPreparada {
  base64: string;
  uri: string;
}

/**
 * Comprime la foto antes de que salga del dispositivo: menos datos enviados,
 * menos coste por análisis y menos espacio si el usuario decide conservarla.
 */
export async function prepararFoto(uri: string): Promise<ImagenPreparada> {
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');

  const contexto = ImageManipulator.manipulate(uri).resize({ width: LADO_MAXIMO });
  const imagen = await contexto.renderAsync();
  const resultado = await imagen.saveAsync({
    compress: CALIDAD,
    format: SaveFormat.JPEG,
    base64: true,
  });

  return { base64: resultado.base64 ?? '', uri: resultado.uri };
}
