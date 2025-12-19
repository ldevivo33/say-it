import { db } from "../../_firebaseAdmin.js";
import {
  allowMethods,
  json,
  normalizeGroupId,
  normalizeId,
  parseJson,
} from "../../_utils.js";

// Toggle reactions on a submission. Stores participantIds under each emoji key.
export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const groupId = normalizeGroupId(req.query?.groupId || req.url.split("/")[3]);
  if (!groupId) {
    json(res, 400, { error: "Missing groupId" });
    return;
  }

  try {
    const body = await parseJson(req);
    const submissionId = normalizeId(body.submissionId);
    const participantId = normalizeId(body.participantId);
    const emoji = normalizeId(body.emoji);

    if (!submissionId || !participantId || !emoji) {
      json(res, 400, { error: "submissionId, participantId, and emoji are required" });
      return;
    }

    const submissionRef = db
      .collection("groups")
      .doc(groupId)
      .collection("submissions")
      .doc(submissionId);

    let updatedReactions = {};

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(submissionRef);
      if (!snap.exists) {
        throw new Error("NOT_FOUND");
      }
      const data = snap.data() || {};
      const reactions = { ...(data.reactions || {}) };
      const current = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
      const hasReacted = current.includes(participantId);

      const next = hasReacted
        ? current.filter((id) => id !== participantId)
        : [...current, participantId];

      if (next.length > 0) {
        reactions[emoji] = next;
      } else {
        delete reactions[emoji];
      }

      updatedReactions = reactions;
      tx.update(submissionRef, { reactions });
    });

    json(res, 200, { reactions: updatedReactions });
  } catch (error) {
    if (error.message === "NOT_FOUND") {
      json(res, 404, { error: "Submission not found" });
      return;
    }
    console.error("React error", error);
    json(res, 500, { error: "Failed to toggle reaction" });
  }
}
