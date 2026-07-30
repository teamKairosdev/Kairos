import { getAuth } from '../../auth';

export default defineEventHandler(async (event) => {
  const auth = getAuth();
  if (!auth) {
    throw createError({ statusCode: 500, statusMessage: 'Better Auth가 설정되지 않았습니다.' });
  }

  const url = getRequestURL(event);
  const request = new Request(url, {
    method: event.method,
    headers: getRequestHeaders(event) as Record<string, string>,
    body: ['GET', 'HEAD'].includes(event.method) ? undefined : await readRawBody(event),
  });

  return auth.handler(request);
});
