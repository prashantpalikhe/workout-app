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

/**
 * Registers a back target for the mobile header. When set, the layout swaps
 * the hamburger for a back arrow that calls goBack(fallback).
 */
export function useMobileHeaderBack(fallback: string) {
  const headerBack = useState<string | null>('mobile-header-back', () => null)
  const owner = useState<number>('mobile-header-back-owner', () => 0)

  const id = ++nextId
  owner.value = id
  headerBack.value = fallback

  onBeforeUnmount(() => {
    if (owner.value === id) {
      headerBack.value = null
      owner.value = 0
    }
  })
}

/**
 * Navigates "back": uses the SPA history's previous entry when available
 * (preserves scroll/filter state on the list), otherwise pushes the fallback.
 */
export function goBack(fallback: string) {
  const router = useRouter()
  const back = (typeof window !== 'undefined'
    ? (window.history.state?.back as string | undefined)
    : undefined)
  if (back) router.back()
  else router.push(fallback)
}
