import { crearAdaptadorMemoria } from '../../pruebas/adaptadorMemoria';
import { migrar } from '../../migraciones';
import { repoMediciones } from '../mediciones';

describe('repositorio de mediciones', () => {
  it('guarda peso y medidas juntos y los recupera', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({
      fecha: '2026-09-06',
      pesoKg: 78.4,
      notas: null,
      medidas: { cintura: 84, brazo_izq: 36, brazo_der: 36.5 },
    });

    const historial = await repo.historial();
    expect(historial).toHaveLength(1);
    expect(historial[0]?.pesoKg).toBe(78.4);
    expect(historial[0]?.medidas.cintura).toBe(84);
    expect(historial[0]?.medidas.brazo_der).toBe(36.5);
  });

  it('ordena el historial de la más antigua a la más reciente', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({ fecha: '2026-09-13', pesoKg: 78, notas: null, medidas: {} });
    await repo.guardar({ fecha: '2026-09-06', pesoKg: 79, notas: null, medidas: {} });

    expect((await repo.historial()).map((m) => m.fecha)).toEqual(['2026-09-06', '2026-09-13']);
  });

  it('sabe si ya hay medición en una fecha', async () => {
    const adaptador = crearAdaptadorMemoria();
    await migrar(adaptador);
    const repo = repoMediciones(adaptador);

    await repo.guardar({ fecha: '2026-09-06', pesoKg: 78, notas: null, medidas: {} });

    expect(await repo.hayEn('2026-09-06')).toBe(true);
    expect(await repo.hayEn('2026-09-07')).toBe(false);
  });
});
