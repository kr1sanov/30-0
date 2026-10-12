// Telegram keeps initDataUnsafe.start_param while navigating inside one WebView.
// Consume implicit destinations once, while allowing a fresh explicit link to reopen them.
export function consumeMiniAppDestination(
  kind: "result" | "profile",
  id: string,
  storage: Pick<Storage, "getItem" | "setItem">,
  explicit = false,
) {
  const key = `30-0-${kind}-destination-consumed`;
  if (!explicit && storage.getItem(key) === id) return false;
  storage.setItem(key, id);
  return true;
}
