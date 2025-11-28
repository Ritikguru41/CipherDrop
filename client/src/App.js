import React, { useState } from "react";
import Sender from "./components/Sender";
import Receiver from "./components/Receiver";

export default function App() {
  const [mode, setMode] = useState("sender");

  return (
    <div className="container">
      <h1>CipherDrop</h1>

      <div className="switcher">
        <button onClick={() => setMode("sender")}>Sender</button>
        <button onClick={() => setMode("receiver")}>Receiver</button>
      </div>

      {mode === "sender" ? <Sender /> : <Receiver />}
    </div>
  );
}
