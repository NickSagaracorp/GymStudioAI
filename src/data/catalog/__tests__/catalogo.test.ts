import { crearCatalogo } from '../catalogo';
import type { Ejercicio } from '../tipos';

const ejercicios: Ejercicio[] = [
  {
    id: 'biceps/dumbbell-biceps-curl',
    nombre: 'Curl de bíceps con mancuernas',
    musculo: 'biceps',
    equipamiento: 'dumbbell',
    musculosSecundarios: ['forearms'],
    miniatura: 'biceps__dumbbell-biceps-curl',
    gifUrl: 'https://cdn/curl.gif',
  },
  {
    id: 'lats/chin-up',
    nombre: 'Dominada supina',
    musculo: 'lats',
    equipamiento: 'bodyweight',
    musculosSecundarios: ['biceps'],
    miniatura: 'lats__chin-up',
    gifUrl: 'https://cdn/chin.gif',
  },
];

const catalogo = crearCatalogo(ejercicios);

describe('catálogo', () => {
  it('devuelve un ejercicio por su identificador', () => {
    expect(catalogo.porId('lats/chin-up')?.nombre).toBe('Dominada supina');
  });

  it('devuelve undefined si el identificador no existe', () => {
    expect(catalogo.porId('no/existe')).toBeUndefined();
  });

  it('filtra por músculo principal', () => {
    expect(catalogo.porMusculo('biceps').map((e) => e.id)).toEqual([
      'biceps/dumbbell-biceps-curl',
    ]);
  });

  it('busca por nombre ignorando mayúsculas y acentos', () => {
    expect(catalogo.buscar('DOMINADA').map((e) => e.id)).toEqual(['lats/chin-up']);
    expect(catalogo.buscar('biceps').map((e) => e.id)).toEqual([
      'biceps/dumbbell-biceps-curl',
    ]);
  });
});
