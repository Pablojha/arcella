export const API = (process.env.E2E_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@e2e.arcella';
export const PASSWORD = 'password123';

export const PUBLIC_PAGES = ['/', '/explore', '/login', '/register', '/reset', '/privacy', '/terms', '/cookies', '/refunds'];
export const MEMBER_PAGES = ['/', '/network', '/college', '/jobs', '/events', '/qa', '/resources', '/messages', '/notifications', '/more', '/settings', '/saved'];

const unique = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function api(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(`${method} ${path}: ${res.status} ${data.message}`), { status: res.status });
  return data;
}

/** A new member with a confirmed email (the test API hands back the one-time code). */
export async function newMember(name = 'Test Member', email = `member.${unique()}@e2e.arcella`) {
  const step = await api('POST', '/auth/register', { body: { name, email, password: PASSWORD, type: 'student', acceptTerms: true } });
  const session = step.token ? step : await api('POST', '/auth/verify-email', { body: { email, code: step.devCode } });
  return { ...session, email };
}

/** The site admin from the API's ADMIN_EMAIL list: created on the first run, signed in on later ones. */
export async function adminMember() {
  try {
    return await newMember('Site Admin', ADMIN_EMAIL);
  } catch (error) {
    if (error.status !== 409) throw error;
    return { ...(await api('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: PASSWORD } })), email: ADMIN_EMAIL };
  }
}

/** Opens pages signed in as `member` (or signed out with null), with the cookie notice answered unless `decided` is false. */
export async function prepare(page, member, { decided = true } = {}) {
  await page.addInitScript(
    ([token, user, chosen]) => {
      sessionStorage.setItem('arcella_splash_seen', '1');
      localStorage.setItem('arcella_install_dismissed', '1');
      if (chosen) localStorage.setItem('arcella_storage_choice', JSON.stringify({ preferences: true }));
      if (token) {
        localStorage.setItem('arcella_token', token);
        localStorage.setItem('arcella_user', JSON.stringify(user));
      }
    },
    [member?.token ?? null, member?.user ?? null, decided],
  );
}

/** Elements that stick out past the right or left edge of the screen (ignoring scrollers, clipped and fixed parts). */
export function sideways() {
  const width = document.documentElement.clientWidth;
  const clipped = (element) => {
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const { overflowX } = getComputedStyle(parent);
      if (overflowX !== 'visible') return true;
    }
    return false;
  };
  return [...document.body.querySelectorAll('*')]
    .filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.right > width + 1 || box.left < -1) && getComputedStyle(element).position !== 'fixed' && !clipped(element);
    })
    .slice(0, 5)
    .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).split(' ').slice(0, 3).join('.')}`);
}
