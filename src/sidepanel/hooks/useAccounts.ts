import { useState, useEffect, useCallback } from 'react';
import type { Account, SyncStatus } from '../../shared/types';

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncStatus>>({});

  const refresh = useCallback(async () => {
    try {
      const [accountsRes, statusRes] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'GET_ACCOUNTS' }),
        chrome.runtime.sendMessage({ type: 'GET_SYNC_STATUS' }),
      ]);

      if (accountsRes?.accounts) {
        setAccounts(accountsRes.accounts);
      }
      if (statusRes?.statuses) {
        setSyncStatuses(statusRes.statuses);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Refresh periodically
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const syncAccount = useCallback(async (accountId: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'SYNC_ACCOUNT',
        payload: { accountId },
      });
      refresh();
    } catch (err) {
      console.error('Failed to sync account:', err);
    }
  }, [refresh]);

  const deleteAccount = useCallback(async (accountId: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_ACCOUNT',
        payload: { accountId },
      });
      refresh();
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  }, [refresh]);

  return {
    accounts,
    syncStatuses,
    syncAccount,
    deleteAccount,
    refresh,
  };
};
