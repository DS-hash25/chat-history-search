interface SearchBarProps {
  query: string;
  onChange: (query: string) => void;
}

export const SearchBar = ({ query, onChange }: SearchBarProps) => {
  return (
    <div className="p-4">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search all your chats..."
          className="w-full pl-10 pr-4 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white placeholder-[#707070] focus:outline-none focus:border-[#606060] transition-colors"
          autoFocus
        />
        {query && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0] hover:text-white"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
