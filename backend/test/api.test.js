// End-to-end API tests: `npm test`. Uses a separate database (MONGODB_TEST_URI, default arcella_test)
// and a temporary upload folder; email and Cloudinary are switched off so nothing leaves the machine.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/arcella_test',
  ADMIN_EMAIL: 'admin@test.arcella,boss@test.arcella',
  AUTH_RATE_LIMIT: '1000',
  CLIENT_URL: 'http://localhost:5173',
  UPLOAD_DIR: await fs.mkdtemp(path.join(os.tmpdir(), 'arcella-uploads-')),
  RESEND_API_KEY: '',
  SMTP_HOST: '',
  CLOUDINARY_CLOUD_NAME: '',
  GIPHY_API_KEY: '',
});
const { default: webpush } = await import('web-push');
const vapid = webpush.generateVAPIDKeys();
Object.assign(process.env, { VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey });

const { default: mongoose } = await import('mongoose');
const { io } = await import('socket.io-client');
const { default: app } = await import('../src/app.js');
const { seedColleges } = await import('../src/seed/colleges.js');
const { startRealtime } = await import('../src/services/realtime.js');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const file = (name, type) => new File([name.endsWith('.pdf') ? Buffer.from('%PDF-1.4\n%%EOF') : PNG], name, { type });
const people = {};
let server;
let base;

async function call(method, url, { token, body, form, status = [200, 201] } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (form) {
    payload = new FormData();
    for (const [key, value] of Object.entries(form)) for (const item of [].concat(value)) payload.append(key, item);
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload });
  const data = (res.headers.get('content-type') || '').includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  assert.ok([].concat(status).includes(res.status), `${method} ${url} → ${res.status} ${JSON.stringify(data.message ?? '')}`);
  return data;
}

/** Signs up and confirms the email with the code (shown as devCode because tests send no email). */
const join = async (key, name, type, email = `${key}@test.arcella`) => {
  const step = await call('POST', '/auth/register', { body: { name, email, password: 'password123', type, acceptTerms: true } });
  people[key] = await call('POST', '/auth/verify-email', { body: { email, code: step.devCode } });
  return people[key];
};
const tokenOf = (key) => people[key].token;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 4000 }).catch(() => {
    throw new Error(`MongoDB is not reachable at ${process.env.MONGODB_URI}. Start it or set MONGODB_TEST_URI.`);
  });
  await mongoose.connection.dropDatabase();
  await seedColleges();
  server = app.listen(0);
  startRealtime(server);
  base = `http://127.0.0.1:${server.address().port}/api`;
});

/** A connected real-time socket for a signed-in member. */
async function socketOf(key) {
  const socket = io(base.replace('/api', ''), { auth: { token: tokenOf(key) }, transports: ['websocket'] });
  await new Promise((resolve, reject) => socket.once('connect', resolve).once('connect_error', reject));
  return socket;
}
const next = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A browser's push subscription (fresh P-256 keys and auth secret) that can read what is pushed to it (RFC 8291). */
function pushDevice(endpoint) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const secret = crypto.randomBytes(16);
  const hkdf = (ikm, salt, info, length) => Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, length));
  const read = (body) => {
    const salt = body.subarray(0, 16);
    const senderKey = body.subarray(21, 21 + body[20]);
    const sealed = body.subarray(21 + body[20]);
    const ikm = hkdf(ecdh.computeSecret(senderKey), secret, Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), senderKey]), 32);
    const decipher = crypto.createDecipheriv('aes-128-gcm', hkdf(ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16), hkdf(ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
    decipher.setAuthTag(sealed.subarray(-16));
    const padded = Buffer.concat([decipher.update(sealed.subarray(0, -16)), decipher.final()]);
    return JSON.parse(padded.subarray(0, padded.lastIndexOf(2)).toString());
  };
  return { subscription: { endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: secret.toString('base64url') } }, read };
}

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

