import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import express from "express";
import { createSession, getSession, deleteSession } from "./utils/sessions.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.post("/create-session", (req, res) => {
  const { fileName, size, type } = req.body;
  const fileMeta = { fileName, size, type };
  const code = createSession(fileMeta);
  return res.json({ code, fileMeta });
});

app.post("/check-session", (req, res) => {
  const { code } = req.body;
  const s = getSession(code);
  if (!s) return res.status(404).json({ ok: false });
  return res.json({ ok: true, fileMeta: s.fileMeta });
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on("join-session", ({ code, role }) => {
    const s = getSession(code);
    if (!s) {
      socket.emit("session-not-found");
      return;
    }
    socket.join(code);

    if (role === "sender") s.senderSocket = socket.id;
    if (role === "receiver") s.receiverSocket = socket.id;

    io.to(code).emit("session-ready", s.fileMeta);
  });

  // Relay WebRTC signals (offer/answer/ice)
  socket.on("signal", ({ code, payload }) => {
    socket.to(code).emit("signal", payload);
  });

  // Relay AES ECDH public keys (fixed)
  socket.on("public-key", (publicKey) => {
    const rooms = [...socket.rooms];
    const code = rooms.find((r) => r !== socket.id);
    if (code) {
      socket.to(code).emit("public-key", publicKey);
    }
  });

  socket.on("cleanup-session", ({ code }) => {
    deleteSession(code);
  });
});

server.listen(5000, () => console.log(`Server running on 5000`));
