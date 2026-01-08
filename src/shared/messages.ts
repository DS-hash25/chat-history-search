import type { Account, SearchResult, SyncStatus, Service } from './types';

export type MessageType =
  | 'ACCOUNT_DETECTED'
  | 'SYNC_ACCOUNT'
  | 'SYNC_ALL'
  | 'GET_ACCOUNTS'
  | 'GET_SYNC_STATUS'
  | 'SEARCH'
  | 'DELETE_ACCOUNT'
  | 'OPEN_CHAT';

export interface AccountDetectedMessage {
  type: 'ACCOUNT_DETECTED';
  payload: {
    service: Service;
    accountId: string;
    displayName: string;
    email?: string;
    orgId?: string;
  };
}

export interface SyncAccountMessage {
  type: 'SYNC_ACCOUNT';
  payload: {
    accountId: string;
  };
}

export interface SyncAllMessage {
  type: 'SYNC_ALL';
}

export interface GetAccountsMessage {
  type: 'GET_ACCOUNTS';
}

export interface GetSyncStatusMessage {
  type: 'GET_SYNC_STATUS';
}

export interface SearchMessage {
  type: 'SEARCH';
  payload: {
    query: string;
    accountIds?: string[];
  };
}

export interface DeleteAccountMessage {
  type: 'DELETE_ACCOUNT';
  payload: {
    accountId: string;
  };
}

export interface OpenChatMessage {
  type: 'OPEN_CHAT';
  payload: {
    url: string;
  };
}

export type ExtensionMessage =
  | AccountDetectedMessage
  | SyncAccountMessage
  | SyncAllMessage
  | GetAccountsMessage
  | GetSyncStatusMessage
  | SearchMessage
  | DeleteAccountMessage
  | OpenChatMessage;

export interface AccountsResponse {
  accounts: Account[];
}

export interface SyncStatusResponse {
  statuses: Record<string, SyncStatus>;
}

export interface SearchResponse {
  results: SearchResult[];
}
