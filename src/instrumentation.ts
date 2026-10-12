export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const timer = setInterval(() => {
    void import('@/lib/socialNotifications').then(({ flushSocialNotifications }) => flushSocialNotifications()).catch(() => console.error('Social notification flush failed'));
    void import('@/lib/notificationScheduler').then(({ runNotificationSchedule }) => runNotificationSchedule()).catch(error => console.error('Notification scheduler failed:', error));
  }, 60_000);
  timer.unref?.();
}
