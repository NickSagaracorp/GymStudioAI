import { crearCacheGifs } from '../cacheGifs';
import type { FicheroCache, SistemaFicheros } from '../sistemaFicheros';

function ficherosFalsos(iniciales: FicheroCache[] = []) {
  const ficheros = new Map(iniciales.map((f) => [f.ruta, f]));
  const descargas: string[] = [];
  let reloj = 1000;

  const sistema: SistemaFicheros = {
    crearDirectorio: async () => undefined,
    existe: async (ruta) => ficheros.has(ruta),
    descargar: async (url, destino) => {
      descargas.push(url);
      ficheros.set(destino, { ruta: destino, tamano: 1_000_000, usadoEn: (reloj += 1) });
    },
    listar: async () => [...ficheros.values()],
    borrar: async (ruta) => {
      ficheros.delete(ruta);
    },
    marcarUso: async (ruta) => {
      const fichero = ficheros.get(ruta);
      if (fichero) ficheros.set(ruta, { ...fichero, usadoEn: (reloj += 1) });
    },
  };

  return { sistema, ficheros, descargas };
}

const DIRECTORIO = '/datos/gifs/';
const RUTA_CURL = '/datos/gifs/biceps__dumbbell-biceps-curl.gif';

describe('caché de animaciones', () => {
  it('descarga el GIF la primera vez y devuelve la ruta local', async () => {
    const { sistema, descargas } = ficherosFalsos();
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    const ruta = await cache.asegurar('biceps/dumbbell-biceps-curl', 'https://cdn/curl.gif');

    expect(ruta).toBe(RUTA_CURL);
    expect(descargas).toEqual(['https://cdn/curl.gif']);
  });

  it('no vuelve a descargar si ya está en caché', async () => {
    const { sistema, descargas } = ficherosFalsos([
      { ruta: RUTA_CURL, tamano: 100, usadoEn: 1 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    await cache.asegurar('biceps/dumbbell-biceps-curl', 'https://cdn/curl.gif');

    expect(descargas).toEqual([]);
  });

  it('devuelve null si la descarga falla', async () => {
    const { sistema } = ficherosFalsos();
    sistema.descargar = async () => {
      throw new Error('sin red');
    };
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    expect(await cache.asegurar('biceps/x', 'https://cdn/x.gif')).toBeNull();
  });

  it('desaloja los menos usados al superar el tope', async () => {
    const { sistema, ficheros } = ficherosFalsos([
      { ruta: '/datos/gifs/a.gif', tamano: 600, usadoEn: 1 },
      { ruta: '/datos/gifs/b.gif', tamano: 600, usadoEn: 2 },
      { ruta: '/datos/gifs/c.gif', tamano: 600, usadoEn: 3 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO, 1200);

    await cache.desalojarSiHaceFalta();

    expect(ficheros.has('/datos/gifs/a.gif')).toBe(false);
    expect(ficheros.has('/datos/gifs/c.gif')).toBe(true);
  });

  it('informa del tamaño total ocupado', async () => {
    const { sistema } = ficherosFalsos([
      { ruta: '/datos/gifs/a.gif', tamano: 500, usadoEn: 1 },
      { ruta: '/datos/gifs/b.gif', tamano: 700, usadoEn: 2 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    expect(await cache.tamanoTotal()).toBe(1200);
  });

  it('vaciar deja la caché sin ficheros', async () => {
    const { sistema, ficheros } = ficherosFalsos([
      { ruta: '/datos/gifs/a.gif', tamano: 500, usadoEn: 1 },
      { ruta: '/datos/gifs/b.gif', tamano: 700, usadoEn: 2 },
    ]);
    const cache = crearCacheGifs(sistema, DIRECTORIO);

    await cache.vaciar();

    expect(ficheros.size).toBe(0);
  });
});
