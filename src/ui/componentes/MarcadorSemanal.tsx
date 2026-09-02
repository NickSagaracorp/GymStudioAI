import { Text, View } from 'react-native';
import type { DiaMarcador, EstadoDia } from '@/domain/gamificacion/racha';
import { colores, espaciado, radio, tipografia } from '@/ui/tema';

const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const ICONO: Record<EstadoDia, string> = {
  fuego: '🔥',
  extra: '🔥',
  helado: '🧊',
  pendiente: '',
  futuro: '',
  descanso: '',
};

const FONDO: Record<EstadoDia, string> = {
  fuego: colores.acento,
  extra: colores.superficieAlta,
  helado: colores.superficieAlta,
  pendiente: 'transparent',
  futuro: colores.superficie,
  descanso: 'transparent',
};

export function MarcadorSemanal({
  dias,
  racha,
  record,
}: {
  dias: DiaMarcador[];
  racha: number;
  record: number;
}) {
  return (
    <View style={{ gap: espaciado.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {dias.map((dia) => (
          <View key={dia.dia} style={{ alignItems: 'center', gap: espaciado.xs }}>
            <Text style={tipografia.tenue}>{LETRAS[dia.indiceSemana]}</Text>
            <View
              testID={`marcador-${dia.indiceSemana}`}
              accessibilityLabel={`${LETRAS[dia.indiceSemana]}: ${dia.estado}`}
              style={{
                width: 34,
                height: 34,
                borderRadius: radio.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: FONDO[dia.estado],
                borderWidth: dia.estado === 'pendiente' ? 2 : 1,
                borderColor:
                  dia.estado === 'pendiente' ? colores.acento : colores.borde,
                opacity: dia.estado === 'descanso' || dia.estado === 'extra' ? 0.55 : 1,
              }}
            >
              <Text style={{ fontSize: 16 }}>{ICONO[dia.estado]}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text testID="texto-racha" style={tipografia.tenue}>
        {racha > 0
          ? `🔥 ${racha} ${racha === 1 ? 'día' : 'días'} de racha · récord ${record}`
          : 'Entrena hoy y empieza tu racha'}
      </Text>
    </View>
  );
}
