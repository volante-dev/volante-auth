'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { OAuthAuthorizationDetails } from '@supabase/auth-js'

type ActionState = 'idle' | 'loading'

function ConsentPageInner() {
  const searchParams = useSearchParams()
  const authorizationId = searchParams.get('authorization_id')

  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null)
  const [pageState, setPageState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [pageError, setPageError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!authorizationId) {
        setPageError('Paramètre authorization_id manquant')
        setPageState('error')
        return
      }

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        redirectToLogin(authorizationId)
        return
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
      if (error) {
        if (error.message === 'Auth session missing!') {
          redirectToLogin(authorizationId)
          return
        }
        setPageError(error.message)
        setPageState('error')
        return
      }

      if ('redirect_url' in data) {
        window.location.href = data.redirect_url
        return
      }

      setDetails(data)
      setPageState('ready')
    }

    init()
  }, [authorizationId])

  async function handleApprove() {
    if (!authorizationId) return
    setActionState('loading')
    setActionError(null)
    const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId, {
      skipBrowserRedirect: true,
    })
    if (error) {
      if (error.message === 'Auth session missing!') {
        redirectToLogin(authorizationId)
        return
      }
      setActionError(error.message)
      setActionState('idle')
      return
    }
    window.location.href = data.redirect_url
  }

  async function handleDeny() {
    if (!authorizationId) return
    setActionState('loading')
    setActionError(null)
    const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, {
      skipBrowserRedirect: true,
    })
    if (error) {
      if (error.message === 'Auth session missing!') {
        redirectToLogin(authorizationId)
        return
      }
      setActionError(error.message)
      setActionState('idle')
      return
    }
    window.location.href = data.redirect_url
  }

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-red-600 text-sm">{pageError}</p>
      </div>
    )
  }

  if (!details) return null

  const scopes = details.scope.split(' ').filter(Boolean)
  const isProcessing = actionState === 'loading'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          Autorisation d&apos;accès
        </h1>

        <p className="text-sm text-gray-700 text-center mb-6">
          <span className="font-bold">{details.client.name}</span>{' '}
          demande l&apos;accès à votre compte.
        </p>

        {scopes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Permissions demandées
            </p>
            <div className="flex flex-wrap gap-2">
              {scopes.map((scope) => (
                <span
                  key={scope}
                  className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>
        )}

        {actionError && (
          <p className="text-sm text-red-600 mb-4">{actionError}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={isProcessing}
            className="w-full rounded-lg bg-gray-900 text-white text-sm font-medium py-2.5 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Chargement…' : 'Autoriser'}
          </button>

          <button
            type="button"
            onClick={handleDeny}
            disabled={isProcessing}
            className="w-full rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium py-2.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  )
}

function redirectToLogin(authorizationId: string) {
  window.location.href =
    '/login?next=' +
    encodeURIComponent('/oauth/consent?authorization_id=' + authorizationId)
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentPageInner />
    </Suspense>
  )
}
