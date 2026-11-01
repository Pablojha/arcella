import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const TOKEN_KEY = 'arcella_token';
const SLOW_MS = 6000;
let lastSlowNotice = 0;

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Free hosting sleeps when idle; tell the user (at most once a minute) when a request is slow. */
function flagSlow() {
  if (Date.now() - lastSlowNotice < 60_000) return;
  lastSlowNotice = Date.now();
  window.dispatchEvent(new Event('api:slow'));
}

function friendlyMessage(error) {
  if (!error.response) {
    return error.code === 'ECONNABORTED'
      ? 'The server is taking too long, it may be waking up. Please try again.'
      : "Can't reach the server. It may be waking up (free hosting sleeps when idle), so try again in a few seconds.";
  }
  const { status, data } = error.response;
  if ([502, 503, 504].includes(status) && !data?.message) return 'The server is waking up. Please try again in a moment.';
  return data?.message || 'Something went wrong. Please try again.';
}

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 70_000 });

api.interceptors.request.use((config) => {
  const value = token.get();
  if (value) config.headers.Authorization = `Bearer ${value}`;
  config.slowTimer = setTimeout(flagSlow, SLOW_MS);
  return config;
});

api.interceptors.response.use(
  (response) => {
    clearTimeout(response.config.slowTimer);
    return response.data;
  },
  (error) => {
    clearTimeout(error.config?.slowTimer);
    if (error.response?.status === 401 && error.config?.headers?.Authorization) window.dispatchEvent(new Event('auth:expired'));
    const friendly = new Error(friendlyMessage(error));
    friendly.status = error.response?.status;
    return Promise.reject(friendly);
  },
);

/** Builds multipart data: files are appended one by one, string lists are comma-joined. */
export function toFormData(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value)) form.append(key, value);
    else if (value.every((item) => item instanceof Blob)) value.forEach((file) => form.append(key, file));
    else form.append(key, value.join(','));
  }
  return form;
}

export default api;
