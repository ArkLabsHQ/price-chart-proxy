import { fetchDataForPeriod } from './fetcher'
import { Env, LivelineData, Periods } from './types'

// This file contains functions to interact with the KV storage for caching the fetched data

/**
 * Checks if the cached data for the given period needs to be updated based on the last update timestamp.
 * @param env
 * @param period
 * @returns boolean
 */
export const periodNeedsUpdate = async (env: Env, period: Periods): Promise<boolean> => {
  const msTimestamp = await env.fetch_json_kv.get(`last-${period}`)
  if (!msTimestamp) return true
  const lastUpdated = parseInt(msTimestamp, 10)
  return Date.now() - lastUpdated > getMaxAgeAllowed(period)
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

/**
 * Updates the cached data for the given period by fetching new data
 * from the Coinbase API and storing it in the KV storage.
 * @param env
 * @param period
 * @returns The updated data for the given period.
 */
export const updateDataForPeriod = async (env: Env, period: Periods): Promise<LivelineData> => {
  const data = await fetchDataForPeriod(period)
  await env.fetch_json_kv.put(`data-${period}`, JSON.stringify(data))
  await env.fetch_json_kv.put(`last-${period}`, Date.now().toString())
  return data
}

/**
 * Retrieves the cached data for the given period from the KV storage.
 * @param env The environment object containing the KV storage.
 * @param period The period for which to retrieve the cached data.
 * @returns The cached data for the given period, or null if not found.
 */
export const getDataForPeriod = async (env: Env, period: Periods): Promise<LivelineData | null> => {
  const data = await env.fetch_json_kv.get(`data-${period}`)
  return data ? JSON.parse(data) : null
}
