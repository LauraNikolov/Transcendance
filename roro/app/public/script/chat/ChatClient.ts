import { Message } from "./chatTypes.js";
import ChatUI from "./ChatUI.js";
import UserManager from "./UserManager.js";
import OptionHandler from "./OptionHandler.js";
import BubbleHandler from "./BubbleHandler.js";

declare const io: any;

export default class ChatClient {
  private socket: any;
  private counter = 0;
  private chatUI: ChatUI;
  private userManager: UserManager;
  private OptionHandler: OptionHandler;
  private bubbleHandler: BubbleHandler

  constructor() {
    this.socket = io("http://localhost:8080/chat", {
      withCredentials: true,
      transports: ['websocket'],
      auth: {
        serverOffset: 0,
        username: "",
      },
      ackTimeout: 10000,
      retries: 3,
    });
    this.chatUI = new ChatUI(this);
    this.userManager = new UserManager(this);
    this.OptionHandler = new OptionHandler(this);
    this.bubbleHandler = new BubbleHandler();
    this.initSocketListeners();
  }
  
  getSocket() {
    return (this.socket);
  }

  getChatUI() {
    return (this.chatUI);
  }

  getUserManager() {
    return (this.userManager);
  }

  getOptionHandler() {
    return (this.OptionHandler);
  }

  getBubbleHandler() {
    return (this.bubbleHandler);
  }
  
   setInputListeners() {
    this.chatUI.initInputListeners();
  }

  private initSocketListeners() {
    this.socket.on("message", async ({ targetId, senderId, senderUsername, content, serverOffset, isSent } :
      { targetId: string; senderId: string, senderUsername: string, content: string, serverOffset: number, isSent: boolean }) => {
        try {
          const otherUsername = this.userManager.getTargetUsername(targetId!, senderUsername, isSent);
          if (!otherUsername) {
            console.error("Invalid user ID or username received in message event.");
            return;
          }
          this.socket.auth.serverOffset = serverOffset;
          if (isSent) this.userManager.updateConvPreview(targetId, otherUsername); 
          else this.userManager.updateConvPreview(senderId, otherUsername);
          const message: Message = {
            content: content,
            targetId: targetId,
            senderId: senderId,
            senderUsername: senderUsername,
            isSent: isSent,
            sentAt: (new Date()).toISOString().slice(0,21)
          }
          await this.bubbleHandler.addChatBubble(isSent, message, this.userManager.getTargetId()!);
        } catch (e) {
          console.error("Error processing message received from server:", e);
        }
    });

    // Get conversation history
    this.socket.on("allConversations", (conversations: any[], convInfo: Record<number, string>) => {
        this.userManager.loadConversations(conversations, convInfo);
      });
  }

  // Send message
  sendMessage(msg: string) {
    const clientOffset = `${Date.now()}-${this.counter++}`; 
    const targetId = this.userManager.getTargetId();
    const convId = this.userManager.getConvId();
    this.socket.emit("message", { targetId: targetId, content: msg, clientOffset: clientOffset, convId: convId }, 
      (response: { status: string; serverOffset?: number }) => {
        if (!response) {
          // console.error("No response received from server.");
          return;
        }
        if (response.serverOffset) this.socket.auth.serverOffset = response.serverOffset;
        console.log("Acknowledged by server:", response); // ! DEBUG
    });
  }
}