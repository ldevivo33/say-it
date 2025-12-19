import { db, serverTimestamp } from "../../_firebaseAdmin.js";
import {
  allowMethods,
  json,
  normalizeGroupId,
  normalizeId,
  normalizePhone,
  parseJson,
} from "../../_utils.js";
import { sendSms } from "../../_twilio.js";
import { getWordOfTheDay } from "../../../src/wordOfDay.js";

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

    // Check for existing participant in this group by phone (idempotent).
    const phoneSnap = await groupRef
      .collection("participants")
      .where("phone", "==", phone)
      .limit(1)
      .get();
    if (!phoneSnap.empty) {
      participantId = phoneSnap.docs[0].id;
    }

    // Optional: detect if this phone belongs to another group; fail with conflict.
    try {
      const existingPhoneSnap = await db
        .collectionGroup("participants")
        .where("phone", "==", phone)
        .limit(1)
        .get();
      if (!existingPhoneSnap.empty) {
        const doc = existingPhoneSnap.docs[0];
        const existingData = doc.data();
        const existingGroupId = doc.ref.parent.parent.id;
        if (existingGroupId !== groupId) {
          json(res, 409, {
            error: "This phone is already linked to another group.",
            groupId: existingGroupId,
            participantId: existingData.participantId,
            username: existingData.username,
          });
          return;
        }
        participantId = doc.id; // same group reuse
      }
    } catch (err) {
      // If collectionGroup is unavailable (indexes/permissions), continue with group-level check only.
      console.warn("collectionGroup phone lookup skipped", err?.message || err);
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

    // Welcome SMS (fire-and-forget). Uses today's word in EST.
    const appLink = process.env.APP_URL || "";
    const { word } = getWordOfTheDay();
    const message = `Welcome ${username}. Be the first to use ${word} in a sentence. ${appLink}`.trim();
    if (phone) {
      sendSms(phone, message);
    }

    json(res, 200, { participantId, username, groupId });
  } catch (error) {
    console.error("Join group error", error);
    json(res, 500, { error: "Failed to join group" });
  }
}
