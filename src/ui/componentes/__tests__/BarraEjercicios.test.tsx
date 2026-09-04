import { fireEvent, render } from '@testing-library/react-native';
import { BarraEjercicios } from '../BarraEjercicios';

function propsBase(parcial: Partial<Parameters<typeof BarraEjercicios>[0]> = {}) {
  return {
    total: 3,
    indice: 0,
    completos: [false, false, false],
    onAnterior: jest.fn(),
    onSiguiente: jest.fn(),
    onTerminar: jest.fn(),
    onIrA: jest.fn(),
    ...parcial,
  };
}

describe('barra de ejercicios', () => {
  it('con el primer ejercicio de tres, pinta siguiente y no terminar', async () => {
    const { getByTestId, queryByTestId } = await render(
      <BarraEjercicios {...propsBase({ indice: 0 })} />,
    );
    expect(getByTestId('siguiente-ejercicio')).toBeTruthy();
    expect(queryByTestId('terminar-sesion')).toBeNull();
  });

  it('con el último ejercicio de tres, pinta terminar y no siguiente', async () => {
    const { getByTestId, queryByTestId } = await render(
      <BarraEjercicios {...propsBase({ indice: 2 })} />,
    );
    expect(getByTestId('terminar-sesion')).toBeTruthy();
    expect(queryByTestId('siguiente-ejercicio')).toBeNull();
  });

  it('en el primer ejercicio no pinta el botón anterior', async () => {
    const { queryByTestId } = await render(<BarraEjercicios {...propsBase({ indice: 0 })} />);
    expect(queryByTestId('ejercicio-anterior')).toBeNull();
  });

  it('en el segundo ejercicio sí pinta el botón anterior', async () => {
    const { getByTestId } = await render(<BarraEjercicios {...propsBase({ indice: 1 })} />);
    expect(getByTestId('ejercicio-anterior')).toBeTruthy();
  });

  it('pinta un punto por ejercicio', async () => {
    const { getByTestId } = await render(<BarraEjercicios {...propsBase()} />);
    expect(getByTestId('punto-0')).toBeTruthy();
    expect(getByTestId('punto-1')).toBeTruthy();
    expect(getByTestId('punto-2')).toBeTruthy();
  });

  it('tocar un punto llama a onIrA con su índice', async () => {
    const onIrA = jest.fn();
    const { getByTestId } = await render(<BarraEjercicios {...propsBase({ onIrA })} />);
    fireEvent.press(getByTestId('punto-2'));
    expect(onIrA).toHaveBeenCalledWith(2);
  });

  it('pulsar el botón principal llama a onSiguiente cuando no es el último', async () => {
    const onSiguiente = jest.fn();
    const { getByTestId } = await render(
      <BarraEjercicios {...propsBase({ indice: 0, onSiguiente })} />,
    );
    fireEvent.press(getByTestId('siguiente-ejercicio'));
    expect(onSiguiente).toHaveBeenCalled();
  });

  it('pulsar el botón principal llama a onTerminar cuando es el último', async () => {
    const onTerminar = jest.fn();
    const { getByTestId } = await render(
      <BarraEjercicios {...propsBase({ indice: 2, onTerminar })} />,
    );
    fireEvent.press(getByTestId('terminar-sesion'));
    expect(onTerminar).toHaveBeenCalled();
  });

  it('con un único ejercicio, ese ejercicio es el último y pinta terminar', async () => {
    const { getByTestId } = await render(
      <BarraEjercicios {...propsBase({ total: 1, indice: 0, completos: [false] })} />,
    );
    expect(getByTestId('terminar-sesion')).toBeTruthy();
  });
});
