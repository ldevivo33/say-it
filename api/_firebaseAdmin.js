import admin from "firebase-admin";

if (!admin.apps.length) {
  const creds = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

export const db = admin.firestore();
