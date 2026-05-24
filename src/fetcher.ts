import * as coinbase from './coinbase'
import * as coingecko from './coingecko'
import { LivelineData, Periods } from './types'

/**
 * Fetches historical price data for the given period from the Coinbase API, and falls back
 * to the Coingecko API if the Coinbase API fails or returns no data.
 * @param period The period for which to fetch historical price data.
 * @returns A promise that resolves to the historical price data for the given period.
 */
export const fetchDataForPeriod = async (period: Periods): Promise<LivelineData> => {
  try {
    const data = await coinbase.fetchDataForPeriod(period)
    if (!data || data.length === 0) throw new Error('No data returned from Coinbase API')
    return data
  } catch {
    return await coingecko.fetchDataForPeriod(period)
  }
}
