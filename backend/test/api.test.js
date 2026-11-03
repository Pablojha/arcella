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

async function call(method, url, { token, body, form, status = [200, 201], headers: extra = {} } = {}) {
  const headers = { ...extra, ...(token && { Authorization: `Bearer ${token}` }) };
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
  assert.deepEqual(user.memberships.map((entry) => [entry.college.short, entry.role, entry.batch, entry.verified, entry.primary]), [['IIT Roorkee', 'student', 2022, true, true]]);
  await call('POST', '/verification/email/send', { token: tokenOf('asha'), body: { college: iitr._id, role: 'student', batch: 2022, email: 'asha.k@ar.iitr.ac.in' }, status: 400 });
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

test('group chats take GIFs, photos, voice notes and reactions, live like direct messages', async () => {
  const { asha, bilal, chitra, iitr } = people;
  const chat = `/colleges/${iitr._id}/chat`;
  const [ashaLive, bilalLive, chitraLive] = await Promise.all([socketOf('asha'), socketOf('bilal'), socketOf('chitra')]);
  assert.deepEqual(await Promise.all([ashaLive, bilalLive, chitraLive].map((socket) => socket.emitWithAck('group:join', { college: iitr._id }))), [true, true, false]);

  const announced = next(ashaLive, 'group:new');
  const gif = await call('POST', chat, { token: bilal.token, body: { gif: { url: 'https://media2.giphy.com/media/abc/200w.webp', width: 200, height: 150 } } });
  assert.deepEqual(await announced, { college: iitr._id, _id: gif._id });
  await call('POST', chat, { token: bilal.token, body: {}, status: 400 });
  const photo = await call('POST', `${chat}/attachments`, { token: asha.token, form: { kind: 'image', width: 800, height: 600, file: file('model.png', 'image/png') } });
  assert.match(photo.media.url, /^\/uploads\/groups\/.+\.png$/);
  const voice = await call('POST', `${chat}/attachments`, { token: bilal.token, form: { kind: 'voice', duration: 2.5, waveform: '[0.2,0.9]', file: new File([Buffer.from('audio')], 'voice.webm', { type: 'audio/webm' }) } });
  assert.deepEqual(voice.voice.waveform, [0.2, 0.9]);
  await call('POST', `${chat}/attachments`, { token: chitra.token, form: { kind: 'image', width: 10, height: 10, file: file('x.png', 'image/png') }, status: 403 });

  const typing = next(ashaLive, 'group:typing');
  bilalLive.emit('group:typing', { college: iitr._id, typing: true });
  const typed = await typing;
  assert.deepEqual([typed.college, typed.user.name, typed.typing], [iitr._id, 'Bilal Khan', true]);

  const reaction = `${chat}/${photo._id}/reaction`;
  const updated = next(ashaLive, 'group:update');
  const { reactions } = await call('PUT', reaction, { token: bilal.token, body: { emoji: '🔥' } });
  assert.deepEqual(reactions.map((item) => [item.user.name, item.emoji]), [['Bilal Khan', '🔥']]);
  assert.equal((await updated).reactions[0].emoji, '🔥');
  assert.deepEqual((await call('PUT', reaction, { token: bilal.token, body: { emoji: '🔥' } })).reactions, []);
  await call('PUT', reaction, { token: chitra.token, body: { emoji: '🔥' }, status: 403 });
  const kinds = (await call('GET', chat, { token: asha.token })).items.map((message) => Object.keys(message).find((key) => ['gif', 'media', 'voice'].includes(key)));
  assert.deepEqual(kinds.slice(-3), ['gif', 'media', 'voice']);

  const removed = next(bilalLive, 'group:remove');
  await call('DELETE', `${chat}/${photo._id}`, { token: asha.token });
  assert.equal((await removed)._id, photo._id);
  [ashaLive, bilalLive, chitraLive].forEach((socket) => socket.disconnect());
});

test('lets members list several colleges and verify each one to join its group', async () => {
  const { asha, bilal, iitr } = people;
  const [spa] = (await call('GET', `/colleges?q=${encodeURIComponent('SPA Delhi')}`, { token: bilal.token })).items;
  const added = await call('POST', '/users/me/memberships', { token: bilal.token, body: { college: spa._id, role: 'student', level: 'postgraduate', degree: 'M.Arch', batch: 2026, graduation: 2028 } });
  const entry = added.user.memberships.find((item) => item._id === added.membership);
  assert.deepEqual([entry.college.name, entry.verified, added.user.college._id], [spa.name, false, iitr._id]);
  await call('POST', '/users/me/memberships', { token: bilal.token, body: { college: spa._id, role: 'alumni', level: 'postgraduate', batch: 2020 }, status: 409 });
  await call('POST', '/users/me/memberships', { token: bilal.token, body: { college: spa._id, role: 'student', batch: 2026 }, status: 400 });
  await call('GET', `/colleges/${spa._id}/chat`, { token: bilal.token, status: 403 });

  const sent = await call('POST', '/verification/email/send', { token: bilal.token, body: { college: spa._id, role: 'student', level: 'postgraduate', degree: 'M.Arch', batch: 2026, email: 'bilal@spa.ac.in' } });
  const { user } = await call('POST', '/verification/email/confirm', { token: bilal.token, body: { code: sent.devCode } });
  assert.deepEqual(
    user.memberships.map((item) => [item.college.short, item.level ?? null, item.degree, item.verified, item.primary]),
    [['IIT Roorkee', null, undefined, true, true], ['SPA Delhi', 'postgraduate', 'M.Arch', true, false]],
  );
  await call('GET', `/colleges/${spa._id}/chat`, { token: bilal.token });
  await call('GET', `/colleges/${iitr._id}/chat`, { token: bilal.token });
  const { groups } = await call('GET', `/colleges/${spa._id}/members`, { token: bilal.token });
  assert.deepEqual(groups.map((group) => [group.title, group.members.map((member) => [member.name, member.level, member.degree])]), [['Batch 2026', [['Bilal Khan', 'postgraduate', 'M.Arch']]]]);
  await call('POST', '/verification/email/send', { token: bilal.token, body: { college: spa._id, role: 'student', level: 'postgraduate', batch: 2026, email: 'bilal@spa.ac.in' }, status: 400 });

  const start = new Date(Date.now() + 86_400_000).toISOString();
  const event = await call('POST', '/events', { token: bilal.token, form: { title: 'M.Arch jury', type: 'jury', start, venue: 'Studio 4', collegeOnly: 'true', college: spa._id } });
  assert.equal(event.college, spa._id);
  await call('GET', `/events/${event._id}`, { token: asha.token, status: 403 });
  await call('POST', '/events', { token: asha.token, form: { title: 'Not mine', type: 'jury', start, venue: 'Hall', collegeOnly: 'true', college: spa._id }, status: 403 });

  const spaEntry = user.memberships.find((item) => item.college._id === spa._id);
  await call('PUT', `/users/me/memberships/${spaEntry._id}`, { token: bilal.token, body: { role: 'student', level: 'postgraduate', batch: 2025 }, status: 400 });
  const edited = await call('PUT', `/users/me/memberships/${spaEntry._id}`, { token: bilal.token, body: { role: 'alumni', level: 'postgraduate', degree: 'M.Arch (Urban Design)', batch: 2026, graduation: 2028 } });
  assert.equal(edited.user.memberships.find((item) => item._id === spaEntry._id).degree, 'M.Arch (Urban Design)');
  const switched = await call('POST', `/users/me/memberships/${spaEntry._id}/primary`, { token: bilal.token });
  assert.deepEqual([switched.user.college._id, switched.user.batch, switched.user.type], [spa._id, 2026, 'alumni']);

  const left = await call('DELETE', `/users/me/memberships/${spaEntry._id}`, { token: bilal.token });
  assert.deepEqual([left.user.college._id, left.user.memberships.length, left.user.type], [iitr._id, 1, 'student']);
  await call('GET', `/colleges/${spa._id}/chat`, { token: bilal.token, status: 403 });
  assert.equal((await call('GET', `/colleges/${iitr._id}`, { token: bilal.token })).moderator, true);
});

test('gives members verified before several colleges were allowed a membership for their college', async () => {
  const { default: User } = await import('../src/models/User.js');
  const { migrateMemberships } = await import('../src/services/membership.js');
  const legacy = await User.create({ name: 'Early Member', email: 'early@test.arcella', password: 'password123', college: people.iitr._id, collegeRole: 'alumni', batch: 2015, verified: true });
  assert.equal(await migrateMemberships(), 1);
  assert.equal(await migrateMemberships(), 0);
  const [entry] = (await User.findById(legacy._id).lean()).memberships;
  assert.deepEqual([String(entry.college), entry.role, entry.batch, entry.verified, entry.primary, Boolean(entry._id)], [people.iitr._id, 'alumni', 2015, true, true, true]);
  await User.deleteOne({ _id: legacy._id });
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

test('takes job applications with a private resume through a hiring pipeline', async () => {
  const { asha, bilal, chitra } = people;
  const firm = await call('POST', '/firms', { token: bilal.token, form: { name: 'Pipeline Studio', city: 'Pune' } });
  // "I work here" is self-declared, so it doesn't let anyone post roles in the firm's name.
  await call('POST', `/firms/${firm._id}/work`, { token: asha.token });
  await call('POST', '/jobs', { token: asha.token, body: { title: 'Fake role', type: 'internship', firm: firm._id }, status: 403 });
  assert.equal((await call('GET', '/firms?mine=true', { token: asha.token })).items.length, 0);

  const job = await call('POST', '/jobs', { token: bilal.token, body: { title: 'Design intern', type: 'internship', firm: firm._id, workplace: 'hybrid', experience: 'fresher' } });
  assert.equal(job.company, 'Pipeline Studio');
  assert.equal(job.remote, false);
  assert.ok((await call('GET', '/jobs?workplace=hybrid&experience=fresher', { token: asha.token })).items.some((item) => item._id === job._id));
  assert.ok(!(await call('GET', '/jobs?workplace=remote', { token: asha.token })).items.some((item) => item._id === job._id));

  assert.equal((await call('POST', `/jobs/${job._id}/save`, { token: asha.token })).saved, true);
  assert.equal((await call('GET', `/jobs/${job._id}`, { token: asha.token })).saved, true);
  assert.deepEqual((await call('GET', '/jobs?saved=true', { token: asha.token })).items.map((item) => item._id), [job._id]);

  await call('POST', `/jobs/${job._id}/applications`, { token: asha.token, form: { note: 'Hello' }, status: 400 });
  await call('POST', `/jobs/${job._id}/applications`, { token: asha.token, form: { resume: file('cv.exe', 'application/octet-stream') }, status: 400 });
  const application = await call('POST', `/jobs/${job._id}/applications`, { token: asha.token, form: { note: 'I love section drawings', resume: file('asha-cv.pdf', 'application/pdf') } });
  assert.equal(application.status, 'applied');
  assert.equal('data' in application.resume, false);
  await call('POST', `/jobs/${job._id}/applications`, { token: asha.token, form: { resume: file('asha-cv.pdf', 'application/pdf') }, status: 409 });
  await call('POST', `/jobs/${job._id}/applications`, { token: bilal.token, form: { resume: file('cv.pdf', 'application/pdf') }, status: 400 });
  assert.ok((await call('GET', '/notifications', { token: bilal.token })).items.some((note) => note.type === 'application' && note.link === `/jobs/${job._id}/applicants`));

  // Only the people hiring see applicants and the resume; the applicant sees their own.
  await call('GET', `/jobs/${job._id}/applications`, { token: asha.token, status: 403 });
  const pipeline = await call('GET', `/jobs/${job._id}/applications`, { token: bilal.token });
  assert.equal(pipeline.items[0].applicant.name, 'Asha Rao');
  assert.equal(pipeline.counts.applied, 1);
  await call('GET', `/jobs/applications/${application._id}/resume`, { token: chitra.token, status: 403 });
  const resume = await call('GET', `/jobs/applications/${application._id}/resume`, { token: bilal.token });
  assert.ok(resume.toString().startsWith('%PDF'));
  await call('GET', `/jobs/applications/${application._id}/resume`, { token: asha.token });

  await call('PATCH', `/jobs/applications/${application._id}`, { token: asha.token, body: { status: 'offered' }, status: 403 });
  await call('PATCH', `/jobs/applications/${application._id}`, { token: bilal.token, body: { status: 'interview' }, status: 400 });
  await call('PATCH', `/jobs/applications/${application._id}`, { token: bilal.token, body: { status: 'interview', interviewAt: '2030-01-15T10:30:00.000Z', interviewNote: 'Bring your portfolio' } });
  const mine = await call('GET', '/jobs/applications', { token: asha.token });
  assert.equal(mine.items[0].status, 'interview');
  assert.equal(mine.items[0].job.title, 'Design intern');
  assert.deepEqual(mine.items[0].history.map((step) => step.status), ['applied', 'interview']);
  assert.ok((await call('GET', '/notifications', { token: asha.token })).items.some((note) => note.type === 'application_status' && /Interview scheduled/.test(note.text)));

  await call('POST', `/jobs/applications/${application._id}/withdraw`, { token: asha.token });
  await call('PATCH', `/jobs/applications/${application._id}`, { token: bilal.token, body: { status: 'shortlisted' }, status: 409 });
  assert.equal((await call('GET', `/jobs/${job._id}`, { token: bilal.token })).applicationsCount, 0);

  // Editing and closing: only the people hiring; a closed role takes no applications.
  await call('PATCH', `/jobs/${job._id}`, { token: asha.token, body: { closed: true }, status: 403 });
  await call('PATCH', `/jobs/${job._id}`, { token: bilal.token, body: { closed: true, workplace: 'remote' } });
  const closed = await call('GET', `/jobs/${job._id}`, { token: asha.token });
  assert.equal(closed.remote, true);
  await call('POST', `/jobs/${job._id}/applications`, { token: asha.token, form: { resume: file('asha-cv.pdf', 'application/pdf') }, status: 404 });
  assert.ok((await call('GET', '/jobs?hiring=true', { token: bilal.token })).items.some((item) => item._id === job._id));

  const external = await call('POST', '/jobs', { token: chitra.token, body: { title: 'Site architect', type: 'full-time', company: 'Elsewhere', applyLink: 'jobs@elsewhere.in' } });
  await call('POST', `/jobs/${external._id}/applications`, { token: asha.token, form: { resume: file('asha-cv.pdf', 'application/pdf') }, status: 400 });

  await call('DELETE', `/jobs/${job._id}`, { token: bilal.token });
  assert.equal((await call('GET', '/jobs/applications', { token: asha.token })).items.length, 0);
});

test('lists signed-in devices, signs them out one by one or all at once, and alerts on new ones', async () => {
  const first = await join('devon', 'Devon Shah', 'student');
  const login = (agent) => call('POST', '/auth/login', { body: { email: 'devon@test.arcella', password: 'password123' }, headers: { 'User-Agent': agent } });
  const tablet = await login('Mozilla/5.0 (iPad) Safari/605');
  const alerts = (await call('GET', '/notifications', { token: tablet.token })).items.filter((note) => note.type === 'new_login');
  assert.equal(alerts.length, 1);
  const laptop = await login('Mozilla/5.0 (iPad) Safari/605');
  assert.equal((await call('GET', '/notifications', { token: laptop.token })).items.filter((note) => note.type === 'new_login').length, 1, 'a known device is not new');

  const { items } = await call('GET', '/auth/devices', { token: tablet.token });
  assert.equal(items.length, 3);
  assert.equal(items.filter((device) => device.current).length, 1);
  const firstDevice = items.find((device) => !device.current && device.agent === 'node');
  await call('DELETE', `/auth/devices/${firstDevice._id}`, { token: tablet.token });
  await call('GET', '/auth/me', { token: first.token, status: 401 });

  // Tokens from before devices existed are signed out by "sign out other devices" too.
  const { default: jwt } = await import('jsonwebtoken');
  const legacy = jwt.sign({ id: first.user._id }, 'dev-only-secret', { algorithm: 'HS256', expiresIn: '1d' });
  await call('GET', '/auth/me', { token: legacy });
  const kept = await call('POST', '/auth/devices/sign-out-others', { token: tablet.token });
  await Promise.all([legacy, laptop.token].map((token) => call('GET', '/auth/me', { token, status: 401 })));
  await call('GET', '/auth/me', { token: kept.token });
  assert.equal((await call('GET', '/auth/devices', { token: kept.token })).items.length, 1);

  await call('POST', '/auth/logout', { token: kept.token });
  await call('GET', '/auth/me', { token: kept.token, status: 401 });
});

test('locks an account after repeated wrong passwords and shows the attempts in its history', async () => {
  const { token } = await join('locky', 'Lakshmi Iyer', 'student');
  for (let attempt = 0; attempt < 5; attempt += 1) await call('POST', '/auth/login', { body: { email: 'locky@test.arcella', password: 'wrong-password' }, status: 401 });
  const locked = await call('POST', '/auth/login', { body: { email: 'locky@test.arcella', password: 'password123' }, status: 429 });
  assert.match(locked.message, /Too many failed sign-ins/);
  const { items } = await call('GET', '/auth/history', { token });
  assert.deepEqual(items.slice(0, 2).map((event) => event.reason), ['locked', 'password']);
  assert.equal(items.at(-1).ok, true);
  await call('GET', '/auth/history', { status: 401 });
});

test('turns on two-factor sign-in with an authenticator app and one-time recovery codes', async () => {
  const { _codeAt } = await import('../src/services/totp.js');
  const step = () => Math.floor(Date.now() / 30_000);
  const { token } = await join('tara', 'Tara Bose', 'student');
  const { secret, url } = await call('POST', '/auth/2fa/setup', { token });
  assert.match(url, /^otpauth:\/\/totp\/Arcella%3Atara%40test\.arcella\?secret=/);
  await call('POST', '/auth/2fa/enable', { token, body: { code: _codeAt(secret, step() + 5) }, status: 400 });
  const enableCode = _codeAt(secret, step());
  const { recoveryCodes } = await call('POST', '/auth/2fa/enable', { token, body: { code: enableCode } });
  assert.equal(recoveryCodes.length, 8);
  const me = await call('GET', '/auth/me', { token });
  assert.equal(me.user.twoFactor.enabled, true);
  assert.ok(!JSON.stringify(me).includes(secret), 'the secret never leaves the server again');

  const credentials = { email: 'tara@test.arcella', password: 'password123' };
  const pending = await call('POST', '/auth/login', { body: credentials });
  assert.equal(pending.twoFactor, true);
  assert.equal('token' in pending, false);
  await call('POST', '/auth/2fa/login', { body: { ticket: pending.ticket, code: enableCode }, status: 401 });
  const session = await call('POST', '/auth/2fa/login', { body: { ticket: pending.ticket, code: _codeAt(secret, step() + 1) } });
  assert.ok(session.token);
  // A ticket is only good for the second step, never as a session.
  await call('GET', '/auth/me', { token: pending.ticket, status: 401 });

  const again = await call('POST', '/auth/login', { body: credentials });
  await call('POST', '/auth/2fa/login', { body: { ticket: again.ticket, code: recoveryCodes[0].toUpperCase() } });
  await call('POST', '/auth/2fa/login', { body: { ticket: again.ticket, code: recoveryCodes[0] }, status: 401 });

  await call('POST', '/auth/2fa/disable', { token, body: { password: 'nope-nope', code: recoveryCodes[1] }, status: 400 });
  await call('POST', '/auth/2fa/disable', { token, body: { password: 'password123', code: recoveryCodes[1] } });
  assert.ok((await call('POST', '/auth/login', { body: credentials })).token);
});

test('gives staff roles only the permissions they carry, suspends and bans accounts, and logs every action', async () => {
  const { admin, asha, bilal } = people;
  const sam = await join('sam', 'Sam Paul', 'student');
  const me = (token) => call('GET', '/auth/me', { token }).then((data) => data.user);
  assert.equal((await me(admin.token)).role, 'super_admin');
  assert.deepEqual((await me(sam.token)).permissions, []);
  await call('GET', '/admin/stats', { token: sam.token, status: 403 });

  // Support reads; it can't moderate, see the audit log or hand out roles.
  await call('PATCH', `/admin/users/${bilal.user._id}/role`, { token: admin.token, body: { role: 'support' } });
  await call('GET', '/admin/stats', { token: bilal.token });
  await call('GET', '/admin/users', { token: bilal.token });
  await call('GET', '/admin/audit', { token: bilal.token, status: 403 });
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: bilal.token, body: { status: 'suspended', days: 1, reason: 'spam' }, status: 403 });
  await call('PATCH', `/admin/users/${bilal.user._id}/role`, { token: bilal.token, body: { role: 'super_admin' }, status: 403 });
  await call('PATCH', `/admin/users/${admin.user._id}/role`, { token: admin.token, body: { role: 'user' }, status: 400 });
  await call('PATCH', `/admin/users/${sam.user._id}/role`, { token: admin.token, body: { role: 'emperor' }, status: 400 });

  // A moderator suspends; the member is signed out and told why. Banning and outranked staff are off limits.
  await call('PATCH', `/admin/users/${asha.user._id}/role`, { token: admin.token, body: { role: 'moderator' } });
  assert.ok((await me(asha.token)).permissions.includes('users:suspend'));
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: asha.token, body: { status: 'suspended', reason: 'spam' }, status: 400 });
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: asha.token, body: { status: 'suspended', days: 3, reason: 'Posting spam links' } });
  const signedOut = await call('GET', '/auth/me', { token: sam.token, status: 401 });
  assert.match(signedOut.message, /suspended until/);
  const refused = await call('POST', '/auth/login', { body: { email: 'sam@test.arcella', password: 'password123' }, status: 403 });
  assert.match(refused.message, /Posting spam links/);
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: asha.token, body: { status: 'banned', reason: 'spam' }, status: 403 });
  await call('POST', `/admin/users/${admin.user._id}/status`, { token: asha.token, body: { status: 'suspended', days: 1, reason: 'no' }, status: 403 });
  const listed = await call('GET', '/admin/users?status=suspended', { token: asha.token });
  assert.deepEqual(listed.items.map((item) => item.name), ['Sam Paul']);

  // Admins ban and restore; a restored member signs in again.
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: admin.token, body: { status: 'banned', reason: 'Repeated spam' } });
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: asha.token, body: { status: 'active' }, status: 403 });
  await call('POST', `/admin/users/${sam.user._id}/status`, { token: admin.token, body: { status: 'active' } });
  // Suspending signed Sam out everywhere, so he signs in again.
  const { token: samToken } = await call('POST', '/auth/login', { body: { email: 'sam@test.arcella', password: 'password123' } });

  // Job and firm moderation.
  const job = await call('POST', '/jobs', { token: samToken, body: { title: 'Too good to be true', type: 'freelance', company: 'Scam Co' } });
  await call('DELETE', `/admin/jobs/${job._id}`, { token: bilal.token, body: { reason: 'Fraud' }, status: 403 });
  await call('DELETE', `/admin/jobs/${job._id}`, { token: asha.token, body: { reason: 'Asks for a fee' } });
  assert.ok((await call('GET', '/notifications', { token: samToken })).items.some((note) => note.type === 'job_removed' && /Asks for a fee/.test(note.text)));
  const firm = await call('POST', '/firms', { token: samToken, form: { name: 'Badge Studio' } });
  await call('PATCH', `/admin/firms/${firm._id}`, { token: asha.token, body: { verified: true }, status: 403 });
  await call('PATCH', `/admin/firms/${firm._id}`, { token: admin.token, body: { verified: true } });
  assert.equal((await call('GET', `/firms/${firm.slug}`, { token: samToken })).verified, true);

  const stats = await call('GET', '/admin/stats', { token: admin.token });
  assert.equal(stats.growth.length, 12);
  assert.ok(stats.joined7 >= 1 && stats.growth.at(-1) >= 1 && stats.applications >= 0);

  const { items } = await call('GET', '/admin/audit', { token: admin.token });
  const actions = items.map((entry) => entry.action);
  for (const action of ['user.role', 'user.suspend', 'user.ban', 'user.restore', 'job.remove', 'firm.verify']) assert.ok(actions.includes(action), action);
  assert.equal(items.find((entry) => entry.action === 'user.suspend').actor.name, 'Asha Rao');

  for (const key of ['asha', 'bilal']) await call('PATCH', `/admin/users/${people[key].user._id}/role`, { token: admin.token, body: { role: 'user' } });
  await call('GET', '/admin/stats', { token: asha.token, status: 403 });
});

