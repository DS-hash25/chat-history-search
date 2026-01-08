export type Service = 'claude' | 'chatgpt';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Chat {
  id: string;
  service: Service;
  accountId: string;
  chatId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  fullText: string;
  url: string;
}

export interface Account {
  id: string;
  service: Service;
  displayName: string;
  email?: string;
  orgId?: string;
  lastSynced: number;
  chatCount: number;
}

export interface SyncStatus {
  accountId: string;
  status: 'idle' | 'syncing' | 'error';
  progress?: number;
  total?: number;
  error?: string;
  lastSynced?: number;
}

export interface SearchResult {
  chat: Chat;
  score: number;
  matches: string[];
}
