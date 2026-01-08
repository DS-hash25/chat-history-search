import MiniSearch from 'minisearch';
import type { Chat, SearchResult } from '../shared/types';
import { getAllChats } from './storage';

interface IndexedDocument {
  id: string;
  title: string;
  fullText: string;
  accountId: string;
  service: string;
  updatedAt: number;
}

let searchIndex: MiniSearch<IndexedDocument> | null = null;
let chatCache: Map<string, Chat> = new Map();
let lastIndexedCount = 0;

const createIndex = () => {
  return new MiniSearch<IndexedDocument>({
    fields: ['title', 'fullText'],
    storeFields: ['id', 'accountId', 'service', 'updatedAt'],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,        // Fuzzy matching for typos
      prefix: true,      // Match word prefixes
      combineWith: 'OR', // Match any word, not all
    },
    // Case-insensitive tokenization
    tokenize: (text) => text.toLowerCase().split(/[\s\-_.,!?;:'"()[\]{}]+/).filter(t => t.length > 0),
    // Case-insensitive search terms
    processTerm: (term) => term.toLowerCase(),
  });
};

export const initSearchIndex = async (): Promise<void> => {
  const chats = await getAllChats();

  // Skip if already indexed same number of chats
  if (searchIndex && chats.length === lastIndexedCount) {
    return;
  }

  console.log(`[Search] Building index with ${chats.length} chats...`);

  searchIndex = createIndex();
  chatCache.clear();

  const documents: IndexedDocument[] = chats.map((chat) => {
    chatCache.set(chat.id, chat);
    return {
      id: chat.id,
      title: chat.title,
      fullText: chat.fullText,
      accountId: chat.accountId,
      service: chat.service,
      updatedAt: chat.updatedAt,
    };
  });

  if (documents.length > 0) {
    searchIndex.addAll(documents);
  }

  lastIndexedCount = chats.length;
  console.log(`[Search] Indexed ${documents.length} chats`);
};

export const addToIndex = (chat: Chat): void => {
  if (!searchIndex) {
    console.warn('[Search] Index not initialized');
    return;
  }

  // Remove old version if exists
  if (chatCache.has(chat.id)) {
    searchIndex.discard(chat.id);
  }

  chatCache.set(chat.id, chat);
  searchIndex.add({
    id: chat.id,
    title: chat.title,
    fullText: chat.fullText,
    accountId: chat.accountId,
    service: chat.service,
    updatedAt: chat.updatedAt,
  });
};

export const removeFromIndex = (chatId: string): void => {
  if (!searchIndex) return;
  if (chatCache.has(chatId)) {
    searchIndex.discard(chatId);
    chatCache.delete(chatId);
  }
};

export const search = (
  query: string,
  accountIds?: string[]
): SearchResult[] => {
  if (!searchIndex || !query.trim()) {
    return [];
  }

  const results = searchIndex.search(query, {
    filter: accountIds?.length
      ? (result) => accountIds.includes(result.accountId)
      : undefined,
  });

  // Sort by date (newest first) while preserving relevance grouping
  const sortedResults = results
    .slice(0, 50)
    .sort((a, b) => {
      // If scores are similar (within 20%), sort by date
      const scoreDiff = Math.abs(a.score - b.score) / Math.max(a.score, b.score);
      if (scoreDiff < 0.2) {
        return (b.updatedAt as number) - (a.updatedAt as number);
      }
      return b.score - a.score;
    });

  return sortedResults.map((result) => {
    const chat = chatCache.get(result.id)!;
    const matches = extractMatches(chat, query);

    return {
      chat,
      score: result.score,
      matches,
    };
  });
};

const extractMatches = (chat: Chat, query: string): string[] => {
  const matches: string[] = [];
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(Boolean);

  // Also check for fuzzy variants (simple approach: check if 70%+ chars match)
  const isFuzzyMatch = (text: string, word: string): number => {
    const idx = text.indexOf(word);
    if (idx !== -1) return idx;

    // Try to find similar words
    const wordLen = word.length;
    for (let i = 0; i <= text.length - wordLen + 1; i++) {
      const slice = text.slice(i, i + wordLen + 1);
      let matchCount = 0;
      for (let j = 0; j < Math.min(slice.length, word.length); j++) {
        if (slice[j] === word[j]) matchCount++;
      }
      if (matchCount >= word.length * 0.7) return i;
    }
    return -1;
  };

  // Search in title first
  const titleLower = chat.title.toLowerCase();
  for (const word of words) {
    const idx = isFuzzyMatch(titleLower, word);
    if (idx !== -1) {
      // Highlight in title
      const matchEnd = idx + word.length;
      const highlighted = chat.title.slice(0, idx) + '**' + chat.title.slice(idx, matchEnd) + '**' + chat.title.slice(matchEnd);
      matches.push(`Title: ${highlighted}`);
      break;
    }
  }

  // Search in messages for context
  for (const message of chat.messages) {
    if (matches.length >= 3) break;

    const contentLower = message.content.toLowerCase();

    for (const word of words) {
      const idx = isFuzzyMatch(contentLower, word);
      if (idx !== -1) {
        // Extract snippet around match with highlighting
        const contextBefore = 40;
        const contextAfter = 60;
        const start = Math.max(0, idx - contextBefore);
        const matchEnd = Math.min(idx + word.length + 2, message.content.length);
        const end = Math.min(message.content.length, matchEnd + contextAfter);

        // Add role prefix (You/AI)
        const rolePrefix = message.role === 'user' ? 'You: ' : 'AI: ';

        let snippet = rolePrefix;
        if (start > 0) snippet += '...';
        snippet += message.content.slice(start, idx);
        snippet += '**' + message.content.slice(idx, matchEnd) + '**';
        snippet += message.content.slice(matchEnd, end);
        if (end < message.content.length) snippet += '...';

        // Clean up the snippet
        snippet = snippet.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

        if (snippet.length > 10 && !matches.some(m => m.includes(snippet.slice(4)))) {
          matches.push(snippet);
        }
        break;
      }
    }
  }

  // If no matches found, just show first message snippet
  if (matches.length === 0 && chat.messages.length > 0) {
    const first = chat.messages[0].content.slice(0, 100).replace(/\n+/g, ' ').trim();
    if (first) matches.push(first + '...');
  }

  return matches.slice(0, 3);
};

export const rebuildIndex = async (): Promise<void> => {
  lastIndexedCount = 0; // Force rebuild
  await initSearchIndex();
};
