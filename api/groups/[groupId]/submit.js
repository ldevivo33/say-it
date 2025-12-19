import { db, serverTimestamp } from "../../_firebaseAdmin.js";
import {
  allowMethods,
  json,
  normalizeGroupId,
  normalizeId,
  parseJson,
} from "../../_utils.js";
import { sendSms } from "../../_twilio.js";

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
    const sentence = (body.sentence || "").trim();
    const date = normalizeId(body.date);
    if (!participantId || !sentence || !date) {
      json(res, 400, { error: "participantId, sentence, and date are required" });
      return;
    }

    const groupRef = db.collection("groups").doc(groupId);
    const participantRef = groupRef.collection("participants").doc(participantId);
    const participantSnap = await participantRef.get();
    if (!participantSnap.exists) {
      json(res, 404, { error: "Participant not found in this group" });
      return;
    }

    const submissionId = `${participantId}_${date}`;
    const submissionRef = groupRef.collection("submissions").doc(submissionId);

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(submissionRef);
      if (existing.exists) {
        throw new Error("ALREADY_SUBMITTED");
      }
      tx.set(submissionRef, {
        submissionId,
        groupId,
        participantId,
        date,
        sentence,
        reactions: {},
        submittedAt: serverTimestamp(),
      });
    });

    // SMS notifications for every submission to all opted-in participants except submitter.
    const participantsSnap = await groupRef
      .collection("participants")
      .where("smsOptIn", "==", true)
      .get();
    const recipients = participantsSnap.docs
      .map((doc) => doc.data())
      .filter((p) => p.phone && p.participantId !== participantId);

    const message = "Someone in your SAY IT group just used today’s word 👀";
    const sendResults = await Promise.all(recipients.map((p) => sendSms(p.phone, message)));
    sendResults.forEach((r) => {
      if (!r?.ok) {
        console.warn("Submission SMS not sent", r);
      }
    });

    json(res, 200, { submissionId });
  } catch (error) {
    if (error.message === "ALREADY_SUBMITTED") {
      json(res, 409, { error: "You already submitted today" });
      return;
    }
    console.error("Submit error", error);
    json(res, 500, { error: "Failed to submit sentence" });
  }
}
