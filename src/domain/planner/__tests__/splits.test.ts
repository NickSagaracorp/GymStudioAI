import { splitPara } from '../splits';

describe('splits', () => {
  it('devuelve un día por cada día disponible, de 2 a 6', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      expect(splitPara(dias).dias).toHaveLength(dias);
    }
  });

  it('asigna el identificador correcto a cada número de días', () => {
    expect(splitPara(2).id).toBe('fullbody2');
    expect(splitPara(3).id).toBe('ppl3');
    expect(splitPara(4).id).toBe('torso_pierna4');
    expect(splitPara(5).id).toBe('split5');
    expect(splitPara(6).id).toBe('ppl6');
  });

  it('reparte empuje, tirón y pierna en el split de tres días', () => {
    expect(splitPara(3).dias.map((d) => d.nombre)).toEqual(['Empuje', 'Tirón', 'Pierna']);
  });

  it('repite el ciclo dos veces en seis días', () => {
    const dias = splitPara(6).dias;
    expect(dias[0]?.musculos).toEqual(dias[3]?.musculos);
  });

  it('cubre pectoral, dorsal y cuádriceps en todos los splits', () => {
    for (let dias = 2; dias <= 6; dias += 1) {
      const musculos = splitPara(dias).dias.flatMap((d) => d.musculos);
      expect(musculos).toContain('pectorals');
      expect(musculos).toContain('lats');
      expect(musculos).toContain('quads');
    }
  });

  it('rechaza números de días fuera del rango soportado', () => {
    expect(() => splitPara(1)).toThrow('Días por semana no soportados: 1');
    expect(() => splitPara(7)).toThrow('Días por semana no soportados: 7');
  });
});
