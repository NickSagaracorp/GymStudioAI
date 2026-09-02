import { calcularRacha, semanaDe } from '../racha';

// Agenda de referencia: lunes, martes, jueves, viernes.
const AGENDA = [1, 2, 4, 5];

// Días de referencia comprobados contra diaSemanaDe:
// 2026-08-31 lunes, 09-01 martes, 09-02 miércoles, 09-03 jueves,
// 09-04 viernes, 09-06 domingo.

describe('calcularRacha', () => {
  it('cuenta los días de agenda entrenados seguidos', () => {
    const racha = calcularRacha(['2026-08-31', '2026-09-01'], AGENDA, '2026-09-02');
    expect(racha.actual).toBe(2);
  });

  it('el fin de semana no rompe la racha', () => {
    const racha = calcularRacha(['2026-08-28', '2026-08-31'], AGENDA, '2026-08-31');
    expect(racha.actual).toBe(2);
  });

  it('un día de agenda fallado sí rompe la racha', () => {
    const racha = calcularRacha(['2026-08-31', '2026-09-03'], AGENDA, '2026-09-03');
    expect(racha.actual).toBe(1);
    expect(racha.record).toBe(1);
  });

  it('el día de hoy pendiente no rompe la racha', () => {
    const racha = calcularRacha(['2026-08-31', '2026-09-01'], AGENDA, '2026-09-03');
    expect(racha.actual).toBe(2);
  });

  it('el récord sobrevive a una racha rota', () => {
    const racha = calcularRacha(
      ['2026-08-31', '2026-09-01', '2026-09-03', '2026-09-04', '2026-09-08'],
      AGENDA,
      '2026-09-08',
    );
    expect(racha.actual).toBe(1);
    expect(racha.record).toBe(4);
  });

  it('entrenar fuera de agenda no suma a la racha', () => {
    const sinExtra = calcularRacha(['2026-08-31', '2026-09-01'], AGENDA, '2026-09-02');
    const conExtra = calcularRacha(
      ['2026-08-30', '2026-08-31', '2026-09-01'],
      AGENDA,
      '2026-09-02',
    );
    expect(sinExtra.actual).toBe(2);
    expect(conExtra.actual).toBe(2);
  });

  it('sin historial no hay racha', () => {
    expect(calcularRacha([], [1, 3, 5], '2026-09-02')).toEqual({ actual: 0, record: 0 });
  });

  it('sin agenda no hay racha', () => {
    expect(calcularRacha(['2026-08-31'], [], '2026-09-02')).toEqual({ actual: 0, record: 0 });
  });

  it('cambiar la agenda recalcula sin mutar la entrada', () => {
    const entrenados = ['2026-08-31', '2026-09-01'];
    const copia = [...entrenados];

    const conAgendaCompleta = calcularRacha(entrenados, AGENDA, '2026-09-02');
    const conAgendaReducida = calcularRacha(entrenados, [1, 3, 5], '2026-09-02');

    expect(conAgendaCompleta.actual).toBe(2);
    // Con agenda [1, 3, 5] (lunes, miércoles, viernes) el martes ya no cuenta
    // como día de agenda, así que solo el lunes forma parte de la racha.
    expect(conAgendaReducida.actual).toBe(1);
    expect(entrenados).toEqual(copia);
  });
});

describe('semanaDe', () => {
  it('devuelve los siete días de lunes a domingo', () => {
    const semana = semanaDe([], AGENDA, '2026-09-02');
    expect(semana.map((d) => d.dia)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
    expect(semana.map((d) => d.indiceSemana)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('marca fuego, helado, descanso y futuro sobre la agenda acordada', () => {
    // hoy = miércoles 2026-09-02, fuera de agenda.
    const semana = semanaDe(['2026-08-31'], AGENDA, '2026-09-02');
    const porDia = Object.fromEntries(semana.map((d) => [d.dia, d.estado]));

    expect(porDia['2026-08-31']).toBe('fuego'); // lunes entrenado
    expect(porDia['2026-09-01']).toBe('helado'); // martes de agenda, pasado, sin entrenar
    expect(porDia['2026-09-02']).toBe('descanso'); // miércoles fuera de agenda
    expect(porDia['2026-09-03']).toBe('futuro'); // jueves de agenda, aún no llega
  });

  it('un día fuera de agenda entrenado sale como extra', () => {
    const semana = semanaDe(['2026-08-31', '2026-09-02'], AGENDA, '2026-09-02');
    const miercoles = semana.find((d) => d.dia === '2026-09-02');
    expect(miercoles?.estado).toBe('extra');
  });

  it('el día de hoy, si es de agenda y no se ha entrenado, sale pendiente', () => {
    const semana = semanaDe([], AGENDA, '2026-09-03');
    const jueves = semana.find((d) => d.dia === '2026-09-03');
    expect(jueves?.estado).toBe('pendiente');
  });

  it('un día fuera de agenda nunca sale helado, aunque esté en el pasado', () => {
    // hoy = viernes 2026-09-04, así que el miércoles 09-02 ya es pasado.
    const semana = semanaDe([], AGENDA, '2026-09-04');
    const miercoles = semana.find((d) => d.dia === '2026-09-02');
    expect(miercoles?.estado).toBe('descanso');
  });
});
