/**
 * Twilio SMS service — sends booking notifications, review requests, reminders.
 */
let twilio: any = null;

export function getTwilio() {
  if (twilio) return twilio;
  const t = require('twilio');
  twilio = t(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return twilio;
}

export async function sendSMS(to: string, message: string) {
  if (!process.env.TWILIO_ACCOUNT_SID) return { ok: false, reason: 'not_configured' };
  try {
    const client = getTwilio();
    const result = await client.messages.create({
      body: message,
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    return { ok: true, sid: result.sid };
  } catch (err: any) {
    console.error('SMS failed:', err);
    return { ok: false, error: err.message };
  }
}
