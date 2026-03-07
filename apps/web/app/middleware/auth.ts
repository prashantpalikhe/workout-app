export default defineNuxtRouteMiddleware(async () => {
  const authStore = useAuthStore()
  await authStore.initialize()

  if (!authStore.isAuthenticated) {
    return navigateTo('/login', { replace: true })
  }
})
