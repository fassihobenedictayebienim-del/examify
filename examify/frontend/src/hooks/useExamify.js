/**
 * Examify Custom Hooks
 * Reusable hooks for API interactions and UI state.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../utils/api';

// ── File Polling Hook ────────────────────────────────────────────────────────

export const useFileStatus = (fileId, onReady) => {
  const [status, setStatus] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!fileId) return;

    const poll = async () => {
      try {
        const data = await api.getFileStatus(fileId);
        setStatus(data);
        if (data.status === 'ready' || data.status === 'questions_ready') {
          clearInterval(intervalRef.current);
          onReady && onReady(data);
        } else if (data.status === 'error') {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current);
  }, [fileId, onReady]);

  return status;
};

// ── Question Set Status Polling Hook ─────────────────────────────────────────

export const useQuestionSetStatus = (setId, onReady) => {
  const [status, setStatus] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!setId) return;

    const poll = async () => {
      try {
        const data = await api.getQuestionSetStatus(setId);
        setStatus(data);
        if (data.status === 'ready') {
          clearInterval(intervalRef.current);
          onReady && onReady(data);
        } else if (data.status === 'error') {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        clearInterval(intervalRef.current);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => clearInterval(intervalRef.current);
  }, [setId, onReady]);

  return status;
};

// ── Pagination Hook ───────────────────────────────────────────────────────────

export const usePagination = (fetchFn, params = {}, perPage = 20) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetch = useCallback(async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ ...params, page: pageNum, per_page: perPage });
      setData(result.questions || result.files || []);
      setPagination(result.pagination || null);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params), perPage]);

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  return { data, pagination, loading, error, page, setPage: fetch };
};

// ── Timer Hook ────────────────────────────────────────────────────────────────

export const useTimer = (initialSeconds = 0, countDown = false) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (countDown && s <= 0) {
            setRunning(false);
            return 0;
          }
          return countDown ? s - 1 : s + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, countDown]);

  const start = () => setRunning(true);
  const stop = () => setRunning(false);
  const reset = (newVal) => {
    setRunning(false);
    setSeconds(newVal !== undefined ? newVal : initialSeconds);
  };

  const formatted = (() => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  return { seconds, formatted, running, start, stop, reset };
};

// ── Local Storage Persistence Hook ────────────────────────────────────────────

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error('localStorage error:', err);
    }
  };

  return [storedValue, setValue];
};