test('edits posts, links #hashtags and @mentions, follows members and respects notification settings', async () => {
  const [ana, ben] = await Promise.all([join('ana', 'Ana Das', 'student'), join('ben', 'Ben Roy', 'student')]);
  const notes = async (token, type) => (await call('GET', '/notifications', { token })).items.filter((note) => note.type === type);

  // Hashtags and mentions are read from the text; mentioned members are told, an email address isn't a mention.
  const post = await call('POST', '/posts', { token: ana.token, form: { text: `Jury day #Thesis #thesis with @${ben.user.username}, mail me at ana@studio.in` } });
  assert.deepEqual(post.mentions.map((user) => user.username), [ben.user.username]);
  assert.equal((await notes(ben.token, 'mention')).length, 1);
  assert.deepEqual((await call('GET', '/posts?tag=THESIS', { token: ben.token })).items.map((item) => item._id), [post._id]);
  await call('GET', '/posts?tag=%3Cscript%3E', { token: ben.token, status: 400 });

  // Only the author edits; re-mentioning someone doesn't notify them twice.
  await call('PATCH', `/posts/${post._id}`, { token: ben.token, body: { text: 'hijacked' }, status: 403 });
  const edited = await call('PATCH', `/posts/${post._id}`, { token: ana.token, body: { text: `Jury day #crits with @${ben.user.username} and @${people.asha.user.username}` } });
  assert.ok(edited.editedAt);
  assert.equal((await call('GET', '/posts?tag=thesis', { token: ben.token })).items.length, 0);
  assert.equal((await call('GET', '/posts?tag=crits', { token: ben.token })).items.length, 1);
  assert.equal((await notes(ben.token, 'mention')).length, 1);
  assert.equal((await notes(people.asha.token, 'mention')).length, 1);
  await call('PATCH', `/posts/${post._id}`, { token: ana.token, body: { text: '' }, status: 400 });

  // Comments can mention too.
  await call('POST', `/posts/${post._id}/comments`, { token: people.asha.token, body: { text: `@${ben.user.username} see this` } });
  assert.equal((await notes(ben.token, 'mention')).length, 2);

  // Following: the followed member is told and their posts join the follower's network feed.
  assert.ok(!(await call('GET', '/posts?scope=network', { token: ben.token })).items.some((item) => item._id === post._id));
  const followed = await call('POST', `/users/${ana.user._id}/follow`, { token: ben.token });
  assert.deepEqual(followed, { following: true, followersCount: 1 });
  assert.equal((await call('GET', `/users/${ana.user.username}`, { token: ben.token })).following, true);
  assert.equal((await notes(ana.token, 'follow')).length, 1);
  assert.ok((await call('GET', '/posts?scope=network', { token: ben.token })).items.some((item) => item._id === post._id));
  await call('POST', `/users/${ben.user._id}/follow`, { token: ben.token, status: 400 });

  // Switched-off groups stop arriving; security notices can't be switched off.
  await call('PUT', '/users/me/notifications', { token: ana.token, body: { off: ['likes', 'network'] } });
  await call('PUT', '/users/me/notifications', { token: ana.token, body: { off: ['security'] }, status: 400 });
  await call('POST', `/posts/${post._id}/like`, { token: ben.token });
  await call('POST', `/users/${ana.user._id}/follow`, { token: ben.token });
  await call('POST', `/users/${ana.user._id}/follow`, { token: ben.token });
  assert.equal((await notes(ana.token, 'like')).length, 0);
  assert.equal((await notes(ana.token, 'follow')).length, 1);
  assert.deepEqual((await call('GET', '/auth/me', { token: ana.token })).user.notificationsOff, ['likes', 'network']);
  assert.equal('notificationsOff' in (await call('GET', `/users/${ana.user.username}`, { token: ben.token })).user, false);

  // Blocking ends follows both ways.
  await call('POST', `/users/${ben.user._id}/block`, { token: ana.token });
  assert.equal((await call('GET', `/users/${ben.user.username}`, { token: ana.token })).user.followersCount, 0);
  await call('POST', `/users/${ana.user._id}/follow`, { token: ben.token, status: 403 });
});

