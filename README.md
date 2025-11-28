# CipherDrop
Secure File Transfer System
Here’s a README template you can adapt:

CipherDrop – P2P Encrypted File Sharing
CipherDrop is a peer‑to‑peer file sharing app built with React, Node.js, Socket.IO, WebRTC and Web Crypto API. Files are sent directly between peers using WebRTC DataChannels with ECDH key exchange and AES‑256‑GCM encryption.

Features
Peer‑to‑peer file transfer using WebRTC DataChannels.

End‑to‑end encryption with ECDH (P‑256) + AES‑256‑GCM.

Simple session‑code based pairing (Sender / Receiver).

Progress display and basic error handling.

No file upload to server (server only coordinates signaling).

Tech Stack
Frontend: React, JavaScript, WebRTC, Web Crypto API.

Backend: Node.js, Express, Socket.IO.

Protocols:

WebRTC for P2P connection.

Socket.IO for signaling.

ECDH for key agreement.

AES‑GCM 256‑bit for encryption.

Project Structure
Adjust paths if your repo differs.

/client

/src

/components

Sender.jsx

Receiver.jsx

/utils

crypto.js (ECDH + AES‑GCM helpers)

webrtc.js (createPeerConnection helper)

/api

api.js (createSession, checkSession)

index.js / App.jsx

styles.css (global + sender/receiver classes)

package.json (React app)

/server

server.js (Express + Socket.IO + signaling)

/utils

sessions.js (in‑memory session store)

package.json (backend)

README.md

.gitignore

Prerequisites
Node.js (LTS recommended).

npm or yarn.

Modern browser with WebRTC + Web Crypto support (Chrome, Edge, Firefox, etc.).

Installation
Clone the repository

git clone https://github.com/your-username/cipherdrop.git

cd cipherdrop

Install backend dependencies

cd server

npm install

Typical dependencies (check your server/package.json):

express

socket.io

cors

Install frontend dependencies

cd ../client

npm install

Typical dependencies (check your client/package.json):

react, react-dom

socket.io-client

Configuration
Backend port

In server/server.js (example):

const PORT = 5000;

Make sure this matches the URL used in the frontend for Socket.IO:

io("http://localhost:5000");

API base URL

In client/src/api/api.js (example):

const API_BASE = "http://localhost:5000";

Ensure it matches your backend host/port.

WebRTC configuration

In client/src/utils/webrtc.js, createPeerConnection uses Google STUN:

iceServers: [{ urls: "stun:stun.l.google.com:19302" }]

You can add TURN servers here if you deploy behind NATs.

Running the App (Development)
Start the backend

From /server:

npm start
or

node server.js

Start the frontend

From /client:

npm start

React dev server typically runs at:

http://localhost:3000

Test flow

Open Sender in one browser window/tab.

Open Receiver in another window/device.

Sender:

Select a file.

Click “Generate Code”.

Share the generated session code.

Receiver:

Enter the session code.

Click “Join Session”.

Transfer starts; both sides see progress; Receiver auto‑downloads decrypted file.

How It Works (High Level)
Session creation

Sender calls createSession (REST) → backend generates a 6‑digit session code and stores file metadata in sessions.js.

Signaling

Both Sender and Receiver connect to Socket.IO and join the same session room:

"join-session" with { code, role }.

Backend emits "session-ready" when both peers joined.

Key exchange (ECDH)

Both peers generate ECDH key pairs (P‑256) using Web Crypto.

They exchange public keys via Socket.IO ("public-key").

Each side derives the same AES‑256‑GCM key using deriveKey.

WebRTC setup

Sender creates a WebRTC offer and a “file” DataChannel.

Offer/answer and ICE candidates are exchanged via Socket.IO ("signal").

Once the WebRTC connection is established, file DataChannel opens.

Encrypted file transfer

Sender reads the file as a stream.

Data is chunked (e.g., 32 KB), encrypted with AES‑GCM, and JSON‑encoded.

Encrypted chunks are sent over the DataChannel.

Receiver decrypts each chunk, accumulates them, tracks bytes received, and shows progress.

Download

When sender sends { done: true }, receiver assembles all decrypted Uint8Arrays into a Blob and triggers download with the original filename and MIME type.

Security Notes
Key agreement: ECDH on P‑256 (ephemeral keys per session).

Symmetric cipher: AES‑GCM with 256‑bit key.

IV: Fresh 12‑byte random IV per encrypted chunk.

The signaling server never sees plaintext file data or AES keys; it only carries public keys and WebRTC signaling messages.

Customization
Max file size:

You can enforce a max size in createSession or in the frontend before starting a session.

Chunk size:

In crypto.js, adjust CHUNK_SIZE (e.g., 32 * 1024 for 32 KB).

UI:

Tweak styles in styles.css (sender‑* and receiver‑* classes).

TURN servers:

Add TURN config in webrtc.js for production NAT traversal.

Scripts (Examples)
Frontend (client/package.json):

npm start → start React dev server

npm run build → build production bundle

Backend (server/package.json):

npm start → start Express/Socket.IO server

Troubleshooting
“Module not found: './Sender.css' / './Receiver.css'”

Remove those imports if you moved styles into global styles.css.

WebRTC connection never completes:

Check that:

Backend is running on http://localhost:5000

Frontend uses the same URL for Socket.IO.

No mixed HTTP/HTTPS issues.

Large files stall:

Reduce or adjust chunk size in crypto.js.

Add simple backpressure using dataChannel.bufferedAmount.

License
Add your chosen license here (e.g., MIT).

Credits
Built with React, Node.js, Socket.IO, WebRTC, and Web Crypto API.

Inspired by modern P2P file sharing tools.
Ritik Vishwakarma
Harsh Vaidya
Yuvraj Yadav
Yash Tulaskar

