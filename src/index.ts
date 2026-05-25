import { Env, Fiats, Periods } from './types'
import { getDataForPeriod, periodNeedsUpdate, updateDataForPeriod } from './kv'

export default {
  async fetch(request, env): Promise<Response> {
    const period = extractPeriodFromRequest(request)
    const fiat = extractFiatFromRequest(request)
    const data =
      (await periodNeedsUpdate(env, period, fiat)) || true
        ? await updateDataForPeriod(env, period, fiat)
        : await getDataForPeriod(env, period, fiat)
    const options = { headers: { 'content-type': 'application/json' } }
    const result = data ?? { error: 'No data available' }
    return new Response(JSON.stringify(result), options)
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
