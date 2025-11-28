import axios from "axios";

// Create a reusable axios instance
const API = axios.create({
  baseURL: "http://localhost:5000", // Backend URL
});

// --- API FUNCTIONS ---

// Create a new file-sharing session (sender)
export const createSession = (fileMeta) =>
  API.post("/create-session", fileMeta);

// Check if a session code exists (receiver)
export const checkSession = (code) =>
  API.post("/check-session", { code });

export default API;
