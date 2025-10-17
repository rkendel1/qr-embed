import { sessions } from "./sessions.js";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { token } = req.body;

  const session = sessions.get(token);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.state = "verified";
  sessions.set(token, session);
  res.status(200).json({ status: "ok" });
}
