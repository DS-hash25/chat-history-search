import { useState, useEffect } from 'react';
import type { SearchResult } from '../../shared/types';

export const useSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Very short debounce for snappy feel
    const timer = setTimeout(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'SEARCH',
          payload: { query },
        });

        if (response?.results) {
          setResults(response.results);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 50); // 50ms debounce - very fast

    return () => clearTimeout(timer);
  }, [query]);

  return { results, isSearching };
};
