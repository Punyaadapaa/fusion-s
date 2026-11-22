import { SessionData } from "./session.types";

export interface BaseMessage {
  action: string;
}

export interface GetCurrentSessionMessage extends BaseMessage {
  action: "getCurrentSession";
  domain: string;
  tabId: number;
}

export interface SwitchSessionMessage extends BaseMessage {
  action: "switchSession";
  sessionData: SessionData;
  tabId: number;
}

export interface ClearSessionMessage extends BaseMessage {
  action: "clearSession";
  domain: string;
  tabId: number;
}

export interface SetTTLSettingsMessage extends BaseMessage {
  action: "setTTLSettings";
  settings: SessionTTL;
}

export interface UnlockEncryptionMessage extends BaseMessage {
  action: "unlockEncryption";
  password: string;
}

export interface LockEncryptionMessage extends BaseMessage {
  action: "lockEncryption";
}

export interface SetEncryptionSettingsMessage extends BaseMessage {
  action: "setEncryptionSettings";
  settings: EncryptionSettings;
}

export interface GetEncryptionSettingsMessage extends BaseMessage {
  action: "getEncryptionSettings";
}

export type MessageType = GetCurrentSessionMessage | SwitchSessionMessage | ClearSessionMessage | SetTTLSettingsMessage | UnlockEncryptionMessage | LockEncryptionMessage | SetEncryptionSettingsMessage | GetEncryptionSettingsMessage;

export interface MessageResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export type SendResponseType<T = unknown> = (response: MessageResponse<T>) => void;