test('sends one message request to strangers, lists it under requests, and lets people unsend and search', async () => {
  const [cara, dev] = await Promise.all([join('cara', 'Cara Sen', 'student'), join('dev', 'Dev Nair', 'student')]);
  const threadOf = (token, other) => call('GET', `/messages/${other}`, { token });

  // A stranger may send one request; more waits for a reply.
  assert.equal((await threadOf(cara.token, dev.user._id)).canMessage, 'request');
  const first = await call('POST', `/messages/${dev.user._id}`, { token: cara.token, body: { text: 'Loved your thesis model, could we talk?' } });
  assert.equal(first.request, true);
  assert.equal((await threadOf(cara.token, dev.user._id)).canMessage, 'pending');
  const waiting = await call('POST', `/messages/${dev.user._id}`, { token: cara.token, body: { text: 'Hello?' }, status: 403 });
  assert.match(waiting.message, /waiting for a reply/);

  // Dev sees it under requests, not chats; replying accepts it.
  const ids = (list) => list.items.map((item) => item.user._id);
  assert.ok(ids(await call('GET', '/messages?requests=true', { token: dev.token })).includes(cara.user._id));
  assert.ok(!ids(await call('GET', '/messages', { token: dev.token })).includes(cara.user._id));
  assert.ok(ids(await call('GET', '/messages', { token: cara.token })).includes(dev.user._id), 'the sender sees the chat as usual');
  assert.equal((await threadOf(dev.token, cara.user._id)).canMessage, true);
  await call('POST', `/messages/${cara.user._id}`, { token: dev.token, body: { text: 'Sure, studio at 5' } });
  assert.ok(ids(await call('GET', '/messages', { token: dev.token })).includes(cara.user._id));
  assert.equal((await call('GET', '/messages?requests=true', { token: dev.token })).items.length, 0);
  assert.equal((await threadOf(cara.token, dev.user._id)).canMessage, true);

  // Search within the chat, and unsend: only your own messages, gone for both, live.
  const found = await call('GET', `/messages/${dev.user._id}/search?q=THESIS`, { token: cara.token });
  assert.deepEqual(found.items.map((item) => item._id), [first._id]);
  await call('GET', `/messages/${dev.user._id}/search?q=`, { token: cara.token, status: 400 });
  await call('DELETE', `/messages/item/${first._id}`, { token: dev.token, status: 404 });
  const devSocket = await socketOf('dev');
  const removed = next(devSocket, 'message:deleted');
  await call('DELETE', `/messages/item/${first._id}`, { token: cara.token });
  assert.equal((await removed)._id, first._id);
  devSocket.disconnect();
  assert.ok(!(await threadOf(dev.token, cara.user._id)).items.some((item) => item._id === first._id));

  // Blocking still stops everything, requests included.
  const eve = await join('eve', 'Eve Kapoor', 'student');
  await call('POST', `/users/${eve.user._id}/block`, { token: dev.token });
  assert.equal((await threadOf(eve.token, dev.user._id)).canMessage, false);
  await call('POST', `/messages/${dev.user._id}`, { token: eve.token, body: { text: 'hi' }, status: 403 });
});

