import { diaDeIso, diaLocal, diaSemanaDe, lunesDe, sumarDias } from '../fechas';

describe('diaLocal', () => {
  it('usa la fecha local, no la UTC', () => {
    expect(diaLocal(new Date(2026, 8, 2, 22, 30))).toBe('2026-09-02');
  });
});

describe('diaDeIso', () => {
  it('una marca a las 22:00 locales cuenta para ese mismo día', () => {
    const iso = new Date(2026, 8, 2, 22, 0).toISOString();
    expect(diaDeIso(iso)).toBe('2026-09-02');
  });
});

describe('sumarDias', () => {
  it('cruza el fin de mes', () => {
    expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('cruza el fin de año hacia atrás', () => {
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('diaSemanaDe', () => {
  it('2026-09-02 es miércoles', () => {
    expect(diaSemanaDe('2026-09-02')).toBe(3);
  });
});

describe('lunesDe', () => {
  it('un miércoles pertenece a la semana que empezó el lunes anterior', () => {
    expect(lunesDe('2026-09-02')).toBe('2026-08-31');
  });

  it('un domingo pertenece a la semana que empezó seis días antes', () => {
    expect(lunesDe('2026-09-06')).toBe('2026-08-31');
  });

  it('un lunes es el lunes de su propia semana', () => {
    expect(lunesDe('2026-08-31')).toBe('2026-08-31');
  });
});
