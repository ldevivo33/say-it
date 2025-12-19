import { db } from "../../_firebaseAdmin.js";
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
    const participantId = normalizeId(body.participantId);
    if (!participantId) {
      json(res, 400, { error: "participantId is required" });
      return;
    }

    const participantRef = db
      .collection("groups")
      .doc(groupId)
      .collection("participants")
      .doc(participantId);

    const snap = await participantRef.get();
    if (!snap.exists) {
      json(res, 200, { ok: true }); // already gone
      return;
    }

    await participantRef.delete();
    json(res, 200, { ok: true });
  } catch (error) {
    console.error("Leave group error", error);
    json(res, 500, { error: "Failed to leave group" });
  }
}
