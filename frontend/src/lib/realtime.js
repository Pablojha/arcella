import { io } from 'socket.io-client';
import { API_URL, token } from './api';

/** The app's one real-time connection. App connects it while someone is signed in; it reconnects by itself after drops. */
export const socket = io(API_URL, { autoConnect: false, auth: (send) => send({ token: token.get() }) });
