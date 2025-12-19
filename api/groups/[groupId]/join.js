import { db, serverTimestamp } from "../../_firebaseAdmin.js";
import {
  allowMethods,
  json,
  normalizeGroupId,
  normalizeId,
  normalizePhone,
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
    const phone = normalizePhone(body.phone);
    const smsOptIn = body.smsOptIn !== false; // default true when phone provided
    if (!username) {
      json(res, 400, { error: "Username is required" });
      return;
    }
    if (!phone) {
      json(res, 400, { error: "Phone is required" });
      return;
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      json(res, 404, { error: "Group not found" });
      return;
    }

    let participantId =
      providedParticipantId && providedParticipantId.length > 5
        ? providedParticipantId
        : crypto.randomUUID();

    // If phone already exists in this group, reuse that participant to enforce idempotency.
    const phoneSnap = await groupRef
      .collection("participants")
      .where("phone", "==", phone)
      .limit(1)
      .get();
    if (!phoneSnap.empty) {
      participantId = phoneSnap.docs[0].id;
    }

    const participantRef = groupRef.collection("participants").doc(participantId);
    const existing = await participantRef.get();

    const participantData = {
      participantId,
      groupId,
      username,
      phone,
      smsOptIn,
    };

    if (!existing.exists) {
      participantData.joinedAt = serverTimestamp();
    }

    await participantRef.set(participantData, { merge: true });

    json(res, 200, { participantId, username, groupId });
  } catch (error) {
    console.error("Join group error", error);
    json(res, 500, { error: "Failed to join group" });
  }
}