test('confirms new emails with a one-time code before signing in', async () => {
  const step = await call('POST', '/auth/register', { body: { name: 'Dana Iyer', email: 'dana@test.arcella', password: 'password123', type: 'student', acceptTerms: true } });
  assert.equal(step.verify, true);
  assert.equal('token' in step, false);
  const again = await call('POST', '/auth/login', { body: { email: 'dana@test.arcella', password: 'password123' } });
  assert.equal(again.verify, true);
  const wrong = await call('POST', '/auth/verify-email', { body: { email: 'dana@test.arcella', code: '000000' }, status: 400 });
  assert.match(wrong.message, /4 attempts left/);
  await call('POST', '/auth/resend-code', { body: { email: 'dana@test.arcella' }, status: 429 });
  const session = await call('POST', '/auth/verify-email', { body: { email: 'dana@test.arcella', code: step.devCode } });
  assert.equal(session.user.emailVerified, true);
  await call('POST', '/auth/verify-email', { body: { email: 'dana@test.arcella', code: step.devCode }, status: 400 });
  assert.ok((await call('POST', '/auth/login', { body: { email: 'dana@test.arcella', password: 'password123' } })).token);
});

test('registers members, keeps passwords private and grants admin by email', async () => {
  const admin = await join('admin', 'Site Admin', 'faculty', 'admin@test.arcella');
  assert.equal(admin.user.isAdmin, true);
  const asha = await join('asha', 'Asha Rao', 'student');
  await join('bilal', 'Bilal Khan', 'student');
  await join('chitra', 'Chitra Menon', 'alumni');
  assert.equal('password' in asha.user, false);
  const bad = await call('POST', '/auth/register', { body: { name: 'A', email: 'nope', password: '1', type: 'student' }, status: 400 });
  assert.match(bad.message, /Name must be at least 2 characters/);
  const profile = await call('GET', `/users/${asha.user.username}`, { token: tokenOf('bilal') });
  assert.equal('email' in profile.user, false);
});

test('gives admin rights only once the admin email is proven with a code', async () => {
  const users = mongoose.connection.collection('users');
  const details = { name: 'Boss Admin', email: 'boss@test.arcella', password: 'password123', type: 'faculty' };
  const refused = await call('POST', '/auth/register', { body: details, status: 400 });
  assert.equal(refused.message, 'Please accept the Terms of Use and Privacy Policy');
  const step = await call('POST', '/auth/register', { body: { ...details, acceptTerms: true } });
  assert.equal('token' in step, false);
  const stored = await users.findOne({ email: 'boss@test.arcella' });
  assert.deepEqual([stored.isAdmin, stored.termsAcceptedAt instanceof Date], [false, true]);
  const session = await call('POST', '/auth/verify-email', { body: { email: 'boss@test.arcella', code: step.devCode } });
  assert.equal(session.user.isAdmin, true);
});

