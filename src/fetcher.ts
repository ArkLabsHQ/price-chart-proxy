import * as coinbase from './coinbase'
import * as coingecko from './coingecko'
import { Fiats, LivelineData, Periods } from './types'

/**
 * Fetches historical price data for the given period from the Coinbase API, and falls back
 * to the Coingecko API if the Coinbase API fails or returns no data.
 * @param period The period for which to fetch historical price data.
 * @param fiat The fiat currency for which to fetch historical price data.
 * @returns A promise that resolves to the historical price data for the given period.
 */
export const fetchDataForPeriod = async (period: Periods, fiat: Fiats): Promise<LivelineData> => {
  try {
    if (!coinbase.isSupportedFiat(fiat)) throw new Error(`Unsupported trading pair: BTC-${fiat}`)
    console.log(`Fetching data for period ${period} and fiat ${fiat} from Coinbase API...`)
    const data = await coinbase.fetchDataForPeriod(period, fiat)
    if (!data || data.length === 0) throw new Error('No data returned from Coinbase API')
    return data
  } catch {
    console.warn(
      `Failed to fetch data from Coinbase API for period ${period} and fiat ${fiat}, falling back to Coingecko API...`,
    )
    return await coingecko.fetchDataForPeriod(period, fiat)
  }
}
