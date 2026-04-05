/**
 * Sets the title shown in the mobile header (see layouts/default.vue).
 *
 * Survives SPA navigation: during route changes Vue may mount the new page
 * before unmounting the old one. We track which component instance "owns"
 * the title and only clear on unmount if no one else has taken over.
 */
let nextId = 0

export function useMobileHeaderTitle(title: Ref<string> | (() => string) | string) {
  const headerTitle = useState<string>('mobile-header-title', () => '')
  const owner = useState<number>('mobile-header-title-owner', () => 0)

  const id = ++nextId

  const resolve = () =>
    typeof title === 'string'
      ? title
      : typeof title === 'function'
        ? title()
        : title.value

  // Claim ownership + set immediately
  owner.value = id
  headerTitle.value = resolve()

  // Re-claim + sync if title becomes reactive
  watchEffect(() => {
    owner.value = id
    headerTitle.value = resolve()
  })

  onBeforeUnmount(() => {
    // Only clear if nobody else has claimed it in the meantime
    if (owner.value === id) {
      headerTitle.value = ''
      owner.value = 0
    }
  })
}
