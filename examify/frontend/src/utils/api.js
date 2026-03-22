/**
 * Examify API Service
 * Centralized API communication layer with error handling.
 */

import axios from 'axios';

// When Flask serves the built frontend the API is on the same origin,
// so a relative /api path works for both production and CRA dev-proxy mode.
// Only set REACT_APP_API_URL if the backend is on a completely different host.
const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 minutes for long operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor - normalize errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── File Upload ──────────────────────────────────────────────────────────────

export const uploadFile = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    },
  });
};

export const listFiles = () => api.get('/files');
export const getFile = (fileId) => api.get(`/files/${fileId}`);
export const getFileStatus = (fileId) => api.get(`/files/${fileId}/status`);
export const deleteFile = (fileId) => api.delete(`/files/${fileId}`);

// ── Question Generation ──────────────────────────────────────────────────────

export const generateQuestions = (fileId, targetMcq = 70, targetFitb = 30) =>
  api.post('/generate-questions', {
    file_id: fileId,
    target_mcq: targetMcq,
    target_fitb: targetFitb,
  });

export const listQuestionSets = (fileId) =>
  api.get('/question-sets', { params: fileId ? { file_id: fileId } : {} });

export const getQuestionSet = (setId) => api.get(`/question-sets/${setId}`);

export const getQuestionSetStatus = (setId) =>
  api.get(`/question-sets/${setId}/status`);

export const deleteQuestionSet = (setId) => api.delete(`/question-sets/${setId}`);

// ── Questions ────────────────────────────────────────────────────────────────

export const getQuestions = (setId, params = {}) =>
  api.get('/questions', { params: { set_id: setId, ...params } });

export const getAllQuestions = (setId, hideAnswers = false) =>
  api.get('/questions/all', {
    params: { set_id: setId, hide_answers: hideAnswers },
  });

// ── Sessions & Scoring ───────────────────────────────────────────────────────

export const createSession = (questionSetId) =>
  api.post('/sessions', { question_set_id: questionSetId });

export const submitAnswers = (sessionId, answers, timeTaken) =>
  api.post('/submit-answers', {
    session_id: sessionId,
    answers,
    time_taken_seconds: timeTaken,
  });

export const getSession = (sessionId) => api.get(`/sessions/${sessionId}`);
export const listSessions = (setId) =>
  api.get('/sessions', { params: setId ? { set_id: setId } : {} });

// ── Polling Helper ───────────────────────────────────────────────────────────

/**
 * Poll an endpoint until a condition is met or timeout.
 */
export const pollUntil = async (fetchFn, conditionFn, { interval = 2000, timeout = 300000 } = {}) => {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const result = await fetchFn();
    if (conditionFn(result)) return result;
    await new Promise((r) => setTimeout(r, interval));
  }
  
  throw new Error('Polling timed out');
};
