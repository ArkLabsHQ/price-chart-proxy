import { fetchDataForPeriod } from './fetcher'
import { Env, Fiats, LivelineData, Periods } from './types'

// This file contains functions to interact with the KV storage for caching the fetched data

/**
 * Checks if the cached data for the given period needs to be updated based on the last update timestamp.
 * @param env The environment object containing the KV storage.
 * @param period The period for which to check if the cached data needs to be updated.
 * @param fiat The fiat currency for which to check if the cached data needs to be updated.
 * @returns boolean
 */
export const periodNeedsUpdate = async (env: Env, period: Periods, fiat: Fiats): Promise<boolean> => {
  const msTimestamp = await env.fetch_json_kv.get(lastKey(period, fiat))
  if (!msTimestamp) return true
  const lastUpdated = parseInt(msTimestamp, 10)
  return Date.now() - lastUpdated > getMaxAgeAllowed(period)
}

/**
 * Updates the cached data for the given period by fetching new data
 * from the Coinbase or Coingecko API and storing it in the KV storage.
 * @param env The environment object containing the KV storage.
 * @param period The period for which to check if the cached data needs to be updated.
 * @param fiat The fiat currency for which to check if the cached data needs to be updated.
 * @returns The updated data for the given period.
 */
export const updateDataForPeriod = async (env: Env, period: Periods, fiat: Fiats): Promise<LivelineData> => {
  const data = await fetchDataForPeriod(period, fiat)
  await env.fetch_json_kv.put(dataKey(period, fiat), JSON.stringify(data))
  await env.fetch_json_kv.put(lastKey(period, fiat), Date.now().toString())
  return data
}

/**
 * Retrieves the cached data for the given period from the KV storage.
 * @param env The environment object containing the KV storage.
 * @param period The period for which to retrieve the cached data.
 * @param fiat The fiat currency for which to retrieve the cached data.
 * @returns The cached data for the given period, or null if not found.
 */
export const getDataForPeriod = async (env: Env, period: Periods, fiat: Fiats): Promise<LivelineData | null> => {
  const data = await env.fetch_json_kv.get(dataKey(period, fiat))
  return data ? JSON.parse(data) : null
}

/**
 * Returns the maximum allowed age for updating the cached data based on the period.
 * @param period The period for which to get the maximum age.
 * @returns The maximum age in milliseconds.
 */
const getMaxAgeAllowed = (period: Periods): number => {
  if (period === Periods.oneHour) return 60 * 1000 // 1 minute
  if (period === Periods.oneDay) return 60 * 60 * 1000 // 1 hour
  return 24 * 60 * 60 * 1000 // 24 hours for all other periods
}

// Helper functions to generate the keys for storing data and last update timestamps in the KV storage
const dataKey = (period: Periods, fiat: Fiats) => `data-${period}-${fiat}`
const lastKey = (period: Periods, fiat: Fiats) => `last-${period}-${fiat}`
