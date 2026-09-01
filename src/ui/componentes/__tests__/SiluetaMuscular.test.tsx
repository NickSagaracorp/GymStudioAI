import { processColor } from 'react-native';
import { render } from '@testing-library/react-native';
import { SiluetaMuscular, vistaPara } from '../SiluetaMuscular';
import { colores } from '@/ui/tema';

// react-native-svg normaliza el color a un entero, no conserva la cadena.
const comoSvg = (color: string) => ({ payload: processColor(color), type: 0 });

describe('silueta muscular', () => {
  it('pinta el músculo principal con el color de acento', async () => {
    const { getByTestId } = await render(
      <SiluetaMuscular principales={['pectorals']} secundarios={[]} vista="frontal" />,
    );
    expect(getByTestId('region-pectorals-0').props.fill).toEqual(comoSvg(colores.musculoPrincipal));
  });

  it('pinta los secundarios en tono apagado', async () => {
    const { getByTestId } = await render(
      <SiluetaMuscular principales={['pectorals']} secundarios={['triceps']} vista="posterior" />,
    );
    expect(getByTestId('region-triceps-0').props.fill).toEqual(comoSvg(colores.musculoSecundario));
  });

  it('deja inactivos los músculos que no se trabajan', async () => {
    const { getByTestId } = await render(
      <SiluetaMuscular principales={['pectorals']} secundarios={[]} vista="frontal" />,
    );
    expect(getByTestId('region-quads-0').props.fill).toEqual(comoSvg(colores.musculoInactivo));
  });

  it('la vista posterior incluye dorsales y glúteos', async () => {
    const { getByTestId } = await render(
      <SiluetaMuscular principales={['lats']} secundarios={[]} vista="posterior" />,
    );
    expect(getByTestId('region-lats-0').props.fill).toEqual(comoSvg(colores.musculoPrincipal));
    expect(getByTestId('region-glutes-0')).toBeTruthy();
  });

  it('pinta las dos mitades del cuerpo, no solo una', async () => {
    const { getByTestId } = await render(
      <SiluetaMuscular principales={['quads']} secundarios={[]} vista="frontal" />,
    );
    expect(getByTestId('region-quads-0').props.fill).toEqual(comoSvg(colores.musculoPrincipal));
    expect(getByTestId('region-quads-1').props.fill).toEqual(comoSvg(colores.musculoPrincipal));
  });
});

describe('elección de vista', () => {
  it('usa la posterior cuando el día es de espalda', () => {
    expect(vistaPara(['lats', 'upper-back', 'biceps'])).toBe('posterior');
  });

  it('usa la frontal cuando el día es de empuje', () => {
    expect(vistaPara(['pectorals', 'delts', 'triceps'])).toBe('frontal');
  });

  it('usa la frontal en caso de empate', () => {
    expect(vistaPara(['delts'])).toBe('frontal');
  });
});
