import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

let client;
if (accountSid && authToken && fromNumber) {
  client = twilio(accountSid, authToken);
}

export async function sendSms(to, body) {
  if (!client || !fromNumber) {
    console.warn("Twilio not configured; skipping SMS send.");
    return { ok: false, skipped: true, reason: "not_configured" };
  }
  try {
    await client.messages.create({
      to,
      from: fromNumber,
      body,
    });
    return { ok: true };
  } catch (err) {
    console.error("Twilio send error", err);
    return { ok: false, error: err.message };
  }
}
