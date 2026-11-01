// End-to-end API tests: `npm test`. Uses a separate database (MONGODB_TEST_URI, default arcella_test)
// and a temporary upload folder; email and Cloudinary are switched off so nothing leaves the machine.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/arcella_test',
  ADMIN_EMAIL: 'admin@test.arcella',
  CLIENT_URL: 'http://localhost:5173',
  UPLOAD_DIR: await fs.mkdtemp(path.join(os.tmpdir(), 'arcella-uploads-')),
  RESEND_API_KEY: '',
  SMTP_HOST: '',
  CLOUDINARY_CLOUD_NAME: '',
});

const { default: mongoose } = await import('mongoose');
const { default: app } = await import('../src/app.js');
const { seedColleges } = await import('../src/seed/colleges.js');

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

const join = async (key, name, type, email = `${key}@test.arcella`) => {
  people[key] = await call('POST', '/auth/register', { body: { name, email, password: 'password123', type } });
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
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
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

test('connects members and shares posts with likes and comments', async () => {
  await call('POST', `/connections/${people.bilal.user._id}`, { token: tokenOf('asha') });
  assert.equal((await call('POST', `/connections/${people.asha.user._id}/accept`, { token: tokenOf('bilal') })).status, 'connected');
  const post = await call('POST', '/posts', { token: tokenOf('asha'), form: { text: 'First jury done!', images: [file('a.png', 'image/png')] } });
  const feed = await call('GET', '/posts?scope=network', { token: tokenOf('bilal') });
  assert.equal(feed.items[0]._id, post._id);
  assert.equal('likes' in feed.items[0], false);
  assert.deepEqual(await call('POST', `/posts/${post._id}/like`, { token: tokenOf('bilal') }), { liked: true, likesCount: 1 });
  await call('POST', `/posts/${post._id}/comments`, { token: tokenOf('bilal'), body: { text: 'Congrats!' } });
  await call('DELETE', `/posts/${post._id}`, { token: tokenOf('bilal'), status: 403 });
  people.asha.post = post;
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
});

test('resets a forgotten password and signs out older sessions', async () => {
  const { devLink } = await call('POST', '/auth/forgot', { body: { email: 'asha@test.arcella' } });
  const token = new URL(devLink).searchParams.get('token');
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const session = await call('POST', '/auth/reset', { body: { token, password: 'newpassword1' } });
  await call('GET', '/auth/me', { token: tokenOf('asha'), status: 401 });
  await call('POST', '/auth/reset', { body: { token, password: 'another12' }, status: 400 });
  people.asha.token = session.token;
  await call('POST', '/auth/login', { body: { email: 'asha@test.arcella', password: 'newpassword1' } });
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
