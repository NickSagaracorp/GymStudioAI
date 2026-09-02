import { act, fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Celebracion } from '../Celebracion';

// Montar el primer `Modal` bajo jest-expo cuesta unos dos segundos, y con
// varios workers en paralelo eso roza el límite de 5 s por test. El coste está
// en el preset, no en el componente: medido, el confeti aporta 0,6 s y el Modal
// 2,2 s. El Modal no se puede quitar, porque la celebración tiene que poder
// aparecer por encima del cronómetro de descanso, que también es un Modal.
jest.setTimeout(15000);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('celebración', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it('no pinta el título cuando no es visible', async () => {
    const { queryByTestId } = await render(
      <Celebracion visible={false} nivel="chico" titulo="Serie completada" onCerrar={jest.fn()} />,
    );
    expect(queryByTestId('titulo-celebracion')).toBeNull();
  });

  it('pinta título y detalle cuando es visible', async () => {
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
  });

  it('pinta piezas de confeti en nivel grande', async () => {
    const { getAllByTestId } = await render(
      <Celebracion visible nivel="grande" titulo="Día completado" onCerrar={jest.fn()} />,
    );
    expect(getAllByTestId(/^confeti-/).length).toBeGreaterThan(0);
  });

  it('no pinta ninguna pieza de confeti en nivel chico', async () => {
    const { queryAllByTestId } = await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={jest.fn()} />,
    );
    expect(queryAllByTestId(/^confeti-/).length).toBe(0);
  });

  it('vibra flojito en nivel chico, sin notificación de éxito', async () => {
    await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={jest.fn()} />,
    );
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('llama a notificationAsync al aparecer en nivel grande', async () => {
    await render(
      <Celebracion visible nivel="grande" titulo="Día completado" onCerrar={jest.fn()} />,
    );
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('llama a notificationAsync al aparecer en nivel medio', async () => {
    await render(
      <Celebracion visible nivel="medio" titulo="Músculo completado" onCerrar={jest.fn()} />,
    );
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('no vibra mientras no es visible', async () => {
    await render(
      <Celebracion visible={false} nivel="grande" titulo="Día completado" onCerrar={jest.fn()} />,
    );
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('dispara onCerrar al tocar el fondo', async () => {
    const onCerrar = jest.fn();
    const { getByTestId } = await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={onCerrar} />,
    );
    await fireEvent.press(getByTestId('cerrar-celebracion'));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it('se cierra sola cuando pasa su duración', async () => {
    const onCerrar = jest.fn();
    await render(
      <Celebracion visible nivel="chico" titulo="Serie completada" onCerrar={onCerrar} />,
    );

    expect(onCerrar).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });
});
