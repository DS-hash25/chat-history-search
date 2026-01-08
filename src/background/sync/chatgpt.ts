import { CHATGPT_API } from '../../shared/constants';
import type { Chat, Message, SyncStatus } from '../../shared/types';
import { getAccount, saveAccount, saveChat, getChatsByAccount } from '../storage';
import { addToIndex } from '../search';

interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
}

interface ChatGPTConversationList {
  items: ChatGPTConversation[];
  total: number;
  limit: number;
  offset: number;
  has_missing_conversations: boolean;
}

interface ChatGPTMessage {
  id: string;
  author: { role: 'user' | 'assistant' | 'system' };
  content: {
    content_type: string;
    parts?: string[];
  };
  create_time: number;
}

interface ChatGPTConversationDetail {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<
    string,
    {
      message?: ChatGPTMessage;
      parent?: string;
      children?: string[];
    }
  >;
}

// Get cookies for ChatGPT
const getCookieHeader = async (): Promise<string> => {
  const cookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
};

export const syncChatGPTAccount = async (
  accountId: string,
  onProgress?: (status: SyncStatus) => void
): Promise<void> => {
  const account = await getAccount(accountId);
  if (!account || account.service !== 'chatgpt') {
    throw new Error('Invalid ChatGPT account');
  }

  const updateStatus = (partial: Partial<SyncStatus>) => {
    onProgress?.({
      accountId,
      status: 'syncing',
      ...partial,
    });
  };

  updateStatus({ status: 'syncing', progress: 0 });

  try {
    const cookieHeader = await getCookieHeader();
    if (!cookieHeader) {
      throw new Error('No ChatGPT cookies found');
    }

    // Fetch all conversations with pagination
    const allConversations: ChatGPTConversation[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const listUrl = `${CHATGPT_API.CONVERSATIONS}?offset=${offset}&limit=${limit}`;
      const listResponse = await fetch(listUrl, {
        headers: { 'Cookie': cookieHeader },
      });

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch conversations: ${listResponse.status}`);
      }

      const data: ChatGPTConversationList = await listResponse.json();
      allConversations.push(...data.items);

      if (data.items.length < limit) break;
      offset += limit;

      // Rate limit protection
      await new Promise((r) => setTimeout(r, 200));
    }

    // Get existing chats to check for updates
    const existingChats = await getChatsByAccount(accountId);
    const existingMap = new Map(
      existingChats.map((c) => [c.chatId, c.updatedAt])
    );

    // Filter to only new/updated conversations
    const toSync = allConversations.filter((conv) => {
      const existingUpdated = existingMap.get(conv.id);
      if (!existingUpdated) return true;
      return conv.update_time * 1000 > existingUpdated;
    });

    console.log(
      `[ChatGPT] Syncing ${toSync.length}/${allConversations.length} conversations`
    );

    // Fetch each conversation detail
    for (let i = 0; i < toSync.length; i++) {
      const conv = toSync[i];
      updateStatus({
        progress: i + 1,
        total: toSync.length,
      });

      try {
        const detailUrl = CHATGPT_API.CONVERSATION(conv.id);
        const detailResponse = await fetch(detailUrl, {
          headers: { 'Cookie': cookieHeader },
        });

        if (!detailResponse.ok) {
          console.warn(`Failed to fetch conversation ${conv.id}`);
          continue;
        }

        const detail: ChatGPTConversationDetail = await detailResponse.json();

        // Extract messages from the mapping tree
        const messages: Message[] = [];
        const processedIds = new Set<string>();

        const extractMessages = (nodeId: string) => {
          if (processedIds.has(nodeId)) return;
          processedIds.add(nodeId);

          const node = detail.mapping[nodeId];
          if (!node) return;

          if (node.message) {
            const msg = node.message;
            if (
              (msg.author.role === 'user' || msg.author.role === 'assistant') &&
              msg.content.parts?.length
            ) {
              const content = msg.content.parts.join('\n');
              if (content.trim()) {
                messages.push({
                  role: msg.author.role,
                  content,
                  timestamp: msg.create_time * 1000,
                });
              }
            }
          }

          // Process children in order
          for (const childId of node.children || []) {
            extractMessages(childId);
          }
        };

        // Find root and traverse
        const rootId = Object.keys(detail.mapping).find(
          (id) => !detail.mapping[id].parent
        );
        if (rootId) {
          extractMessages(rootId);
        }

        const fullText = messages.map((m) => m.content).join('\n\n');

        const chat: Chat = {
          id: `chatgpt-${accountId}-${conv.id}`,
          service: 'chatgpt',
          accountId,
          chatId: conv.id,
          title: detail.title || 'Untitled',
          createdAt: detail.create_time * 1000,
          updatedAt: detail.update_time * 1000,
          messages,
          fullText,
          url: `https://chatgpt.com/c/${conv.id}`,
        };

        await saveChat(chat);
        addToIndex(chat);

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`Error syncing conversation ${conv.id}:`, err);
      }
    }

    // Update account
    await saveAccount({
      ...account,
      lastSynced: Date.now(),
      chatCount: allConversations.length,
    });

    updateStatus({
      status: 'idle',
      lastSynced: Date.now(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    updateStatus({ status: 'error', error });
    throw err;
  }
};
