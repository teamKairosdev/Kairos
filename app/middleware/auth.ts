export default defineNuxtRouteMiddleware((to) => {
  const { state } = useAuth()

  if (!state.authenticated) {
    return navigateTo('/auth/login')
  }
})
