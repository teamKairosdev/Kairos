export default defineEventHandler((event) => {
  if (!event.context.user) {
    return { user: null };
  }

  return {
    user: event.context.user,
  };
});
