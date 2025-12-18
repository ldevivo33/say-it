import { db, serverTimestamp } from "../../_firebaseAdmin.js";
import {
  allowMethods,
  json,
  normalizeGroupId,
  normalizeId,
  parseJson,
} from "../../_utils.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  const groupId = normalizeGroupId(req.query?.groupId || req.url.split("/")[3]);
  if (!groupId) {
    json(res, 400, { error: "Missing groupId" });
    return;
  }

  try {
    const body = await parseJson(req);
    const username = normalizeId(body.username);
    const providedParticipantId = normalizeId(body.participantId);
    if (!username) {
      json(res, 400, { error: "Username is required" });
      return;
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      json(res, 404, { error: "Group not found" });
      return;
    }

    const participantId =
      providedParticipantId && providedParticipantId.length > 5
        ? providedParticipantId
        : crypto.randomUUID();

    const participantRef = groupRef.collection("participants").doc(participantId);
    await participantRef.set(
      {
        participantId,
        groupId,
        username,
        joinedAt: serverTimestamp(),
      },
      { merge: true }
    );

    json(res, 200, { participantId, username, groupId });
  } catch (error) {
    console.error("Join group error", error);
    json(res, 500, { error: "Failed to join group" });
  }
}
