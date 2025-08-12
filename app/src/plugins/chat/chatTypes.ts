export interface Message {
    isSent?: boolean;
    senderId: number;
    content: string;
    senderUsername?: string;
    targetId?: string;
    clientOffset?: string;
    serverOffset?: number;
    sentAt?: Date;
    convId?: number;
}

export interface BlockedUser {
    targetId: number;
    block: boolean;
}