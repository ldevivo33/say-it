import { db, serverTimestamp } from "./_firebaseAdmin.js";
import { allowMethods, generateGroupId, json } from "./_utils.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;

  try {
    const groupId = generateGroupId();
    await db.collection("groups").doc(groupId).set({
      groupId,
      createdAt: serverTimestamp(),
    });
    json(res, 200, { groupId });
  } catch (error) {
    console.error("Create group error", error);
    json(res, 500, { error: "Failed to create group" });
  }
}
