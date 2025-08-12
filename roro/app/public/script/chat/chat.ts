import ChatClient from "./ChatClient.js";

function initChat() {
  const chatClient = new ChatClient();
  if (!chatClient) console.error("Failed to initialize chatClient.");
}

document.addEventListener("DOMContentLoaded", initChat);

