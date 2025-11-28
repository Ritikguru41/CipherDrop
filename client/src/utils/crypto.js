export async function generateECDHKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { keyPair, publicJwk };
}

export async function importPublicKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function deriveAESKey(privateKey, remotePubKeyJwk) {
  const remoteKey = await importPublicKey(remotePubKeyJwk);

  return crypto.subtle.deriveKey(
    { name: "ECDH", public: remoteKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function uint8ArrayToBase64(arr) {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(str) {
  const binary = atob(str);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

const CHUNK_SIZE = 32 * 1024;

export async function encryptChunk(aesKey, fileBuffer) {
  const chunks = [];
  
  for (let i = 0; i < fileBuffer.byteLength; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, fileBuffer.byteLength);
    const chunk = fileBuffer.slice(i, end);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      chunk
    );
    
    chunks.push({
      iv: uint8ArrayToBase64(iv),
      cipher: uint8ArrayToBase64(new Uint8Array(encrypted)),
    });
  }
  
  return chunks;
}

export async function decryptChunk(aesKey, ivBase64, cipherBase64) {
  const iv = base64ToUint8Array(ivBase64);
  const cipherArray = base64ToUint8Array(cipherBase64);
  
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    cipherArray
  );
  
  return new Uint8Array(plain);
}
