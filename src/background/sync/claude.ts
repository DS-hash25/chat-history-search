import { CLAUDE_API } from '../../shared/constants';
import type { Chat, Message, SyncStatus } from '../../shared/types';
import { getAccount, saveAccount, saveChat, getChatsByAccount } from '../storage';
import { addToIndex } from '../search';

interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ClaudeMessage {
  uuid: string;
  text: string;
  sender: 'human' | 'assistant';
  created_at: string;
}

interface ClaudeConversationDetail {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeMessage[];
}

// Get cookies for Claude
const getCookieHeader = async (): Promise<string> => {
  const cookies = await chrome.cookies.getAll({ domain: 'claude.ai' });
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
};

export const syncClaudeAccount = async (
  accountId: string,
  onProgress?: (status: SyncStatus) => void
): Promise<void> => {
  const account = await getAccount(accountId);
  if (!account || account.service !== 'claude' || !account.orgId) {
    throw new Error('Invalid Claude account');
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
      throw new Error('No Claude cookies found');
    }

    // Fetch conversation list
    const listUrl = CLAUDE_API.CONVERSATIONS(account.orgId);
    const listResponse = await fetch(listUrl, {
      headers: { 'Cookie': cookieHeader },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to fetch conversations: ${listResponse.status}`);
    }

    const conversations: ClaudeConversation[] = await listResponse.json();

    // Get existing chats to check for updates
    const existingChats = await getChatsByAccount(accountId);
    const existingMap = new Map(
      existingChats.map((c) => [c.chatId, c.updatedAt])
    );

    // Filter to only new/updated conversations
    const toSync = conversations.filter((conv) => {
      const existingUpdated = existingMap.get(conv.uuid);
      if (!existingUpdated) return true;
      return new Date(conv.updated_at).getTime() > existingUpdated;
    });

    console.log(
      `[Claude] Syncing ${toSync.length}/${conversations.length} conversations`
    );

    // Fetch each conversation detail
    for (let i = 0; i < toSync.length; i++) {
      const conv = toSync[i];
      updateStatus({
        progress: i + 1,
        total: toSync.length,
      });

      try {
        const detailUrl = CLAUDE_API.CONVERSATION(account.orgId!, conv.uuid);
        const detailResponse = await fetch(detailUrl, {
          headers: { 'Cookie': cookieHeader },
        });

        if (!detailResponse.ok) {
          console.warn(`Failed to fetch conversation ${conv.uuid}`);
          continue;
        }

        const detail: ClaudeConversationDetail = await detailResponse.json();

        const messages: Message[] = (detail.chat_messages || []).map((msg) => ({
          role: msg.sender === 'human' ? 'user' : 'assistant',
          content: msg.text || '',
          timestamp: new Date(msg.created_at).getTime(),
        }));

        const fullText = messages.map((m) => m.content).join('\n\n');

        const chat: Chat = {
          id: `claude-${accountId}-${conv.uuid}`,
          service: 'claude',
          accountId,
          chatId: conv.uuid,
          title: detail.name || 'Untitled',
          createdAt: new Date(detail.created_at).getTime(),
          updatedAt: new Date(detail.updated_at).getTime(),
          messages,
          fullText,
          url: `https://claude.ai/chat/${conv.uuid}`,
        };

        await saveChat(chat);
        addToIndex(chat);

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error(`Error syncing conversation ${conv.uuid}:`, err);
      }
    }

    // Update account
    await saveAccount({
      ...account,
      lastSynced: Date.now(),
      chatCount: conversations.length,
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
