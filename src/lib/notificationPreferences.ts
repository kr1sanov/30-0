export const NOTIFICATION_CATEGORIES = {
  news: {
    title: "Новости проекта",
    description: "Новости, обновления и информационные рассылки.",
  },
  invitations: {
    title: "Приглашения в игры",
    description: "Друг приглашает тебя в мультиплеер.",
  },
  results: {
    title: "Результаты игр",
    description: "Итоги сезона с картинкой, результатом и ссылкой.",
  },
  friends: { title: "Заявки в друзья", description: "Новые входящие заявки." },
  friend_updates: {
    title: "Ответы на заявки",
    description: "Игрок принял твою заявку.",
  },
} as const;
export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;
export type NotificationPreferences = { enabled: boolean } & Record<
  NotificationCategory,
  boolean
>;
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  news: false,
  invitations: true,
  results: true,
  friends: true,
  friend_updates: true,
};
export function validPreferencePatch(
  value: unknown,
): value is Partial<NotificationPreferences> {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length &&
    Object.entries(value).every(
      ([key, val]) =>
        Object.hasOwn(DEFAULT_NOTIFICATION_PREFERENCES, key) &&
        typeof val === "boolean",
    ),
  );
}
export function preferencesFromUser(user: {
  telegramNotificationsEnabled: boolean;
  notifyNews?: boolean;
  notifyInvites?: boolean;
  notifyResults?: boolean;
  notifyFriends?: boolean;
  notifyFriendReplies?: boolean;
}): NotificationPreferences {
  return {
    enabled: user.telegramNotificationsEnabled,
    news: user.notifyNews ?? false,
    invitations: user.notifyInvites ?? true,
    results: user.notifyResults ?? true,
    friends: user.notifyFriends ?? true,
    friend_updates: user.notifyFriendReplies ?? true,
  };
}
export function preferenceData(prefs: NotificationPreferences) {
  return {
    telegramNotificationsEnabled: prefs.enabled,
    notifyNews: prefs.news,
    notifyInvites: prefs.invitations,
    notifyResults: prefs.results,
    notifyFriends: prefs.friends,
    notifyFriendReplies: prefs.friend_updates,
  };
}
export function notificationAllowed(
  prefs: NotificationPreferences,
  category: NotificationCategory,
) {
  return prefs.enabled && prefs[category];
}
