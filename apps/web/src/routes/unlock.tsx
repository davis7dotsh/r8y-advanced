import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import {
  persistAuthState,
  type SignInWithPasscodePayload,
  signInWithPasscode,
} from '@/features/auth/auth.functions'

export const Route = createFileRoute('/unlock')({
  component: UnlockView,
})

type UnlockDeps = {
  passcode: string
  signIn: typeof signInWithPasscode
  persistCookie: (passcode: string) => void
  navigate: ReturnType<typeof useNavigate>
  onError: (message: string) => void
}

export const submitUnlockAttempt = async ({
  passcode,
  signIn,
  persistCookie,
  navigate,
  onError,
}: UnlockDeps) => {
  const result = (await signIn({
    data: {
      passcode,
    },
  })) as SignInWithPasscodePayload

  if (result.status === 'error') {
    onError(
      result.reason === 'missing_server_passcode'
        ? 'APP_SECRET_PASSCODE is not configured on the server.'
        : 'Wrong passcode. Try again.',
    )
    return false
  }

  persistCookie(passcode)
  await navigate({
    to: '/theo',
    search: {
      page: 1,
      q: undefined,
    },
  })

  return true
}

export function UnlockView() {
  const navigate = useNavigate()
  const [passcode, setPasscode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    const didSucceed = await submitUnlockAttempt({
      passcode,
      signIn: signInWithPasscode,
      persistCookie: persistAuthState,
      navigate,
      onError: setErrorMessage,
    })

    if (!didSucceed) {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-neutral-900">
          Enter passcode
        </h1>
        <p className="mt-1 text-sm text-neutral-500">This app is protected.</p>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Passcode"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-amber-500/30 transition focus:border-amber-500 focus:ring"
            autoFocus
          />

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    </main>
  )
}
