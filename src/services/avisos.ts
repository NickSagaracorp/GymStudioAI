import * as Notifications from 'expo-notifications';

const HORA_AVISO = 8;

/**
 * Aviso semanal para registrar peso y medidas. Es una notificación local: no
 * hay servidor ni cuenta detrás. Si el permiso se deniega, no pasa nada — la
 * pantalla de inicio sigue mostrando la tarjeta ese día.
 */
export async function programarAvisoMedicion(diaSemana: number): Promise<boolean> {
  try {
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
