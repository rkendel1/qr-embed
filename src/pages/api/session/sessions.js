import fs from 'fs';
import path from 'path';

const SESSIONS_FILE = path.join(process.cwd(), 'sessions.json');

function loadSessions() {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return new Map();
  }
  const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
  return new Map(JSON.parse(data));
}

function saveSessions(sessions) {
  const data = JSON.stringify([...sessions], null, 2);
  fs.writeFileSync(SESSIONS_FILE, data);
}

const sessions = {
  get(token) {
    const map = loadSessions();
    return map.get(token);
  },
  set(token, data) {
    const map = loadSessions();
    map.set(token, data);
    saveSessions(map);
  }
};

export { sessions };