import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { context } = req.body;
  if (!context) {
    return res.status(400).json({ error: "Context is required" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set in environment variables.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // This token doesn't create a session yet. It's a template token.
  const templateToken = jwt.sign({ context }, jwtSecret, { expiresIn: '365d' });

  res.status(201).json({ templateToken });
}