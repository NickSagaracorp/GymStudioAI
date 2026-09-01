import ejercicios from '../../assets/catalog/ejercicios.json';
import { crearCatalogo } from '@/data/catalog/catalogo';
import type { Catalogo, Ejercicio } from '@/data/catalog/tipos';
import { abrirAdaptadorExpo } from '@/data/db/adaptador';
import { migrar } from '@/data/db/migraciones';
import { repoMediciones } from '@/data/db/repos/mediciones';
import { repoPerfil } from '@/data/db/repos/perfil';
import { repoPrograma } from '@/data/db/repos/programa';
import { repoNutricion } from '@/data/db/repos/nutricion';
import { repoRetos } from '@/data/db/repos/retos';
import { repoSesion } from '@/data/db/repos/sesion';
import { crearCacheGifs } from '@/services/cacheGifs';
import { crearSistemaFicherosExpo } from '@/services/sistemaFicheros';

export interface Contenedor {
  catalogo: Catalogo;
  perfil: ReturnType<typeof repoPerfil>;
  programa: ReturnType<typeof repoPrograma>;
  sesion: ReturnType<typeof repoSesion>;
  mediciones: ReturnType<typeof repoMediciones>;
  retos: ReturnType<typeof repoRetos>;
  nutricion: ReturnType<typeof repoNutricion>;
  cache: ReturnType<typeof crearCacheGifs>;
}

/** Abre la base, migra, carga el catálogo y monta los repositorios. */
export async function crearContenedor(): Promise<Contenedor> {
  const adaptador = await abrirAdaptadorExpo();
  await migrar(adaptador);

  const { Paths } = await import('expo-file-system');
  const sistema = await crearSistemaFicherosExpo();
  const directorio = `${Paths.document.uri}gifs/`;

  const sesion = repoSesion(adaptador);
  // Un borrador de ayer ya no se retoma: se da por abandonado.
  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);
  await sesion.abandonarBorradoresAnteriores(inicioDeHoy.toISOString());

  return {
    catalogo: crearCatalogo(ejercicios as Ejercicio[]),
    perfil: repoPerfil(adaptador),
    programa: repoPrograma(adaptador),
    sesion,
    mediciones: repoMediciones(adaptador),
    retos: repoRetos(adaptador),
    nutricion: repoNutricion(adaptador),
    cache: crearCacheGifs(sistema, directorio),
  };
}
