import { LivelineData, Periods } from './types'

/**
 * This file contains functions to interact with the Coinbase API to fetch the historical price data for Bitcoin in USD for different periods, and to store it in the KV storage for caching purposes.
 */

// This type represents the structure of the data returned by the Coinbase API for each candle
type CoinbaseCandle = [
  number, // time
  number, // low
  number, // high
  number, // open
  number, // close
  number, // volume
]

// Granularity values in seconds for different time intervals
const Granularities = {
  minute: 60,
  hour: 3600,
  day: 86400,
  sixhours: 21600,
}

// Coinbase API limits
const maxDataPoints = 300
const firstDay = new Date('2015-01-01T00:00:00Z')

/**
 * Generates the URL for fetching historical price data from the Coinbase API.
 * @param start The start date for the data range.
 * @param end The end date for the data range.
 * @param granularity The granularity of the data in seconds.
 * @returns The URL for the Coinbase API request.
 */
const getUrl = (start: Date, end: Date, granularity: number) => {
  const host = 'https://api.exchange.coinbase.com'
  const path = '/products/BTC-USD/candles'
  const params = new URLSearchParams({
    granularity: granularity.toString(),
    start: start.toISOString(),
    end: end.toISOString(),
  })
  return `${host}${path}?${params.toString()}`
}

/**
 *  Fetches historical price data from the Coinbase API for the given period and returns it in a structured format.
 * @param period The period for which to fetch data.
 * @returns A promise that resolves to the historical price data for the given period.
 */
export const fetchDataForPeriod = async (period: Periods): Promise<LivelineData> => {
  switch (period) {
    case Periods.oneHour:
      return await fetchLastHourData()
    case Periods.oneDay:
      return await fetchLastDayData()
    case Periods.oneWeek:
      return await fetchLastWeekData()
    case Periods.oneMonth:
      return await fetchLastMonthData()
    case Periods.oneYear:
      return await fetchLastYearData()
    case Periods.all:
      return await fetchAllData()
    default:
      throw new Error(`Unsupported period: ${period}`)
  }
}

/**
 * Fetches the historical price data for the last hour from the Coinbase API with minute granularity.
 * @returns A promise that resolves to the historical price data for the last hour.
 */
const fetchLastHourData = async (): Promise<LivelineData> => {
  const oneHour = 60 * 60 * 1000
  const granularity = Granularities.minute
  const startTime = new Date(Date.now() - oneHour)
  return await getData(startTime, new Date(), granularity)
}

/**
 * Fetches the historical price data for the last day from the Coinbase API with hour granularity.
 * @returns A promise that resolves to the historical price data for the last day.
 */
const fetchLastDayData = async (): Promise<LivelineData> => {
  const oneDay = 24 * 60 * 60 * 1000
  const granularity = Granularities.hour
  const startTime = new Date(Date.now() - oneDay)
  return await getData(startTime, new Date(), granularity)
}

/**
 * Fetches the historical price data for the last week from the Coinbase API with six-hour granularity.
 * @returns A promise that resolves to the historical price data for the last week.
 */
const fetchLastWeekData = async (): Promise<LivelineData> => {
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const granularity = Granularities.sixhours
  const startTime = new Date(Date.now() - oneWeek)
  return await getData(startTime, new Date(), granularity)
}

/**
 * Fetches the historical price data for the last month from the Coinbase API with daily granularity.
 * @returns A promise that resolves to the historical price data for the last month.
 */
const fetchLastMonthData = async (): Promise<LivelineData> => {
  const granularity = Granularities.day
  const oneMonth = 30 * 24 * 60 * 60 * 1000
  const startTime = new Date(Date.now() - oneMonth)
  return await getData(startTime, new Date(), granularity)
}

/**
 * Fetches the historical price data for the last year from the Coinbase API with daily granularity
 * @returns A promise that resolves to the historical price data for the last year.
 */
const fetchLastYearData = async (): Promise<LivelineData> => {
  const granularity = Granularities.day
  const oneYear = 365 * 24 * 60 * 60 * 1000
  const startTime = new Date(Date.now() - oneYear)
  return await getDataInChunks(startTime, new Date(), granularity)
}

/**
 * Fetches all historical price data from the Coinbase API starting from the first day until now
 * @returns A promise that resolves to the historical price data for all periods.
 */
const fetchAllData = async (): Promise<LivelineData> => {
  const granularity = Granularities.day
  return await getDataInChunks(firstDay, new Date(), granularity)
}

/**
 * Fetches historical price data from the Coinbase API for the given date range and granularity.
 * @param start The start date for the data range.
 * @param end The end date for the data range.
 * @param granularity The granularity of the data in seconds.
 * @returns A promise that resolves to the historical price data for the given date range.
 */
const getData = async (start: Date, end: Date, granularity: number): Promise<LivelineData> => {
  const url = getUrl(start, end, granularity)
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  const coinbaseResponse = await fetch(url, { headers: { 'User-Agent': ua } })
  if (!coinbaseResponse.ok) {
    const body = await coinbaseResponse.text()
    const { status, statusText } = coinbaseResponse
    throw new Error(`Coinbase request failed with ${status} ${statusText}: ${body}`)
  }
  const data: CoinbaseCandle[] = await coinbaseResponse.json()
  return data.map((item: CoinbaseCandle) => ({ date: item[0], value: item[4] }))
}

/**
 * Fetches historical price data from the Coinbase API for the given date range and granularity,
 * handling pagination to respect the API limits.
 * @param start The start date for the data range.
 * @param end The end date for the data range.
 * @param granularity The granularity of the data in seconds.
 * @returns A promise that resolves to the historical price data for the given date range.
 */
const getDataInChunks = async (start: Date, end: Date, granularity: number): Promise<LivelineData> => {
  const data: LivelineData = []
  const endSeconds = Math.floor(end.getTime() / 1000)
  const startSeconds = Math.floor(start.getTime() / 1000)
  const periods = Math.ceil((endSeconds - startSeconds) / granularity)
  const chunks = Math.ceil(periods / maxDataPoints)
  for (let i = 0; i < chunks; i++) {
    const chunkStart = new Date((startSeconds + i * granularity * maxDataPoints) * 1000)
    const chunkEnd = new Date(Math.min(startSeconds + (i + 1) * granularity * maxDataPoints, endSeconds) * 1000)
    const chunkData = await getData(chunkStart, chunkEnd, granularity)
    data.push(...chunkData)
  }
  return data
}
