import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Boton } from './Boton';
import { colores, espaciado, tipografia } from '@/ui/tema';

function formatear(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export function CronometroDescanso({
  segundos,
  onFin,
}: {
  segundos: number;
  onFin: () => void;
}) {
  const [restante, setRestante] = useState(segundos);
  const avisado = useRef(false);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setRestante((anterior) => Math.max(0, anterior - 1));
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (restante === 0 && !avisado.current) {
      avisado.current = true;
      onFin();
    }
  }, [restante, onFin]);

  return (
    <View
      style={{
        backgroundColor: colores.superficie,
        padding: espaciado.lg,
        alignItems: 'center',
        gap: espaciado.md,
      }}
    >
      <Text style={tipografia.tenue}>Descanso</Text>
      <Text testID="restante" style={tipografia.numero}>
        {formatear(restante)}
      </Text>
      <View style={{ flexDirection: 'row', gap: espaciado.sm }}>
        <Boton
          testID="sumar-30"
          variante="secundario"
          titulo="+30 s"
          onPress={() => setRestante((anterior) => anterior + 30)}
        />
        <Boton
          testID="saltar"
          titulo="Saltar"
          onPress={() => {
            avisado.current = true;
            onFin();
          }}
        />
      </View>
    </View>
  );
}
