/** Type declarations for Google Identity Services (GIS) SDK */
declare namespace google.accounts.id {
  interface CredentialResponse {
    credential: string
    select_by: string
    clientId?: string
  }

  interface GsiButtonConfiguration {
    type?: 'standard' | 'icon'
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: string | number
    locale?: string
  }

  interface IdConfiguration {
    client_id: string
    callback: (response: CredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    context?: 'signin' | 'signup' | 'use'
    itp_support?: boolean
    login_uri?: string
    nonce?: string
    use_fedcm_for_prompt?: boolean
  }

  function initialize(config: IdConfiguration): void
  function renderButton(parent: HTMLElement, config: GsiButtonConfiguration): void
  function prompt(): void
  function disableAutoSelect(): void
  function revoke(hint: string, callback?: (response: { successful: boolean, error?: string }) => void): void
  function cancel(): void
}

interface Window {
  google?: typeof google
}
