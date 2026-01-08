import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccounts } from './hooks/useAccounts';
import { useSearch } from './hooks/useSearch';
import type { SearchResult } from '../shared/types';

type ServiceFilter = 'all' | 'claude' | 'chatgpt';

export default function App() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { accounts, syncStatuses, syncAccount, refresh } = useAccounts();
  const { results: allResults, isSearching } = useSearch(query);
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter results by service
  const results = filter === 'all'
    ? allResults
    : allResults.filter(r => r.chat.service === filter);

  // Calculate totals
  const totalChats = accounts.reduce((sum, a) => sum + a.chatCount, 0);
  const claudeChats = accounts.filter(a => a.service === 'claude').reduce((sum, a) => sum + a.chatCount, 0);
  const chatgptChats = accounts.filter(a => a.service === 'chatgpt').reduce((sum, a) => sum + a.chatCount, 0);
  const isSyncing = Object.values(syncStatuses).some(s => s.status === 'syncing');
  const syncProgress = Object.values(syncStatuses).find(s => s.status === 'syncing');

  // Estimate storage usage (~5KB per chat average)
  const estimatedStorageKB = totalChats * 5;
  const storageDisplay = estimatedStorageKB < 1024
    ? `~${estimatedStorageKB} KB`
    : `~${(estimatedStorageKB / 1024).toFixed(1)} MB`;

  // Get account display name by id
  const getAccountName = (accountId: string): string => {
    const account = accounts.find(a => a.id === accountId);
    return account?.displayName || 'Unknown';
  };

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length, query, filter]);

  // Listen for sync updates
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === 'SYNC_STATUS_UPDATE') refresh();
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const openChat = useCallback((url: string) => {
    chrome.runtime.sendMessage({ type: 'OPEN_CHAT', payload: { url } });
  }, []);

  // Sync all accounts
  const syncAll = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'SYNC_ALL' });
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape clears search
    if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setFilter('all');
      return;
    }

    if (results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(i => (i - 1 + results.length) % results.length);
        } else {
          setSelectedIndex(i => (i + 1) % results.length);
        }
        break;
      case 'Enter':
        e.preventDefault();
        openChat(results[selectedIndex].chat.url);
        break;
    }
  };

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, results.length]);

  return (
    <div className="flex flex-col h-screen bg-[#0d0d0d] text-white">
      {/* Search Header */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={totalChats > 0 ? `Search ${totalChats} chats...` : "Search your chats..."}
            className="w-full pl-10 pr-10 py-2.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-white placeholder-[#666] focus:outline-none focus:border-[#555] text-sm"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sync Status Bar */}
        {isSyncing && syncProgress && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#888]">
            <div className="w-3 h-3 border-2 border-[#666] border-t-white rounded-full animate-spin" />
            <span>Syncing... {syncProgress.progress}/{syncProgress.total}</span>
          </div>
        )}

        {/* Filter Chips - only show when searching and have chats */}
        {query.length > 0 && totalChats > 0 && (
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white'
              }`}
            >
              All ({allResults.length})
            </button>
            {claudeChats > 0 && (
              <button
                onClick={() => setFilter('claude')}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  filter === 'claude'
                    ? 'bg-[#d97757] text-white'
                    : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                }`}
              >
                Claude ({allResults.filter(r => r.chat.service === 'claude').length})
              </button>
            )}
            {chatgptChats > 0 && (
              <button
                onClick={() => setFilter('chatgpt')}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  filter === 'chatgpt'
                    ? 'bg-[#10a37f] text-white'
                    : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                }`}
              >
                ChatGPT ({allResults.filter(r => r.chat.service === 'chatgpt').length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto" ref={resultsRef}>
        {query.length === 0 ? (
          // Empty state - show accounts or onboarding
          <div className="p-4">
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-2">No accounts connected</h3>
                <p className="text-[#666] text-sm mb-6 max-w-[220px] mx-auto">
                  Open Claude or ChatGPT in a browser tab. Your account will be detected automatically.
                </p>
                <div className="flex flex-col gap-2 max-w-[200px] mx-auto">
                  <a href="https://claude.ai" target="_blank" rel="noopener" className="px-4 py-2 text-sm bg-[#d97757] rounded-lg hover:bg-[#c96747] text-center">
                    Open Claude
                  </a>
                  <a href="https://chatgpt.com" target="_blank" rel="noopener" className="px-4 py-2 text-sm bg-[#10a37f] rounded-lg hover:bg-[#0d8a6a] text-center">
                    Open ChatGPT
                  </a>
                </div>
                <p className="text-[#444] text-xs mt-6">
                  Tip: Keep this panel open while browsing
                </p>
              </div>
            ) : (
              // Show connected accounts
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[#666] uppercase tracking-wide">Connected</span>
                  <div className="flex items-center gap-2">
                    {showSettings && !isSyncing && accounts.length > 1 && (
                      <button
                        onClick={syncAll}
                        className="text-xs text-[#888] hover:text-white"
                      >
                        Sync All
                      </button>
                    )}
                    <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-[#666] hover:text-white">
                      {showSettings ? 'Done' : 'Manage'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {accounts.map(account => {
                    const status = syncStatuses[account.id];
                    const isSyncingThis = status?.status === 'syncing';
                    const lastSynced = account.lastSynced ? formatRelativeTime(account.lastSynced) : 'Never';
                    return (
                      <div key={account.id} className="p-2 bg-[#1a1a1a] rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${account.service === 'claude' ? 'bg-[#d97757]' : 'bg-[#10a37f]'}`} />
                            <span className="text-sm">{account.displayName}</span>
                            <span className="text-xs text-[#666]">{account.chatCount} chats</span>
                          </div>
                          {showSettings && (
                            <button
                              onClick={() => syncAccount(account.id)}
                              disabled={isSyncingThis}
                              className="text-xs text-[#888] hover:text-white disabled:opacity-50"
                            >
                              {isSyncingThis ? 'Syncing...' : 'Sync'}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-[#555] mt-1 ml-4">
                          Last synced: {lastSynced}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-[#1a1a1a]">
                  {showSettings ? (
                    <div className="text-xs text-[#555] text-center">
                      <div className="flex justify-center items-center gap-4 mb-2">
                        <span>{totalChats} chats indexed</span>
                        <span>•</span>
                        <span>Storage: {storageDisplay}</span>
                      </div>
                      <p className="text-[#444]">v1.3.0 • Data stored locally only</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[#555] text-center mb-2">
                        Start typing to search across all chats
                      </p>
                      <div className="flex justify-center gap-3 text-[10px] text-[#444]">
                        <span><kbd className="px-1 py-0.5 bg-[#1a1a1a] rounded">↑↓</kbd> navigate</span>
                        <span><kbd className="px-1 py-0.5 bg-[#1a1a1a] rounded">Enter</kbd> open</span>
                        <span><kbd className="px-1 py-0.5 bg-[#1a1a1a] rounded">Esc</kbd> clear</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : results.length === 0 ? (
          // No results
          <div className="flex flex-col items-center justify-center h-full text-[#666]">
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-[#333] border-t-[#666] rounded-full animate-spin" />
            ) : (
              <p className="text-sm">No results for "{query}"</p>
            )}
          </div>
        ) : (
          // Results list
          <div>
            <div className="px-3 py-2 text-xs text-[#666] border-b border-[#1a1a1a]">
              {results.length} result{results.length !== 1 ? 's' : ''} · Use ↑↓ to navigate
            </div>
            {results.map((result, idx) => (
              <ResultItem
                key={result.chat.id}
                result={result}
                onOpen={openChat}
                isSelected={idx === selectedIndex}
                index={idx}
                accountName={getAccountName(result.chat.accountId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Render text with **highlights** and role prefixes
function HighlightedText({ text }: { text: string }) {
  // Check for role prefix
  const hasYouPrefix = text.startsWith('You: ');
  const hasAIPrefix = text.startsWith('AI: ');
  const hasTitlePrefix = text.startsWith('Title: ');

  let prefix = '';
  let content = text;

  if (hasYouPrefix) {
    prefix = 'You';
    content = text.slice(5);
  } else if (hasAIPrefix) {
    prefix = 'AI';
    content = text.slice(4);
  } else if (hasTitlePrefix) {
    prefix = 'Title';
    content = text.slice(7);
  }

  const parts = content.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {prefix && (
        <span className={`font-medium mr-1 ${hasYouPrefix ? 'text-blue-400' : hasAIPrefix ? 'text-purple-400' : 'text-[#888]'}`}>
          {prefix}:
        </span>
      )}
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-orange-500/40 text-orange-200 rounded px-0.5 font-medium">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// Result item component
function ResultItem({
  result,
  onOpen,
  isSelected,
  index,
  accountName
}: {
  result: SearchResult;
  onOpen: (url: string) => void;
  isSelected: boolean;
  index: number;
  accountName: string;
}) {
  const { chat, matches } = result;

  return (
    <button
      data-index={index}
      onClick={() => onOpen(chat.url)}
      className={`w-full text-left p-3 border-b border-[#1a1a1a] transition-colors ${
        isSelected
          ? 'bg-[#1a1a1a] ring-1 ring-inset ring-[#333]'
          : 'hover:bg-[#1a1a1a]/50'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Service indicator */}
        <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${chat.service === 'claude' ? 'bg-[#d97757]' : 'bg-[#10a37f]'}`} />

        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="font-medium text-sm truncate">{chat.title}</div>

          {/* Snippets with highlighting - show up to 2 */}
          {matches.slice(0, 2).map((match, i) => (
            <p key={i} className="text-xs text-[#999] mt-1 line-clamp-2">
              <HighlightedText text={match} />
            </p>
          ))}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-[#555]">
            <span className={chat.service === 'claude' ? 'text-[#d97757]' : 'text-[#10a37f]'}>
              {accountName}
            </span>
            <span>·</span>
            <span>{formatDate(chat.updatedAt)}</span>
            <span>·</span>
            <span>{chat.messages.length} msgs</span>
          </div>
        </div>

        {/* Arrow - more visible when selected */}
        <svg className={`w-4 h-4 mt-1 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[#444]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
