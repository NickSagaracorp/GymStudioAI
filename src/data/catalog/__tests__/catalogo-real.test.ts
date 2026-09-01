import ejercicios from '../../../../assets/catalog/ejercicios.json';
import { crearCatalogo } from '../catalogo';
import { MUSCULOS } from '../tipos';
import type { Ejercicio } from '../tipos';

const catalogo = crearCatalogo(ejercicios as Ejercicio[]);

describe('catálogo real generado', () => {
  it('contiene 566 ejercicios', () => {
    expect(catalogo.todos()).toHaveLength(566);
  });

  it('cubre los trece músculos con al menos un ejercicio', () => {
    for (const musculo of MUSCULOS) {
      expect(catalogo.porMusculo(musculo).length).toBeGreaterThan(0);
    }
  });

  it('no contiene ejercicios de músculos no soportados', () => {
    for (const ejercicio of catalogo.todos()) {
      expect(MUSCULOS).toContain(ejercicio.musculo);
    }
  });

  it('todas las animaciones apuntan al CDN con la versión fijada', () => {
    for (const ejercicio of catalogo.todos()) {
      expect(ejercicio.gifUrl).toContain('ExerciseGymGifsDB@v1.2.0');
    }
  });
});
