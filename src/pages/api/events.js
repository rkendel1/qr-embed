import { sessions } from "./session/sessions";

export default function handler(req, res) {
  const { token } = req.query;
  const session = sessions.get(token);

  if (!session) {
    res.status(404).end();
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const interval = setInterval(() => {
    const currentSession = sessions.get(token);
    console.log(`Poll for token ${token}: state ${currentSession ? currentSession.state : 'no session'}`);
    res.write(`data: ${JSON.stringify({ state: currentSession ? currentSession.state : 'unknown' })}\n\n`);
    res.flush();
  }, 1000);

  req.on("close", () => clearInterval(interval));
}