test('upgrades old bcrypt passwords to Argon2id at sign-in, without signing anyone out', async () => {
  const { default: bcrypt } = await import('bcryptjs');
  const users = mongoose.connection.collection('users');
  assert.match((await users.findOne({ email: 'chitra@test.arcella' })).password, /^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
  await users.updateOne({ email: 'chitra@test.arcella' }, { $set: { password: await bcrypt.hash('password123', 10) } });
  await call('POST', '/auth/login', { body: { email: 'chitra@test.arcella', password: 'not-the-password' }, status: 401 });
  assert.ok((await call('POST', '/auth/login', { body: { email: 'chitra@test.arcella', password: 'password123' } })).token);
  assert.match((await users.findOne({ email: 'chitra@test.arcella' })).password, /^\$argon2id\$/);
  await call('GET', '/auth/me', { token: tokenOf('chitra') });
  assert.ok((await call('POST', '/auth/login', { body: { email: 'chitra@test.arcella', password: 'password123' } })).token);
});

test('connects members and shares posts with likes and comments', async () => {
  await call('POST', `/connections/${people.bilal.user._id}`, { token: tokenOf('asha') });
  assert.equal((await call('POST', `/connections/${people.asha.user._id}/accept`, { token: tokenOf('bilal') })).status, 'connected');
  const post = await call('POST', '/posts', { token: tokenOf('asha'), form: { text: 'First jury done!', images: [file('a.png', 'image/png')], aspect: '0.5' } });
  assert.equal(post.aspect, 0.8);
  const feed = await call('GET', '/posts?scope=network', { token: tokenOf('bilal') });
  assert.equal(feed.items[0]._id, post._id);
  assert.equal('likes' in feed.items[0], false);
  assert.deepEqual(await call('POST', `/posts/${post._id}/like`, { token: tokenOf('bilal') }), { liked: true, likesCount: 1 });
  await call('POST', `/posts/${post._id}/like`, { token: tokenOf('chitra') });
  // "Liked by" names a connection over a more recent stranger, and never the viewer.
  assert.equal((await call('GET', `/posts/${post._id}`, { token: tokenOf('asha') })).likedBy.name, 'Bilal Khan');
  assert.equal((await call('GET', `/posts/${post._id}`, { token: tokenOf('bilal') })).likedBy.name, 'Chitra Menon');
  await call('POST', `/posts/${post._id}/comments`, { token: tokenOf('bilal'), body: { text: 'Congrats!' } });
  await call('DELETE', `/posts/${post._id}`, { token: tokenOf('bilal'), status: 403 });
  people.asha.post = post;
});

test('replies to comments in one-level threads, likes them and deletes a thread at once', async () => {
  const { post } = people.asha;
  const [first] = (await call('GET', `/posts/${post._id}/comments`, { token: tokenOf('asha') })).items;
  const reply = await call('POST', `/posts/${post._id}/comments`, { token: tokenOf('asha'), body: { text: 'Thank you!', parent: first._id } });
  assert.equal(reply.parent, first._id);
  assert.equal(reply.replyTo.name, 'Bilal Khan');
  // A reply to a reply joins the same thread and answers the reply's author.
  const nested = await call('POST', `/posts/${post._id}/comments`, { token: tokenOf('chitra'), body: { text: 'Agreed', parent: reply._id } });
  assert.equal(nested.parent, first._id);
  assert.equal(nested.replyTo.name, 'Asha Rao');
  assert.deepEqual(await call('POST', `/posts/${post._id}/comments/${first._id}/like`, { token: tokenOf('asha') }), { liked: true, likesCount: 1 });
  const listed = (await call('GET', `/posts/${post._id}/comments`, { token: tokenOf('bilal') })).items;
  assert.deepEqual(listed.map((comment) => [comment.text, comment.likesCount, comment.liked]), [['Congrats!', 1, false], ['Thank you!', 0, false], ['Agreed', 0, false]]);
  assert.equal('likes' in listed[0], false);
  const notes = (await call('GET', '/notifications', { token: tokenOf('bilal') })).items.map((note) => note.type);
  assert.ok(notes.includes('reply') && notes.includes('comment_like'));
  assert.equal((await call('GET', `/posts/${post._id}`, { token: tokenOf('asha') })).commentsCount, 3);
  await call('DELETE', `/posts/${post._id}/comments/${first._id}`, { token: tokenOf('chitra'), status: 403 });
  assert.deepEqual(await call('DELETE', `/posts/${post._id}/comments/${first._id}`, { token: tokenOf('bilal') }), { removed: 3 });
  assert.equal((await call('GET', `/posts/${post._id}`, { token: tokenOf('asha') })).commentsCount, 0);
  assert.equal((await call('GET', `/posts/${post._id}/comments`, { token: tokenOf('asha') })).items.length, 0);
});

test('chats with photos, GIFs and voice notes, live and in pages', async () => {
  const { asha, bilal } = people;
  const [ashaLive, bilalLive] = await Promise.all([socketOf('asha'), socketOf('bilal')]);
  const thread = `/messages/${bilal.user._id}`;
  const arrived = next(bilalLive, 'message:new');
  const hello = await call('POST', thread, { token: asha.token, body: { text: 'Hi Bilal 👋' } });
  assert.equal((await arrived)._id, hello._id);
  const typing = next(bilalLive, 'typing');
  ashaLive.emit('typing', { to: bilal.user._id, typing: true });
  assert.deepEqual(await typing, { from: asha.user._id, typing: true });

  await call('POST', thread, { token: asha.token, body: {}, status: 400 });
  await call('POST', thread, { token: asha.token, body: { gif: { url: 'https://example.com/x.gif', width: 200, height: 200 } }, status: 400 });
  const gif = await call('POST', thread, { token: asha.token, body: { gif: { url: 'https://media2.giphy.com/media/abc/200w.webp', width: 200, height: 150 } } });
  assert.deepEqual([gif.gif.width, gif.text], [200, undefined]);
  const photo = await call('POST', `${thread}/attachments`, { token: asha.token, form: { kind: 'image', width: 800, height: 600, file: file('room.png', 'image/png') } });
  assert.match(photo.media.url, /^\/uploads\/messages\/.+\.png$/);
  const voice = await call('POST', `${thread}/attachments`, { token: asha.token, form: { kind: 'voice', duration: 3.2, waveform: '[0.1,0.8,0.4]', file: new File([Buffer.from('audio')], 'voice.webm', { type: 'audio/webm' }) } });
  assert.deepEqual([voice.voice.duration, voice.voice.waveform], [3.2, [0.1, 0.8, 0.4]]);
  await call('POST', `${thread}/attachments`, { token: asha.token, form: { kind: 'video', file: file('clip.png', 'image/png') }, status: 400 });
  assert.equal((await call('GET', '/gifs', { token: asha.token, status: 503 })).message, "GIFs aren't available right now");

  for (let i = 0; i < 30; i += 1) await call('POST', i % 2 ? thread : `/messages/${asha.user._id}`, { token: i % 2 ? asha.token : bilal.token, body: { text: `Line ${i}` } });
  const seen = next(ashaLive, 'message:seen');
  const latest = await call('GET', `/messages/${asha.user._id}`, { token: bilal.token });
  assert.equal((await seen).by, bilal.user._id);
  assert.deepEqual([latest.items.length, latest.hasMore, latest.presence.online], [30, true, true]);
  const older = await call('GET', `/messages/${asha.user._id}?before=${latest.items[0]._id}`, { token: bilal.token });
  assert.deepEqual(older.items.map((message) => message.text ?? Object.keys(message).find((key) => ['gif', 'media', 'voice'].includes(key))), ['Hi Bilal 👋', 'gif', 'media', 'voice']);
  assert.equal(older.hasMore, false);
  ashaLive.disconnect();
  bilalLive.disconnect();
});

test('reacts to messages with one emoji per person, live', async () => {
  const { asha, bilal, chitra } = people;
  const bilalLive = await socketOf('bilal');
  const message = await call('POST', `/messages/${bilal.user._id}`, { token: asha.token, body: { text: 'Jury went well!' } });
  const url = `/messages/reactions/${message._id}`;
  const react = async (key, emoji) => (await call('PUT', url, { token: tokenOf(key), body: { emoji } })).reactions.map((reaction) => [reaction.user, reaction.emoji]);
  const previewFor = async (key, otherKey) => (await call('GET', '/messages', { token: tokenOf(key) })).items.find((item) => item.user._id === people[otherKey].user._id).reaction;
  const update = next(bilalLive, 'message:update');
  assert.deepEqual(await react('bilal', '❤️'), [[bilal.user._id, '❤️']]);
  assert.equal((await update).reactions[0].emoji, '❤️');
  assert.deepEqual(await react('bilal', '😂'), [[bilal.user._id, '😂']]);
  await react('asha', '👍🏽');
  const preview = await previewFor('bilal', 'asha');
  assert.deepEqual([preview.by, preview.emoji, preview.author], [asha.user._id, '👍🏽', asha.user._id]);
  assert.deepEqual(await react('asha', '👍🏽'), [[bilal.user._id, '😂']]);
  assert.equal((await previewFor('asha', 'bilal')).emoji, '😂');
  await call('PUT', url, { token: bilal.token, body: { emoji: 'abc' }, status: 400 });
  await call('PUT', url, { token: chitra.token, body: { emoji: '❤️' }, status: 404 });
  bilalLive.disconnect();
});

test('pins up to three chats and hides chats only for yourself', async () => {
  const { asha, bilal } = people;
  await join('esha', 'Esha Patel', 'student');
  const state = (other, body, status) => call('PATCH', `/messages/${people[other].user._id}/state`, { token: asha.token, body, status });
  const listed = async (query = '') => (await call('GET', `/messages${query}`, { token: asha.token })).items;
  for (const other of ['bilal', 'chitra', 'admin']) assert.equal((await state(other, { pinned: true })).pinned, true);
  assert.equal((await state('esha', { pinned: true }, 400)).message, 'You can pin up to 3 chats. Unpin one to pin this.');
  assert.deepEqual([(await listed())[0].user._id, (await listed())[0].pinned], [bilal.user._id, true]);

  assert.deepEqual(await state('bilal', { hidden: true }), { pinned: false, hidden: true });
  await call('POST', `/messages/${asha.user._id}`, { token: bilal.token, body: { text: 'Still there?' } });
  assert.equal((await listed()).some((item) => item.user._id === bilal.user._id), false);
  assert.deepEqual((await listed('?hidden=1')).map((item) => item.user._id), [bilal.user._id]);
  assert.equal((await call('GET', '/notifications/badges', { token: asha.token })).messages, 0);
  assert.ok((await call('GET', '/messages', { token: bilal.token })).items.some((item) => item.user._id === asha.user._id));

  assert.deepEqual(await state('bilal', { hidden: false, pinned: true }), { pinned: true, hidden: false });
  assert.deepEqual((await call('GET', `/messages/${bilal.user._id}`, { token: asha.token })).chat, { pinned: true, hidden: false });
  for (const other of ['chitra', 'admin']) await state(other, { pinned: false });
});

test('pushes messages and reactions to other devices, never into the chat being read, privately for hidden chats', async () => {
  const { asha, bilal } = people;
  const requests = [];
  let arrived = null;
  const service = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk)).on('end', () => {
      res.writeHead(req.url === '/gone' ? 410 : 201).end();
      requests.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks) });
      if (req.url !== '/gone') arrived?.();
    });
  });
  await new Promise((resolve) => service.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${service.address().port}`;
  const phone = pushDevice(`${origin}/phone`);
  const expectPush = () =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No push arrived')), 3000);
      arrived = () => {
        clearTimeout(timer);
        arrived = null;
        const { headers, body } = requests.at(-1);
        resolve({ headers, alert: phone.read(body) });
      };
    });
  const expectQuiet = async () => {
    const before = requests.length;
    await pause(400);
    assert.equal(requests.length, before, 'expected no push');
  };
  const send = (text) => call('POST', `/messages/${bilal.user._id}`, { token: asha.token, body: { text } });

  assert.equal((await call('GET', '/push/key')).key, vapid.publicKey);
  await call('POST', '/push/subscriptions', { token: bilal.token, body: { endpoint: 'https://evil.example.com/hook', keys: phone.subscription.keys }, status: 400 });
  await call('POST', '/push/subscriptions', { token: bilal.token, body: phone.subscription });
  await call('POST', '/push/subscriptions', { token: bilal.token, body: pushDevice(`${origin}/gone`).subscription });

  // A message: the sender's name and words, grouped per chat, opening that chat; a device the service forgot is dropped.
  let pushed = expectPush();
  await send('Are you coming to the crit?');
  const { headers, alert } = await pushed;
  assert.deepEqual([alert.title, alert.body, alert.url, alert.tag, alert.user.name], ['Asha Rao', 'Are you coming to the crit?', `/messages/${asha.user._id}`, `chat-${asha.user._id}`, 'Asha Rao']);
  assert.ok(alert.badge >= 1);
  assert.deepEqual([headers.ttl, headers.urgency, headers.topic], ['86400', 'high', `chat-${asha.user._id}`]);
  pushed = expectPush();
  await call('POST', `/messages/${bilal.user._id}/attachments`, { token: asha.token, form: { kind: 'image', width: 800, height: 600, file: file('site.png', 'image/png') } });
  assert.equal((await pushed).alert.body, '📷 Sent a photo');
  assert.equal(requests.filter((request) => request.path === '/gone').length, 1);

  // Reading that chat: nothing at all. Elsewhere in the app on the phone: a banner instead of a push. App hidden: a push.
  const bilalLive = await socketOf('bilal');
  const noAlert = () => assert.fail('no banner expected while reading the chat');
  bilalLive.on('message:alert', noAlert);
  await bilalLive.emitWithAck('presence', { visible: true, chat: asha.user._id, endpoint: phone.subscription.endpoint });
  await send('See you there');
  await expectQuiet();
  bilalLive.off('message:alert', noAlert);
  await bilalLive.emitWithAck('presence', { visible: true, chat: null, endpoint: phone.subscription.endpoint });
  const banner = next(bilalLive, 'message:alert');
  await send('Bring the model');
  assert.deepEqual([(await banner).title, (await banner).body], ['Asha Rao', 'Bring the model']);
  await expectQuiet();
  await bilalLive.emitWithAck('presence', { visible: false, chat: asha.user._id, endpoint: phone.subscription.endpoint });
  pushed = expectPush();
  await send('Leaving now');
  assert.equal((await pushed).alert.body, 'Leaving now');

  // Reactions reach the author of the message; nobody is pushed about their own messages.
  const mine = await call('POST', `/messages/${asha.user._id}`, { token: bilal.token, body: { text: 'Ok!' } });
  await expectQuiet();
  pushed = expectPush();
  await call('PUT', `/messages/reactions/${mine._id}`, { token: asha.token, body: { emoji: '🔥' } });
  assert.deepEqual([(await pushed).alert.title, (await pushed).alert.body], ['Asha Rao', 'Asha reacted 🔥 to your message']);

  // A hidden chat only says "New message", and its reactions stay quiet.
  await call('PATCH', `/messages/${asha.user._id}/state`, { token: bilal.token, body: { hidden: true } });
  pushed = expectPush();
  await send('Did you see this?');
  const hidden = (await pushed).alert;
  assert.deepEqual([hidden.title, hidden.body, hidden.user, hidden.icon], ['Arcella', 'New message', undefined, undefined]);
  await call('PUT', `/messages/reactions/${mine._id}`, { token: asha.token, body: { emoji: '😮' } });
  await expectQuiet();
  await call('PATCH', `/messages/${asha.user._id}/state`, { token: bilal.token, body: { hidden: false } });

  // Signing out forgets the device.
  await call('DELETE', '/push/subscriptions', { token: bilal.token, body: { endpoint: phone.subscription.endpoint } });
  await send('Anyone?');
  await expectQuiet();
  bilalLive.disconnect();
  service.close();
});

test('verifies a college by email code with limited attempts', async () => {
  const [iitr] = (await call('GET', '/colleges?q=roorkee', { token: tokenOf('asha') })).items;
  people.iitr = iitr;
  await call('POST', '/verification/email/send', { token: tokenOf('asha'), body: { college: iitr._id, role: 'student', batch: 2022, email: 'asha@gmail.com' }, status: 400 });
  const sent = await call('POST', '/verification/email/send', { token: tokenOf('asha'), body: { college: iitr._id, role: 'student', batch: 2022, email: 'asha@ar.iitr.ac.in' } });
  const wrong = await call('POST', '/verification/email/confirm', { token: tokenOf('asha'), body: { code: '000000' }, status: 400 });
  assert.match(wrong.message, /4 attempts left/);
  const { user } = await call('POST', '/verification/email/confirm', { token: tokenOf('asha'), body: { code: sent.devCode } });
  assert.equal(user.verified, true);
});

test('reviews an uploaded document and deletes it after review', async () => {
  await call('POST', '/verification/document', { token: tokenOf('bilal'), form: { college: people.iitr._id, role: 'student', batch: 2022, docType: 'id_card', document: file('id.pdf', 'application/pdf') } });
  const { items } = await call('GET', '/verification/queue', { token: tokenOf('admin') });
  assert.equal(items.length, 1);
  await call('GET', `/verification/${items[0]._id}/document`, { token: tokenOf('chitra'), status: 403 });
  await call('POST', `/verification/${items[0]._id}/review`, { token: tokenOf('admin'), body: { decision: 'approve' } });
  await call('GET', `/verification/${items[0]._id}/document`, { token: tokenOf('admin'), status: 410 });
  const group = await call('POST', '/posts', { token: tokenOf('bilal'), body: { text: 'Studio swap?', college: people.iitr._id } });
  await call('GET', `/posts/${group._id}`, { token: tokenOf('chitra'), status: 403 });
  people.bilal.group = group;
});

test('posts a video, saves privately and reposts with or without words', async () => {
  const { asha, bilal } = people;
  const video = (name) => new File([Buffer.from('not really a video')], name, { type: 'video/mp4' });
  const clip = await call('POST', '/posts', { token: asha.token, form: { text: 'Model walkthrough', video: video('walk.mp4') } });
  assert.match(clip.video, /^\/uploads\/posts\/.+\.mp4$/);
  await call('POST', '/posts', { token: asha.token, form: { video: file('clip.png', 'image/png') }, status: 400 });
  await call('POST', '/posts', { token: asha.token, form: { images: [file('a.png', 'image/png')], video: video('b.mp4') }, status: 400 });

  assert.deepEqual(await call('POST', `/posts/${clip._id}/save`, { token: bilal.token }), { saved: true });
  const saved = await call('GET', '/posts?saved=1', { token: bilal.token });
  assert.deepEqual(saved.items.map((post) => [post._id, post.saved, 'saves' in post]), [[clip._id, true, false]]);
  assert.equal((await call('GET', `/posts/${clip._id}`, { token: asha.token })).saved, false);

  assert.deepEqual(await call('POST', `/posts/${clip._id}/repost`, { token: bilal.token }), { repostsCount: 1 });
  await call('POST', `/posts/${clip._id}/repost`, { token: bilal.token, status: 409 });
  await call('POST', `/posts/${clip._id}/repost`, { token: bilal.token, body: { text: 'Brilliant detailing' } });
  await call('POST', `/posts/${bilal.group._id}/repost`, { token: bilal.token, status: 400 });
  const [quote, plain] = (await call('GET', `/posts?author=${bilal.user._id}`, { token: asha.token })).items;
  assert.equal(quote.text, 'Brilliant detailing');
  assert.equal(plain.repostOf._id, clip._id);
  assert.equal(plain.repostOf.repostsCount, 2);
  assert.equal((await call('GET', `/posts/${clip._id}`, { token: bilal.token })).reposted, true);
  assert.ok((await call('GET', '/notifications', { token: asha.token })).items.some((note) => note.type === 'repost'));

  assert.deepEqual((await call('GET', '/posts?video=1', { token: bilal.token })).items.map((post) => post._id), [clip._id]);
  assert.deepEqual(await call('DELETE', `/posts/${clip._id}/repost`, { token: bilal.token }), { repostsCount: 1 });
  assert.deepEqual(await call('POST', `/posts/${quote._id}/repost`, { token: bilal.token }), { repostsCount: 2 });
  await call('DELETE', `/posts/${clip._id}`, { token: asha.token });
  const left = (await call('GET', `/posts?author=${bilal.user._id}`, { token: asha.token })).items;
  assert.deepEqual(left.map((post) => [post.text, post.repostOf]), [['Brilliant detailing', null]]);
  assert.deepEqual((await call('GET', '/posts?saved=1', { token: bilal.token })).items, []);
});

test('runs a college with an admin and co-admin, and a group chat for its members', async () => {
  const { asha, bilal, chitra, iitr } = people;
  const roles = `/colleges/${iitr._id}/roles`;
  await call('PATCH', roles, { token: asha.token, body: { role: 'admin', user: asha.user._id }, status: 403 });
  assert.equal((await call('PATCH', roles, { token: tokenOf('admin'), body: { role: 'admin', user: asha.user._id } })).admin._id, asha.user._id);
  await call('PATCH', roles, { token: tokenOf('admin'), body: { role: 'coAdmin', user: chitra.user._id }, status: 400 });
  assert.equal((await call('PATCH', roles, { token: asha.token, body: { role: 'coAdmin', user: bilal.user._id } })).coAdmin._id, bilal.user._id);
  await call('PATCH', roles, { token: bilal.token, body: { role: 'coAdmin', user: null }, status: 403 });
  assert.equal((await call('GET', `/colleges/${iitr._id}`, { token: bilal.token })).moderator, true);
  assert.deepEqual((await call('GET', '/auth/me', { token: asha.token })).user.moderates.map((college) => college._id), [iitr._id]);
  assert.ok((await call('GET', '/notifications', { token: bilal.token })).items.some((note) => note.type === 'college_role'));

  const chat = `/colleges/${iitr._id}/chat`;
  const hello = await call('POST', chat, { token: bilal.token, body: { text: 'Studio at 9?' } });
  const spam = await call('POST', chat, { token: asha.token, body: { text: 'Buy followers now' } });
  await call('GET', chat, { token: chitra.token, status: 403 });
  assert.deepEqual((await call('GET', `${chat}?after=${spam._id}`, { token: bilal.token })).items, []);
  const seen = await call('GET', chat, { token: tokenOf('admin') });
  assert.deepEqual(seen.items.map((message) => message.text), ['Studio at 9?', 'Buy followers now']);
  await call('DELETE', `${chat}/${spam._id}`, { token: chitra.token, status: 403 });
  await call('DELETE', `${chat}/${hello._id}`, { token: asha.token });
  await call('POST', '/reports', { token: bilal.token, body: { type: 'chat', target: spam._id, reason: 'spam' } });
  const report = (await call('GET', '/admin/reports', { token: tokenOf('admin') })).items.find((item) => item.type === 'chat');
  assert.equal(report.content.text, 'Buy followers now');
  await call('POST', `/admin/reports/${report._id}/resolve`, { token: tokenOf('admin'), body: { action: 'remove' } });
  assert.deepEqual((await call('GET', chat, { token: bilal.token })).items, []);
});

test('marks posts Important once a day and notifies the right people', async () => {
  const { asha, bilal, iitr } = people;
  const important = async (key) => (await call('GET', '/notifications', { token: people[key].token })).items.filter((note) => note.type === 'important').length;
  const alert = await call('POST', '/posts', { token: bilal.token, body: { text: 'Jury moved to Friday', important: true } });
  assert.equal(alert.important, true);
  await call('POST', '/posts', { token: bilal.token, body: { text: 'Another alert', important: true }, status: 429 });
  assert.deepEqual([await important('asha'), await important('chitra')], [1, 0]);
  await call('POST', '/posts', { token: tokenOf('admin'), body: { text: 'Maintenance tonight', important: true } });
  assert.deepEqual([await important('asha'), await important('chitra')], [2, 1]);
  for (const text of ['Studio closed today', 'Studio open again']) await call('POST', '/posts', { token: asha.token, body: { text, college: iitr._id, important: true } });
  assert.deepEqual([await important('bilal'), await important('chitra')], [3, 1]);
});

test('resets a forgotten password with a code and signs out older sessions', async () => {
  const email = 'asha@test.arcella';
  const { devCode } = await call('POST', '/auth/forgot', { body: { email } });
  assert.deepEqual(await call('POST', '/auth/forgot', { body: { email: 'nobody@test.arcella' } }), { ok: true });
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const session = await call('POST', '/auth/reset', { body: { email, code: devCode, password: 'newpassword1' } });
  await call('GET', '/auth/me', { token: tokenOf('asha'), status: 401 });
  await call('POST', '/auth/reset', { body: { email, code: devCode, password: 'another12' }, status: 400 });
  people.asha.token = session.token;
  await call('POST', '/auth/login', { body: { email, password: 'newpassword1' } });
});

test('blocks members everywhere and lets people report content', async () => {
  const { asha, chitra } = people;
  assert.deepEqual(await call('POST', `/users/${chitra.user._id}/block`, { token: asha.token }), { blocked: true });
  await call('POST', `/connections/${asha.user._id}`, { token: chitra.token, status: 403 });
  const feed = await call('GET', '/posts', { token: chitra.token });
  assert.equal(feed.items.some((post) => post.author._id === asha.user._id), false);
  await call('GET', `/users/${asha.user.username}`, { token: chitra.token, status: 404 });
  assert.deepEqual(await call('POST', `/users/${chitra.user._id}/block`, { token: asha.token }), { blocked: false });

  await call('POST', '/reports', { token: chitra.token, body: { type: 'post', target: asha.post._id, reason: 'spam' } });
  const reports = await call('GET', '/admin/reports', { token: tokenOf('admin') });
  assert.equal(reports.items[0].content.text, 'First jury done!');
  await call('POST', `/admin/reports/${reports.items[0]._id}/resolve`, { token: tokenOf('admin'), body: { action: 'remove' } });
  await call('GET', `/posts/${asha.post._id}`, { token: asha.token, status: 404 });
});

test('searches people, projects, jobs, firms and questions in one go', async () => {
  const result = await call('GET', '/search?q=bilal', { token: people.asha.token });
  assert.equal(result.people[0].name, 'Bilal Khan');
  assert.deepEqual(Object.keys(result), ['people', 'projects', 'jobs', 'firms', 'questions']);
});

test('deletes an account with everything it created', async () => {
  const { chitra, bilal } = people;
  await call('POST', `/connections/${bilal.user._id}`, { token: chitra.token });
  await call('POST', `/connections/${chitra.user._id}/accept`, { token: bilal.token });
  await call('POST', '/posts', { token: chitra.token, body: { text: 'Goodbye post' } });
  await call('DELETE', '/users/me', { token: chitra.token, body: { password: 'wrong-password' }, status: 400 });
  await call('DELETE', '/users/me', { token: chitra.token, body: { password: 'password123' } });
  await call('GET', '/auth/me', { token: chitra.token, status: 401 });
  const feed = await call('GET', '/posts', { token: bilal.token });
  assert.equal(feed.items.some((post) => post.text === 'Goodbye post'), false);
  assert.equal((await call('GET', '/auth/me', { token: bilal.token })).user.connectionsCount, 1);
});
