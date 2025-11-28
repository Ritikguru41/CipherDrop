export function createPeerConnection(onData, onState) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onState({ type: "ice", candidate: event.candidate });
    }
  };

  pc.ondatachannel = (event) => {
    const channel = event.channel;
    channel.onmessage = onData;
  };

  pc.onconnectionstatechange = () => {
    onState({ type: "state", state: pc.connectionState });
  };

  return pc;
}
