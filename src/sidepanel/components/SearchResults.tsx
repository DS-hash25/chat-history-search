import type { SearchResult } from '../../shared/types';

interface SearchResultsProps {
  results: SearchResult[];
  isSearching: boolean;
  onOpenChat: (url: string) => void;
  hasQuery: boolean;
}

export const SearchResults = ({
  results,
  isSearching,
  onOpenChat,
  hasQuery,
}: SearchResultsProps) => {
  if (!hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">Search your chats</h3>
        <p className="text-sm text-[#a0a0a0]">
          Find conversations by searching message content, not just titles.
        </p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="flex items-center gap-2 text-[#a0a0a0]">
          <svg
            className="w-5 h-5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Searching...</span>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
        <p className="text-[#a0a0a0]">No results found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-2 text-xs text-[#a0a0a0] border-b border-[#404040]">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
      <div className="divide-y divide-[#404040]">
        {results.map((result) => (
          <button
            key={result.chat.id}
            onClick={() => onOpenChat(result.chat.url)}
            className="w-full p-4 text-left hover:bg-[#2a2a2a] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  result.chat.service === 'claude'
                    ? 'bg-[#d97757]'
                    : 'bg-[#10a37f]'
                }`}
              />
              <span className="font-medium truncate">{result.chat.title}</span>
            </div>

            {result.matches.length > 0 && (
              <div className="space-y-1">
                {result.matches.slice(0, 2).map((match, i) => (
                  <p
                    key={i}
                    className="text-sm text-[#a0a0a0] line-clamp-2"
                  >
                    {match}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-2 text-xs text-[#707070]">
              <span>{formatDate(result.chat.updatedAt)}</span>
              <span>{result.chat.messages.length} messages</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};
