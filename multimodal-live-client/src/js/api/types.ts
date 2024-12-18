// This file defines the types used in the API communication, including message formats and data structures.

export const MessageType = {
    SETUP: 'setup',
    CLIENT_CONTENT: 'clientContent',
    REALTIME_INPUT: 'realtimeInput',
    TOOL_RESPONSE: 'toolResponse',
    SETUP_COMPLETE: 'setupComplete',
    SERVER_CONTENT: 'serverContent',
};

export type LiveConfig = {
    model: string;
    systemInstruction?: { parts: Array<{ text: string }> };
    generationConfig?: Partial<{
        responseModalities: 'text' | 'audio' | 'image';
        speechConfig?: object;
    }>;
    tools?: Array<{ googleSearch?: {}; codeExecution?: {} }>;
};

export type LiveMessage = {
    type: keyof typeof MessageType;
    payload: any;
};

export type StreamingLog = {
    date: Date;
    type: string;
    message: string | LiveMessage;
};