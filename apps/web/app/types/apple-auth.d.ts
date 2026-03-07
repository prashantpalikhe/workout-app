/** Type declarations for Apple Sign-In JS SDK */
declare namespace AppleID {
  interface AuthI {
    init(config: ClientConfigI): void
    signIn(config?: ClientConfigI): Promise<SignInResponseI>
  }

  interface ClientConfigI {
    clientId: string
    scope?: string
    redirectURI: string
    state?: string
    nonce?: string
    usePopup?: boolean
  }

  interface SignInResponseI {
    authorization: {
      code: string
      id_token: string
      state?: string
    }
    user?: {
      email: string
      name: {
        firstName: string
        lastName: string
      }
    }
  }

  const auth: AuthI
}

interface Window {
  AppleID?: typeof AppleID
}