test('searches people, projects, jobs, firms and questions in one go', async () => {
  const result = await call('GET', '/search?q=bilal', { token: people.asha.token });
  assert.equal(result.people[0].name, 'Bilal Khan');
  assert.deepEqual(Object.keys(result), ['people', 'projects', 'jobs', 'firms', 'questions']);
});

test('exports a member’s own data as a file, without secrets', async () => {
  const post = await call('POST', '/posts', { token: tokenOf('asha'), body: { text: 'Site visit notes' } });
  await call('POST', `/posts/${post._id}/like`, { token: tokenOf('bilal') });
  const res = await fetch(`${base}/users/me/export`, { headers: { Authorization: `Bearer ${tokenOf('asha')}` } });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), /^attachment; filename="arcella-data-.+\.json"$/);
  const raw = await res.text();
  const data = JSON.parse(raw);
  assert.equal(data.account.email, 'asha@test.arcella');
  assert.ok(data.posts.length >= 1 && data.messages.length >= 1);
  assert.ok(data.messages.every((message) => typeof message.from.username === 'string'));
  assert.ok(!raw.includes('"password"') && !raw.includes('$argon2') && !raw.includes('p256dh'), 'no password hashes or push keys');
  // Who liked a post is other people's data: the export carries the count only.
  assert.equal(data.posts.find((item) => item._id === post._id).likes, 1);
  assert.ok(data.posts.every((item) => typeof item.likes === 'number' && typeof item.saves === 'number'));
  assert.deepEqual(data.account.blocked, []);
  await call('GET', '/users/me/export', { status: 401 });
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
