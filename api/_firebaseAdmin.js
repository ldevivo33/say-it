import admin from "firebase-admin";

function loadCredentials() {
  const raw = process.env.FIREBASE_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_CREDENTIALS_JSON is missing. Provide the full service account JSON string."
    );
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("FIREBASE_CREDENTIALS_JSON could not be parsed as JSON.");
  }
}

if (!admin.apps.length) {
  const creds = loadCredentials();

  admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

export const db = admin.firestore();
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
