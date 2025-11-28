import React, { useState, useRef } from "react";
import io from "socket.io-client";
import { checkSession } from "../api/api";
import { generateECDHKeyPair, deriveAESKey, decryptChunk } from "../utils/crypto";
import { createPeerConnection } from "../utils/webrtc";


export default function Receiver() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [receivedFileName, setReceivedFileName] = useState("");
  const [receivedFileSize, setReceivedFileSize] = useState(0);

  const socketRef = useRef();
  const pcRef = useRef(null);
  const pcReadyRef = useRef(false);

  const keyPairRef = useRef();
  const aesKeyRef = useRef(null);

  const receivedChunks = useRef([]);
  const chunkQueue = useRef([]);
  const iceQueue = useRef([]);
  const fileMetaRef = useRef(null);
  const chunksReceivedRef = useRef(0);

  async function join() {
    if (!code.trim()) {
      setError("Please enter a session code");
      return;
    }

    try {
      setStatus("waiting");
      setError("");

      const response = await checkSession(code);
      if (!response.data.ok) {
        setError("Invalid code!");
        setStatus("error");
        return;
      }

      console.log("Session OK!");

      socketRef.current = io("http://localhost:5000");
      socketRef.current.emit("join-session", { code, role: "receiver" });

      socketRef.current.on("session-ready", (fileMeta) => {
        console.log("File metadata:", fileMeta);
        fileMetaRef.current = fileMeta;
        setReceivedFileName(fileMeta?.fileName || "unknown");
        setReceivedFileSize(fileMeta?.size || 0);

        console.log("Both peers joined → generating ECDH");
        generateAndSendPublicKey();
      });

      socketRef.current.on("public-key", async (remotePublicKey) => {
        console.log("Received sender public key");

        aesKeyRef.current = await deriveAESKey(
          keyPairRef.current.privateKey,
          remotePublicKey
        );

        console.log("AES KEY READY!");

        for (let msg of chunkQueue.current) {
          await processEncryptedChunk(msg);
        }
        chunkQueue.current = [];
      });

      socketRef.current.on("signal", async (data) => {
        if (data.type === "offer") {
          console.log("Received WebRTC offer");

          const waitAES = setInterval(() => {
            if (aesKeyRef.current) {
              clearInterval(waitAES);

              console.log("Setting up WebRTC…");
              setupPeerConnection(code, data.sdp);
            }
          }, 30);
        }

        if (data.type === "ice") {
          if (!pcReadyRef.current || !pcRef.current) {
            console.warn("ICE arrived before pc ready → queued");
            iceQueue.current.push(data.candidate);
          } else {
            pcRef.current.addIceCandidate(data.candidate).catch(console.error);
          }
        }
      });

      socketRef.current.on("error", (err) => {
        setError(err.message || "Socket error");
        setStatus("error");
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "Error joining session");
      setStatus("error");
    }
  }

  async function generateAndSendPublicKey() {
    const { keyPair, publicJwk } = await generateECDHKeyPair();
    keyPairRef.current = keyPair;

    socketRef.current.emit("public-key", publicJwk);
    console.log("Receiver public key sent");
  }

  function setupPeerConnection(sessionCode, offer) {
    pcRef.current = createPeerConnection(
      onMessage,
      ({ type, candidate }) => {
        if (type === "ice") {
          socketRef.current.emit("signal", {
            code: sessionCode,
            payload: { type: "ice", candidate },
          });
        }
      }
    );

    pcReadyRef.current = true;
    setStatus("connected");

    pcRef.current.setRemoteDescription(
      new RTCSessionDescription(offer)
    );

    if (iceQueue.current.length > 0) {
      console.log("Applying queued ICE candidates…");
      iceQueue.current.forEach((c) =>
        pcRef.current.addIceCandidate(c).catch(console.error)
      );
      iceQueue.current = [];
    }

    pcRef.current.createAnswer().then((ans) => {
      pcRef.current.setLocalDescription(ans);
      socketRef.current.emit("signal", {
        code: sessionCode,
        payload: { type: "answer", sdp: ans },
      });
    });

    setStatus("receiving");
  }

  async function onMessage(event) {
    try {
      const msg = JSON.parse(event.data);

      if (msg.done) {
        console.log("File transfer completed. Preparing download…");

        const blob = new Blob(receivedChunks.current, {
          type: fileMetaRef.current?.type || "application/octet-stream",
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileMetaRef.current?.fileName || "downloaded-file";
        a.click();

        receivedChunks.current = [];
        setProgress(100);
        setStatus("completed");
        return;
      }

      if (!aesKeyRef.current) {
        console.warn("AES key not ready → queueing chunk");
        chunkQueue.current.push(msg);
        return;
      }

      await processEncryptedChunk(msg);
    } catch (err) {
      console.error("Message parse error:", err);
    }
  }

  async function processEncryptedChunk({ iv, cipher }) {
    try {
      const decrypted = await decryptChunk(aesKeyRef.current, iv, cipher);
      receivedChunks.current.push(decrypted);
      chunksReceivedRef.current++;

      const totalBytesReceived = receivedChunks.current.reduce(
        (sum, chunk) => sum + chunk.byteLength,
        0
      );
      const progressPercent = Math.round(
        (totalBytesReceived / receivedFileSize) * 100
      );
      setProgress(Math.min(100, progressPercent));

      console.log(`Received chunk ${chunksReceivedRef.current} - ${progressPercent}%`);
    } catch (err) {
      console.error("Decrypt failed:", err);
      setError(`Decryption error: ${err.message}`);
      setStatus("error");
    }
  }

  const handleCancel = () => {
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setStatus("idle");
    setCode("");
    setProgress(0);
    setError("");
    receivedChunks.current = [];
    chunkQueue.current = [];
    iceQueue.current = [];
  };

  return (
    <div className="receiver-container">
      <h2>📥 File Receiver (WebRTC + E2E Encryption)</h2>

      {error && <div className="receiver-error">{error}</div>}

      <div className="receiver-section">
        <label>Session Code:</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter 6-digit code"
          disabled={status !== "idle"}
          className="receiver-input"
        />
      </div>

      <div className="receiver-button-group">
        <button
          onClick={join}
          disabled={!code.trim() || status !== "idle"}
          className="receiver-button receiver-button-primary"
        >
          {status === "waiting" ? "Joining..." : "Join Session"}
        </button>
        {status !== "idle" && (
          <button
            onClick={handleCancel}
            className="receiver-button receiver-button-danger"
          >
            Cancel
          </button>
        )}
      </div>

      {status === "receiving" && (
        <div className="receiver-section">
          <div className="receiver-info-box">
            <p>
              <strong>File:</strong> {receivedFileName}
            </p>
            <p>
              <strong>Size:</strong> {(receivedFileSize / 1024 / 1024).toFixed(2)}{" "}
              MB
            </p>
          </div>

          <div className="receiver-progress-label">Progress: {progress}%</div>
          <div className="receiver-progress-bar">
            <div
              className="receiver-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "completed" && (
        <div className="receiver-success">
          ✅ File received and decrypted successfully! Download started.
        </div>
      )}

      <div className="receiver-status-info">
        <p>
          <strong>Status:</strong> {status}
        </p>
        {code && <p>
          <strong>Session Code:</strong> {code}
        </p>}
      </div>
    </div>
  );
}
