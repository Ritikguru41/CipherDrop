// utils/sessions.js

const sessions = new Map();

export function createSession(fileMeta) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  sessions.set(code, {
    senderSocket: null,
    receiverSocket: null,
    fileMeta
  });

  return code;
}

export function getSession(code) {
  return sessions.get(code);
}

export function deleteSession(code) {
  sessions.delete(code);
}