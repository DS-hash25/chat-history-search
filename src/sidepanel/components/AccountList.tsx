import type { Account, SyncStatus } from '../../shared/types';

interface AccountListProps {
  accounts: Account[];
  syncStatuses: Record<string, SyncStatus>;
  onSync: (accountId: string) => void;
  onDelete: (accountId: string) => void;
}

export const AccountList = ({
  accounts,
  syncStatuses,
  onSync,
  onDelete,
}: AccountListProps) => {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-[#2a2a2a] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#a0a0a0]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
        <p className="text-sm text-[#a0a0a0] mb-4">
          Visit claude.ai or chatgpt.com while logged in to automatically
          connect your accounts.
        </p>
        <div className="flex gap-2">
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-[#d97757] text-white rounded-md hover:bg-[#c96747] transition-colors"
          >
            Open Claude
          </a>
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm bg-[#10a37f] text-white rounded-md hover:bg-[#0d8a6a] transition-colors"
          >
            Open ChatGPT
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {accounts.map((account) => {
        const status = syncStatuses[account.id];
        const isSyncing = status?.status === 'syncing';

        return (
          <div
            key={account.id}
            className="p-3 bg-[#2a2a2a] rounded-lg border border-[#404040]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    account.service === 'claude'
                      ? 'bg-[#d97757]'
                      : 'bg-[#10a37f]'
                  }`}
                />
                <span className="font-medium">{account.displayName}</span>
              </div>
              <span className="text-xs text-[#a0a0a0] capitalize">
                {account.service}
              </span>
            </div>

            {account.email && (
              <p className="text-sm text-[#a0a0a0] mb-2">{account.email}</p>
            )}

            <div className="flex items-center justify-between text-xs text-[#a0a0a0]">
              <span>{account.chatCount} chats</span>
              <span>
                {account.lastSynced
                  ? `Synced ${formatTimeAgo(account.lastSynced)}`
                  : 'Never synced'}
              </span>
            </div>

            {isSyncing && status?.total && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-[#a0a0a0] mb-1">
                  <span>Syncing...</span>
                  <span>
                    {status.progress}/{status.total}
                  </span>
                </div>
                <div className="h-1 bg-[#404040] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      account.service === 'claude'
                        ? 'bg-[#d97757]'
                        : 'bg-[#10a37f]'
                    }`}
                    style={{
                      width: `${(status.progress! / status.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {status?.status === 'error' && (
              <p className="mt-2 text-xs text-red-400">{status.error}</p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onSync(account.id)}
                disabled={isSyncing}
                className="flex-1 px-3 py-1.5 text-sm bg-[#3a3a3a] rounded hover:bg-[#4a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remove ${account.displayName}?`)) {
                    onDelete(account.id);
                  }
                }}
                className="px-3 py-1.5 text-sm text-red-400 bg-[#3a3a3a] rounded hover:bg-[#4a4a4a] transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
