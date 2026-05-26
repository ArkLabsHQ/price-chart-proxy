import { isValidResetToken } from './utils'
import { Env, Fiats, Periods } from './types'
import { getDataForPeriod, periodNeedsUpdate, resetKVStorage, updateDataForPeriod } from './kv'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

const respondWith = (data: any | null, code: number) => {
  const responseData = data ? JSON.stringify(data) : null
  return new Response(responseData, {
    status: code,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  })
}

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return respondWith(null, 204)
    }

    try {
      // Check for reset token and reset KV storage if valid
      const resetToken = await extractResetTokenFromRequest(request)
      if (resetToken && (await isValidResetToken(resetToken))) {
        await resetKVStorage(env)
        return respondWith({ status: 'KV storage reset successfully' }, 200)
      }
      // Extract period and fiat from the request, check if data needs to be updated, and return data
      const period = extractPeriodFromRequest(request)
      const fiat = extractFiatFromRequest(request)
      const data = (await periodNeedsUpdate(env, period, fiat))
        ? await updateDataForPeriod(env, period, fiat)
        : await getDataForPeriod(env, period, fiat)
      const result = data ?? { error: 'No data available' }
      return respondWith(result, 200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      return respondWith({ error: message }, 500)
    }
  },
} satisfies ExportedHandler<Env>

const extractPeriodFromRequest = (request: Request): Periods => {
  const url = new URL(request.url)
  const period = url.searchParams.get('period')
  return (period as Periods) ?? Periods.oneDay
}

const extractFiatFromRequest = (request: Request): Fiats => {
  const url = new URL(request.url)
  const fiat = url.searchParams.get('fiat')
  return (fiat?.toUpperCase() as Fiats) ?? Fiats.USD
}

const extractResetTokenFromRequest = async (request: Request): Promise<string | null> => {
  const url = new URL(request.url)
  return url.searchParams.get('reset')
}
