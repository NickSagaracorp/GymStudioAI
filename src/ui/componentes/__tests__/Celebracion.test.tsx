import { act, fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Celebracion } from '../Celebracion';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('celebración', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('no pinta el título cuando no es visible', async () => {
    const { queryByTestId } = await render(
      <Celebracion visible={false} nivel="chico" titulo="Serie completada" onCerrar={jest.fn()} />,
    );
    expect(queryByTestId('titulo-celebracion')).toBeNull();
  });

  it(
    'pinta título y detalle cuando es visible',
    async () => {
      const { getByTestId } = await render(
        <Celebracion
          visible
          nivel="medio"
          titulo="Ejercicio completado"
          detalle="Todas las series hechas"
          onCerrar={jest.fn()}
        />,
      );
      expect(getByTestId('titulo-celebracion')).toHaveTextContent('Ejercicio completado');
      expect(getByTestId('detalle-celebracion')).toHaveTextContent('Todas las series hechas');
    },
    15000,
  );

  it(
    'pinta piezas de confeti en nivel grande',
    async () => {
      const { getAllByTestId } = await render(
        <Celebracion visible nivel="grande" titulo="Día completado" onCerrar={jest.fn()} />,
      );
      expect(getAllByTestId(/^confeti-/).length).toBeGreaterThan(0);
    },
    15000,
  );

  it('no pinta ninguna pieza de confeti en nivel chico', async () => {
    const { queryAllByTestId } = await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={jest.fn()} />,
    );
    expect(queryAllByTestId(/^confeti-/).length).toBe(0);
  });

  it(
    'llama a notificationAsync al aparecer en nivel grande',
    async () => {
      await render(<Celebracion visible nivel="grande" titulo="Día completado" onCerrar={jest.fn()} />);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    },
    15000,
  );

  it(
    'llama a notificationAsync al aparecer en nivel medio',
    async () => {
      await render(<Celebracion visible nivel="medio" titulo="Músculo completado" onCerrar={jest.fn()} />);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    },
    15000,
  );

  it('dispara onCerrar al tocar el fondo', async () => {
    const onCerrar = jest.fn();
    const { getByTestId } = await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={onCerrar} />,
    );
    await act(async () => {
      await fireEvent.press(getByTestId('cerrar-celebracion'));
    });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
