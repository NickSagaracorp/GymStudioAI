import type { Adaptador } from '../adaptador';

export const TIPOS_MEDIDA = [
  'cuello',
  'pecho',
  'cintura',
  'cadera',
  'brazo_izq',
  'brazo_der',
  'muslo_izq',
  'muslo_der',
  'pantorrilla',
] as const;

export type TipoMedida = (typeof TIPOS_MEDIDA)[number];

export interface Medicion {
  id: number;
  fecha: string;
  pesoKg: number;
  notas: string | null;
  medidas: Partial<Record<TipoMedida, number>>;
}

export type MedicionNueva = Omit<Medicion, 'id'>;

export function repoMediciones(adaptador: Adaptador) {
  return {
    async guardar(medicion: MedicionNueva): Promise<number> {
      const medicionId = await adaptador.insertar(
        'INSERT INTO medicion (fecha, peso_kg, notas) VALUES (?, ?, ?)',
        [medicion.fecha, medicion.pesoKg, medicion.notas],
      );

      for (const [tipo, valor] of Object.entries(medicion.medidas)) {
        if (typeof valor === 'number') {
          await adaptador.ejecutar(
            'INSERT INTO medida (medicion_id, tipo, valor_cm) VALUES (?, ?, ?)',
            [medicionId, tipo, valor],
          );
        }
      }

      return medicionId;
    },

    /** De la más antigua a la más reciente, que es como se dibujan las gráficas. */
    async historial(): Promise<Medicion[]> {
      const cabeceras = await adaptador.consultar<{
        id: number;
        fecha: string;
        peso_kg: number;
        notas: string | null;
      }>('SELECT id, fecha, peso_kg, notas FROM medicion ORDER BY fecha');

      const medidas = await adaptador.consultar<{
        medicion_id: number;
        tipo: TipoMedida;
        valor_cm: number;
      }>('SELECT medicion_id, tipo, valor_cm FROM medida');

      return cabeceras.map((cabecera) => ({
        id: cabecera.id,
        fecha: cabecera.fecha,
        pesoKg: cabecera.peso_kg,
        notas: cabecera.notas,
        medidas: Object.fromEntries(
          medidas
            .filter((m) => m.medicion_id === cabecera.id)
            .map((m) => [m.tipo, m.valor_cm]),
        ) as Partial<Record<TipoMedida, number>>,
      }));
    },

    async hayEn(fecha: string): Promise<boolean> {
      const filas = await adaptador.consultar<{ total: number }>(
        'SELECT COUNT(*) AS total FROM medicion WHERE fecha = ?',
        [fecha],
      );
      return (filas[0]?.total ?? 0) > 0;
    },
  };
}
