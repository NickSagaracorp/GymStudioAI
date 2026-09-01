import type { SistemaFicheros } from './sistemaFicheros';

const TOPE_POR_DEFECTO = 250 * 1024 * 1024;

export function crearCacheGifs(
  sistema: SistemaFicheros,
  directorio: string,
  topeBytes: number = TOPE_POR_DEFECTO,
) {
  function rutaLocal(ejercicioId: string): string {
    return `${directorio}${ejercicioId.replace('/', '__')}.gif`;
  }

  async function tamanoTotal(): Promise<number> {
    const ficheros = await sistema.listar(directorio);
    return ficheros.reduce((suma, fichero) => suma + fichero.tamano, 0);
  }

  async function desalojarSiHaceFalta(): Promise<void> {
    let total = await tamanoTotal();
    if (total <= topeBytes) return;

    const ficheros = (await sistema.listar(directorio)).sort((a, b) => a.usadoEn - b.usadoEn);
    for (const fichero of ficheros) {
      if (total <= topeBytes) break;
      await sistema.borrar(fichero.ruta);
      total -= fichero.tamano;
    }
  }

  return {
    rutaLocal,
    tamanoTotal,
    desalojarSiHaceFalta,

    /**
     * Ruta local del GIF, descargándolo si hace falta. Devuelve null cuando no
     * se pudo: sin conexión la pantalla cae a la miniatura y el entrenamiento
     * sigue igual.
     */
    async asegurar(ejercicioId: string, gifUrl: string): Promise<string | null> {
      const destino = rutaLocal(ejercicioId);
      await sistema.crearDirectorio(directorio);

      if (await sistema.existe(destino)) {
        await sistema.marcarUso(destino);
        return destino;
      }

      try {
        await sistema.descargar(gifUrl, destino);
        await sistema.marcarUso(destino);
        await desalojarSiHaceFalta();
        return destino;
      } catch {
        return null;
      }
    },

    async vaciar(): Promise<void> {
      for (const fichero of await sistema.listar(directorio)) {
        await sistema.borrar(fichero.ruta);
      }
    },
  };
}
