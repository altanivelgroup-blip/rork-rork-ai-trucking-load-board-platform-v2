import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const setAdminRole = onCall(async (request) => {
  const callerEmail = request.auth?.token?.email;
  const allowed = ["altanivelgroup@gmail.com"]; // add any additional owner emails

  if (!callerEmail || !allowed.includes(callerEmail)) {
    throw new HttpsError("permission-denied", "Only the owner can assign admin.");
  }

  const { uid, email } = (request.data || {}) as { uid?: string; email?: string };
  if (!uid && !email) {
    throw new HttpsError("invalid-argument", "Provide { uid } or { email }.");
  }

  const targetUid = uid ?? (await admin.auth().getUserByEmail(email!)).uid;
  await admin.auth().setCustomUserClaims(targetUid, { admin: true, role: "admin" });
  return { ok: true, uid: targetUid };
});