import { render } from '@testing-library/react-native';
import { MarcadorSemanal } from '../MarcadorSemanal';
import type { DiaMarcador } from '@/domain/gamificacion/racha';

function diaMarcador(parcial: Partial<DiaMarcador> & Pick<DiaMarcador, 'indiceSemana' | 'estado'>): DiaMarcador {
  return { dia: '2026-09-01', ...parcial };
}

const SEMANA: DiaMarcador[] = [
  diaMarcador({ dia: '2026-08-31', indiceSemana: 1, estado: 'fuego' }),
  diaMarcador({ dia: '2026-09-01', indiceSemana: 2, estado: 'fuego' }),
  diaMarcador({ dia: '2026-09-02', indiceSemana: 3, estado: 'pendiente' }),
  diaMarcador({ dia: '2026-09-03', indiceSemana: 4, estado: 'futuro' }),
  diaMarcador({ dia: '2026-09-04', indiceSemana: 5, estado: 'futuro' }),
  diaMarcador({ dia: '2026-09-05', indiceSemana: 6, estado: 'descanso' }),
  diaMarcador({ dia: '2026-08-30', indiceSemana: 0, estado: 'helado' }),
];

describe('marcador semanal', () => {
  it('pinta siete círculos', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={3} record={5} />,
    );
    for (let i = 0; i < 7; i += 1) {
      expect(getByTestId(`marcador-${i}`)).toBeTruthy();
    }
  });

  it('un día con estado fuego lleva el icono de fuego', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={3} record={5} />,
    );
    expect(getByTestId('marcador-1')).toHaveTextContent('🔥');
  });

  it('un día con estado helado lleva el icono de hielo', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={3} record={5} />,
    );
    expect(getByTestId('marcador-0')).toHaveTextContent('🧊');
  });

  it('un día con estado pendiente no lleva icono', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={3} record={5} />,
    );
    expect(getByTestId('marcador-3')).toHaveTextContent('');
  });

  it('con racha 0 invita a empezar', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={0} record={5} />,
    );
    expect(getByTestId('texto-racha')).toHaveTextContent('Entrena hoy y empieza tu racha');
  });

  it('con racha 1 usa el singular', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={1} record={5} />,
    );
    expect(getByTestId('texto-racha')).toHaveTextContent(/1 día de racha/);
  });

  it('con racha 5 y récord 12 muestra ambos números', async () => {
    const { getByTestId } = await render(
      <MarcadorSemanal dias={SEMANA} racha={5} record={12} />,
    );
    expect(getByTestId('texto-racha')).toHaveTextContent(/5/);
    expect(getByTestId('texto-racha')).toHaveTextContent(/12/);
  });
});
