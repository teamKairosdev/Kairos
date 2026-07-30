import { buildGoogleAuthUrl } from '../../../auth';

export default defineEventHandler((event) => {
  const state = Math.random().toString(36).substring(2);
  setCookie(event, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  const url = buildGoogleAuthUrl(state);
  return sendRedirect(event, url);
});
