import admin from "firebase-admin";
import fs from "fs";

let app;

console.log("ENV CHECK", {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
});

function loadCredentials() {
  // Prefer explicit env
  const envCreds = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
  };

  // Allow raw JSON via env
  if (process.env.FIREBASE_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
      return parsed;
    } catch (err) {
      console.error("Failed to parse FIREBASE_CREDENTIALS_JSON", err);
    }
  }

  // Allow a file path to a service account JSON
  const filePath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (filePath && fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return parsed;
    } catch (err) {
      console.error("Failed to read FIREBASE_CREDENTIALS_PATH", err);
    }
  }

  // Fallback to individual env vars
  if (envCreds.project_id || envCreds.client_email || envCreds.private_key) {
    return envCreds;
  }

  return null;
}

const creds = loadCredentials();
const projectId = creds?.project_id;
const clientEmail = creds?.client_email;
const privateKey = creds?.private_key
  ? creds.private_key.replace(/\\n/g, "\n")
  : undefined;

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or use FIREBASE_CREDENTIALS_JSON/FIREBASE_CREDENTIALS_PATH."
  );
}

if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = admin.app();
}

export const db = admin.firestore(app);
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
