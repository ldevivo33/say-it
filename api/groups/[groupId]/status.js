import { db } from "../../_firebaseAdmin.js";
import { allowMethods, json, normalizeGroupId, normalizeId } from "../../_utils.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  const url = new URL(req.url, "http://localhost");
  const groupId = normalizeGroupId(req.query?.groupId || req.url.split("/")[3]);
  const date = normalizeId(req.query?.date || url.searchParams.get("date"));

  if (!groupId) {
    json(res, 400, { error: "Missing groupId" });
    return;
  }
  if (!date) {
    json(res, 400, { error: "Missing date" });
    return;
  }

  try {
    const groupRef = db.collection("groups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
      json(res, 404, { error: "Group not found" });
      return;
    }

    const [participantsSnap, submissionsSnap] = await Promise.all([
      groupRef.collection("participants").orderBy("joinedAt", "asc").get(),
      groupRef.collection("submissions").where("date", "==", date).get(),
    ]);

    const participants = participantsSnap.docs.map((doc) => doc.data());
    const submissions = submissionsSnap.docs.map((doc) => doc.data());

    json(res, 200, {
      groupId,
      date,
      participants,
      submissions,
    });
  } catch (error) {
    console.error("Status error", error);
    json(res, 500, { error: "Failed to load status" });
  }
}
