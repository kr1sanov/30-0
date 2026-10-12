import { table, integer, text } from "sdk/db";
export const botPreferences = table("bot_preferences", {
  tgId: integer("tg_id").primaryKey(),
  userJson: text("user_json").notNull().default("{}"),
  prefsJson: text("prefs_json")
    .notNull()
    .default(
      '{"enabled":true,"news":false,"invitations":true,"results":true,"friends":true,"friend_updates":true}',
    ),
  revision: integer("revision").notNull().default(1),
  syncedRevision: integer("synced_revision").notNull().default(0),
  started: integer("started").notNull().default(0),
});
