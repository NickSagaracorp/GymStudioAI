import Constants, { ExecutionEnvironment } from 'expo-constants';

const HORA_AVISO = 8;

/**
 * expo-notifications no se puede ni importar dentro de Expo Go en Android:
 * desde el SDK 53 su módulo lanza una excepción al evaluarse, porque Expo Go
 * dejó de soportar notificaciones push. Hace falta una build de desarrollo.
 */
export function hayNotificaciones(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

/**
 * Aviso semanal para registrar peso y medidas. Notificación local: no hay
 * servidor ni cuenta detrás. Devuelve false si no se pudo programar, y la app
 * sigue funcionando igual: la pantalla de inicio muestra la tarjeta ese día
 * aunque no llegue el aviso.
 */
export async function programarAvisoMedicion(diaSemana: number): Promise<boolean> {
  if (!hayNotificaciones()) return false;

  try {
    const Notifications = await import('expo-notifications');

    await Notifications.cancelAllScheduledNotificationsAsync();

    const permiso = await Notifications.getPermissionsAsync();
    const concedido = permiso.granted
      ? true
      : (await Notifications.requestPermissionsAsync()).granted;
    if (!concedido) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Toca pesarte',
        body: 'Registra tu peso y medidas de esta semana.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        // expo cuenta el domingo como 1 y el perfil lo guarda como 0.
        weekday: diaSemana + 1,
        hour: HORA_AVISO,
        minute: 0,
      },
    });

    return true;
  } catch {
    return false;
  }
}
