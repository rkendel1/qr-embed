import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

import { sessions } from "./sessions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { fingerprint } = req.body;
  const token = uuidv4();
  const qrUrl = `${req.headers.origin}/session/${token}`;

  sessions.set(token, {
    token,
    fingerprint,
    state: "init",
    context: "marketing",
    qrUrl,
  });

  // Generate QR (base64)
  const qrDataUrl = await QRCode.toDataURL(qrUrl);

  res.status(200).json({ token, qrUrl, qrDataUrl });
}
