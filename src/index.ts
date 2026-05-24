import { Env, Periods } from './types'
import { getDataForPeriod, periodNeedsUpdate, updateDataForPeriod } from './kv'

export default {
  async fetch(request, env): Promise<Response> {
    const period = extractPeriodFromRequest(request)
    const data =
      (await periodNeedsUpdate(env, period)) || true
        ? await updateDataForPeriod(env, period)
        : await getDataForPeriod(env, period)
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
