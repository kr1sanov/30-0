import { db } from "./db";
import { mergeWithinTransaction } from "./adminPlayerMerge.ts";
export { markManualCard, syncOpenSlots } from "./adminPlayerMerge.ts";
export async function mergePlayerIdentities(
  targetId: string,
  sourceId: string,
  actor: string,
) {
  return db.$transaction(
    (tx) => mergeWithinTransaction(tx, targetId, sourceId, actor),
    { timeout: 30000, isolationLevel: "Serializable" },
  );
}
