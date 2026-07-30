export default defineEventHandler((event) => {
  deleteCookie(event, 'kairos_session', { path: '/' });
  return { success: true };
});
