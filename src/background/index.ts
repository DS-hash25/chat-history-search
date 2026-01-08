import type {
  AccountsResponse,
  SearchResponse,
  SyncStatusResponse,
} from '../shared/messages';
import type { Account, SyncStatus } from '../shared/types';
import {
  getAllAccounts,
  saveAccount,
  deleteAccount as deleteAccountFromDB,
  getAccount,
} from './storage';
import { initSearchIndex, search, rebuildIndex } from './search';
import { syncClaudeAccount } from './sync/claude';
import { syncChatGPTAccount } from './sync/chatgpt';

// Track sync status for all accounts
const syncStatuses: Record<string, SyncStatus> = {};

// Initialize on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed');
  await initSearchIndex();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[Background] Extension started');
  await initSearchIndex();
});

// Open side panel when clicking extension icon
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Handle messages from content scripts and side panel
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('[Background] Message error:', err);
      sendResponse({ error: err.message });
    });

  return true; // Keep channel open for async response
});

// Get cookies for a domain as a header string
const getCookieHeader = async (domain: string): Promise<string> => {
  const cookies = await chrome.cookies.getAll({ domain });
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
};

// Detect Claude account by fetching from API
const detectClaudeAccount = async (): Promise<void> => {
  console.log('[Background] Detecting Claude account...');
  try {
    // Get cookies for claude.ai
    const cookieHeader = await getCookieHeader('claude.ai');
    if (!cookieHeader) {
      console.warn('[Background] No Claude cookies found - user not logged in');
      return;
    }

    // Fetch organizations with cookies
    const orgsResponse = await fetch('https://claude.ai/api/organizations', {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!orgsResponse.ok) {
      console.warn('[Background] Failed to fetch Claude orgs:', orgsResponse.status);
      return;
    }

    const orgs = await orgsResponse.json();
    const primaryOrg = orgs[0];

    if (!primaryOrg) {
      console.warn('[Background] No Claude organizations found');
      return;
    }

    console.log('[Background] Found Claude org:', primaryOrg.name);

    const accountId = primaryOrg.uuid;
    const id = `claude-${accountId}`;

    // Check if account already exists
    const existing = await getAccount(id);

    const account: Account = {
      id,
      service: 'claude',
      displayName: primaryOrg.name || 'Claude Account',
      orgId: primaryOrg.uuid,
      lastSynced: existing?.lastSynced ?? 0,
      chatCount: existing?.chatCount ?? 0,
    };

    await saveAccount(account);
    console.log(`[Background] Claude account saved: ${account.displayName}`);

    // Auto-sync if never synced before
    if (!existing?.lastSynced) {
      console.log('[Background] Starting initial sync...');
      syncAccount(id).catch(console.error);
    }
  } catch (err) {
    console.error('[Background] Error detecting Claude account:', err);
  }
};

// Detect ChatGPT account by fetching from API
const detectChatGPTAccount = async (): Promise<void> => {
  console.log('[Background] Detecting ChatGPT account...');
  try {
    // Get cookies for chatgpt.com
    const cookieHeader = await getCookieHeader('chatgpt.com');
    if (!cookieHeader) {
      console.warn('[Background] No ChatGPT cookies found - user not logged in');
      return;
    }

    const response = await fetch('https://chatgpt.com/backend-api/me', {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    if (!response.ok) {
      console.warn('[Background] Failed to fetch ChatGPT user:', response.status);
      return;
    }

    const user = await response.json();
    const accountId = user.id || user.email || 'chatgpt-user';
    const id = `chatgpt-${accountId}`;

    // Check if account already exists
    const existing = await getAccount(id);

    const account: Account = {
      id,
      service: 'chatgpt',
      displayName: user.name || user.email || 'ChatGPT User',
      email: user.email,
      lastSynced: existing?.lastSynced ?? 0,
      chatCount: existing?.chatCount ?? 0,
    };

    await saveAccount(account);
    console.log(`[Background] ChatGPT account saved: ${account.displayName}`);

    // Auto-sync if never synced before
    if (!existing?.lastSynced) {
      console.log('[Background] Starting initial sync...');
      syncAccount(id).catch(console.error);
    }
  } catch (err) {
    console.error('[Background] Error detecting ChatGPT account:', err);
  }
};

const handleMessage = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
): Promise<AccountsResponse | SearchResponse | SyncStatusResponse | { success: boolean }> => {
  switch (message.type) {
    case 'DETECT_CLAUDE_ACCOUNT': {
      await detectClaudeAccount();
      return { success: true };
    }

    case 'DETECT_CHATGPT_ACCOUNT': {
      await detectChatGPTAccount();
      return { success: true };
    }

    case 'ACCOUNT_DETECTED': {
      const { service, accountId, displayName, email, orgId } = message.payload;
      const id = `${service}-${accountId}`;

      // Check if account already exists
      const existing = await getAccount(id);

      const account: Account = {
        id,
        service,
        displayName,
        email,
        orgId,
        lastSynced: existing?.lastSynced ?? 0,
        chatCount: existing?.chatCount ?? 0,
      };

      await saveAccount(account);
      console.log(`[Background] Account detected: ${displayName} (${service})`);

      // Auto-sync if never synced before
      if (!existing?.lastSynced) {
        syncAccount(id).catch(console.error);
      }

      return { success: true };
    }

    case 'SYNC_ACCOUNT': {
      const { accountId } = message.payload;
      await syncAccount(accountId);
      return { success: true };
    }

    case 'SYNC_ALL': {
      const accounts = await getAllAccounts();
      await Promise.all(accounts.map((a) => syncAccount(a.id)));
      return { success: true };
    }

    case 'GET_ACCOUNTS': {
      const accounts = await getAllAccounts();
      return { accounts };
    }

    case 'GET_SYNC_STATUS': {
      return { statuses: syncStatuses };
    }

    case 'SEARCH': {
      const { query, accountIds } = message.payload;
      // Make sure index is initialized before searching
      await initSearchIndex();
      const results = search(query, accountIds);
      return { results };
    }

    case 'DELETE_ACCOUNT': {
      const { accountId } = message.payload;
      await deleteAccountFromDB(accountId);
      delete syncStatuses[accountId];
      await rebuildIndex();
      return { success: true };
    }

    case 'OPEN_CHAT': {
      const { url } = message.payload;
      await chrome.tabs.create({ url });
      return { success: true };
    }

    default:
      throw new Error(`Unknown message type`);
  }
};

const syncAccount = async (accountId: string): Promise<void> => {
  const account = await getAccount(accountId);
  if (!account) {
    throw new Error(`Account not found: ${accountId}`);
  }

  // Already syncing
  if (syncStatuses[accountId]?.status === 'syncing') {
    return;
  }

  const onProgress = (status: SyncStatus) => {
    syncStatuses[accountId] = status;
    // Broadcast status update to side panel
    chrome.runtime.sendMessage({
      type: 'SYNC_STATUS_UPDATE',
      payload: { accountId, status },
    }).catch(() => {
      // Ignore if no listener
    });
  };

  try {
    if (account.service === 'claude') {
      await syncClaudeAccount(accountId, onProgress);
    } else {
      await syncChatGPTAccount(accountId, onProgress);
    }
  } catch (err) {
    console.error(`[Background] Sync error for ${accountId}:`, err);
  }
};
