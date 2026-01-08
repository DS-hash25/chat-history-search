export const DB_NAME = 'chat-search-db';
export const DB_VERSION = 1;

export const STORES = {
  ACCOUNTS: 'accounts',
  CHATS: 'chats',
} as const;

export const CLAUDE_API = {
  BASE: 'https://claude.ai/api',
  CONVERSATIONS: (orgId: string) =>
    `https://claude.ai/api/organizations/${orgId}/chat_conversations`,
  CONVERSATION: (orgId: string, id: string) =>
    `https://claude.ai/api/organizations/${orgId}/chat_conversations/${id}`,
} as const;

export const CHATGPT_API = {
  BASE: 'https://chatgpt.com/backend-api',
  CONVERSATIONS: 'https://chatgpt.com/backend-api/conversations',
  CONVERSATION: (id: string) =>
    `https://chatgpt.com/backend-api/conversation/${id}`,
} as const;
