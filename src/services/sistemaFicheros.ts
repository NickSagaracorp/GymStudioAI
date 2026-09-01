export interface FicheroCache {
  ruta: string;
  tamano: number;
  /** Marca temporal en milisegundos del último acceso conocido. */
  usadoEn: number;
}

/**
 * Frontera con el sistema de ficheros. La caché de GIFs se prueba contra una
 * implementación falsa, sin tocar disco ni depender de expo-file-system.
 */
export interface SistemaFicheros {
  crearDirectorio(ruta: string): Promise<void>;
  existe(ruta: string): Promise<boolean>;
  descargar(url: string, destino: string): Promise<void>;
  listar(directorio: string): Promise<FicheroCache[]>;
  borrar(ruta: string): Promise<void>;
  marcarUso(ruta: string): Promise<void>;
}

/**
 * Implementación sobre la API de expo-file-system del SDK 57 (File, Directory).
 * El último uso se lleva en memoria porque el sistema de ficheros solo expone
 * la fecha de modificación, que no cambia al leer.
 */
export async function crearSistemaFicherosExpo(): Promise<SistemaFicheros> {
  const { Directory, File } = await import('expo-file-system');
  const usos = new Map<string, number>();

  return {
    crearDirectorio: async (ruta) => {
      const directorio = new Directory(ruta);
      if (!directorio.exists) directorio.create({ intermediates: true, idempotent: true });
    },

    existe: async (ruta) => new File(ruta).exists,

    descargar: async (url, destino) => {
      await File.downloadFileAsync(url, new File(destino), { idempotent: true });
    },

    listar: async (directorio) => {
      const carpeta = new Directory(directorio);
      if (!carpeta.exists) return [];

      return carpeta
        .list()
        .filter((entrada): entrada is InstanceType<typeof File> => entrada instanceof File)
        .map((fichero) => ({
          ruta: fichero.uri,
          tamano: fichero.size ?? 0,
          usadoEn: usos.get(fichero.uri) ?? (fichero.modificationTime ?? 0) * 1000,
        }));
    },

    borrar: async (ruta) => {
      const fichero = new File(ruta);
      if (fichero.exists) fichero.delete();
      usos.delete(ruta);
    },

    marcarUso: async (ruta) => {
      usos.set(ruta, Date.now());
    },
  };
}
