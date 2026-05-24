import { LivelineData, Periods } from './types'
import { ms2secs } from './utils'

/**
 * This file contains functions to interact with the Coingecko API to fetch the historical price data for Bitcoin in USD for different periods, and to store it in the KV storage for caching purposes.
 */

// This type represents the structure of the data returned by the Coingecko API for each candle
type CoingeckoPoint = [
  number, // time
  number, // value
]

type CoingeckoResponse = {
  prices: CoingeckoPoint[]
}

// Granularity values in seconds for different time intervals
enum Granularities {
  fiveMinutes = '5m', // only availabe for enterprise plan
  hourly = 'hourly', // only available for 1 day period
  daily = 'daily', // available for 7, 30 and 365 periods
  max = 'max', // fake granularity to fetch all available data with the free tier
}

/**
 * Generates the URL for fetching historical price data from the Coingecko API.
 * @param start The start date for the data range.
 * @param end The end date for the data range.
 * @param granularity The granularity of the data in seconds.
 * @returns The URL for the Coingecko API request.
 */
const getUrl = (days: number, granularity: Granularities) => {
  const host = 'https://api.coingecko.com'
  const path = '/api/v3/coins/bitcoin/market_chart'
  const params = new URLSearchParams({
    vs_currency: 'usd',
    days: days.toString(),
    ...(granularity !== Granularities.max && { interval: granularity }),
  })
  return `${host}${path}?${params.toString()}`
}

/**
 *  Fetches historical price data from the Coingecko API for the given period and returns it in a structured format.
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
 * Fetches the historical price data for the last hour from the Coingecko API with minute granularity.
 * @returns A promise that resolves to the historical price data for the last hour.
 */
const fetchLastHourData = async (): Promise<LivelineData> => {
  const days = 1
  const oneHour = 60 * 60 * 1000
  const granularity = Granularities.max
  const startTime = new Date(Date.now() - oneHour)
  const data = await getData(days, granularity)
  return data.filter((point) => point.date > startTime.getTime())
}

/**
 * Fetches the historical price data for the last day from the Coingecko API with hour granularity.
 * @returns A promise that resolves to the historical price data for the last day.
 */
const fetchLastDayData = async (): Promise<LivelineData> => {
  const days = 1
  const oneDay = 24 * 60 * 60 * 1000
  const granularity = Granularities.hourly
  const startTime = new Date(Date.now() - oneDay)
  const data = await getData(days, granularity)
  return data.filter((point) => point.date > startTime.getTime())
}

/**
 * Fetches the historical price data for the last week from the Coingecko API with hour granularity.
 * @returns A promise that resolves to the historical price data for the last week.
 */
const fetchLastWeekData = async (): Promise<LivelineData> => {
  const days = 7
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  const granularity = Granularities.hourly
  const startTime = new Date(Date.now() - oneWeek)
  const data = await getData(days, granularity)
  return data.filter((point) => point.date > startTime.getTime())
}

/**
 * Fetches the historical price data for the last month from the Coingecko API with daily granularity.
 * @returns A promise that resolves to the historical price data for the last month.
 */
const fetchLastMonthData = async (): Promise<LivelineData> => {
  const days = 30
  const granularity = Granularities.daily
  const oneMonth = 30 * 24 * 60 * 60 * 1000
  const startTime = new Date(Date.now() - oneMonth)
  const data = await getData(days, granularity)
  return data.filter((point) => point.date > startTime.getTime())
}

/**
 * Fetches the historical price data for the last year from the Coingecko API with daily granularity
 * @returns A promise that resolves to the historical price data for the last year.
 */
const fetchLastYearData = async (): Promise<LivelineData> => {
  const days = 365
  const granularity = Granularities.daily
  const oneYear = 365 * 24 * 60 * 60 * 1000
  const startTime = new Date(Date.now() - oneYear)
  const data = await getData(days, granularity)
  return data.filter((point) => point.date > startTime.getTime())
}

/**
 * Fetches all historical price data from the Coingecko API starting from the first day until now
 * @returns A promise that resolves to the historical price data for all periods.
 */
const fetchAllData = async (): Promise<LivelineData> => {
  return fetchLastYearData() // Coingecko free tier only allows a max of 365 days of data
}

/**
 * Fetches historical price data from the Coingecko API for the given date range and granularity.
 * @param start The start date for the data range.
 * @param end The end date for the data range.
 * @param granularity The granularity of the data in seconds.
 * @returns A promise that resolves to the historical price data for the given date range.
 */
const getData = async (days: number, granularity: Granularities): Promise<LivelineData> => {
  const url = getUrl(days, granularity)
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  const coingeckoResponse = await fetch(url, { headers: { 'User-Agent': ua } })
  if (!coingeckoResponse.ok) {
    const body = await coingeckoResponse.text()
    const { status, statusText } = coingeckoResponse
    throw new Error(`CoinGecko request failed with ${status} ${statusText}: ${body}`)
  }
  const data: CoingeckoResponse = await coingeckoResponse.json()
  return data.prices.map((item: CoingeckoPoint) => ({ date: ms2secs(item[0]), value: item[1] }))
}
