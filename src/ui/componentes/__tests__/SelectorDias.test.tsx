import { fireEvent, render } from '@testing-library/react-native';
import { SelectorDias } from '../SelectorDias';

describe('selector de días de la agenda', () => {
  it('pinta siete chips y el primero visualmente es la L', async () => {
    const { getAllByRole } = await render(
      <SelectorDias seleccionados={[1, 3, 5]} onCambio={jest.fn()} />,
    );

    const chips = getAllByRole('button');
    expect(chips).toHaveLength(7);
    expect(chips[0]).toHaveTextContent('L');
  });

  it('al tocar un chip inactivo lo añade y devuelve la lista ordenada', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <SelectorDias seleccionados={[1, 5]} onCambio={onCambio} />,
    );

    await fireEvent.press(getByTestId('dia-agenda-3'));

    expect(onCambio).toHaveBeenCalledWith([1, 3, 5]);
  });

  it('al tocar un chip activo lo quita', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <SelectorDias seleccionados={[1, 3, 5]} onCambio={onCambio} />,
    );

    await fireEvent.press(getByTestId('dia-agenda-3'));

    expect(onCambio).toHaveBeenCalledWith([1, 5]);
  });

  it('con exactamente dos seleccionados no deja bajar de dos', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <SelectorDias seleccionados={[1, 5]} onCambio={onCambio} />,
    );

    await fireEvent.press(getByTestId('dia-agenda-1'));

    expect(onCambio).not.toHaveBeenCalled();
  });

  it('con seis seleccionados no deja pasar de seis', async () => {
    const onCambio = jest.fn();
    const { getByTestId } = await render(
      <SelectorDias seleccionados={[0, 1, 2, 3, 4, 5]} onCambio={onCambio} />,
    );

    await fireEvent.press(getByTestId('dia-agenda-6'));

    expect(onCambio).not.toHaveBeenCalled();
  });
});
