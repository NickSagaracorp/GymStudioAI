import type { Catalogo, Ejercicio, Musculo } from './tipos';

/** Minúsculas y sin tildes, para que la búsqueda no dependa de cómo se escriba. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(new RegExp('[\u0300-\u036f]', 'g'), '')
    .toLowerCase();
}

export function crearCatalogo(ejercicios: Ejercicio[]): Catalogo {
  const porIdentificador = new Map(ejercicios.map((e) => [e.id, e]));

  const porMusculoMapa = new Map<Musculo, Ejercicio[]>();
  for (const ejercicio of ejercicios) {
    const lista = porMusculoMapa.get(ejercicio.musculo) ?? [];
    lista.push(ejercicio);
    porMusculoMapa.set(ejercicio.musculo, lista);
  }

  return {
    todos: () => ejercicios,
    porId: (id) => porIdentificador.get(id),
    porMusculo: (musculo) => porMusculoMapa.get(musculo) ?? [],
    buscar: (texto) => {
      const aguja = normalizar(texto);
      return ejercicios.filter((e) => normalizar(e.nombre).includes(aguja));
    },
  };
}
