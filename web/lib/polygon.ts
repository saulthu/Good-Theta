import axios from "axios";

const polygonApiKey = process.env.NEXT_PUBLIC_POLYGON_API_KEY;

if (!polygonApiKey) {
  // eslint-disable-next-line no-console
  console.warn("Polygon env not set: NEXT_PUBLIC_POLYGON_API_KEY");
}

const http = axios.create({
  baseURL: "https://api.polygon.io",
  params: { apiKey: polygonApiKey },
});

export async function fetchTickerDetails(ticker: string) {
  const response = await http.get(`/v3/reference/tickers/${ticker}`);
  return response.data;
}

export async function fetchPrevClose(ticker: string) {
  const response = await http.get(`/v2/aggs/ticker/${ticker}/prev`);
  return response.data;
}

import axios from "axios";

const POLYGON_API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY ?? "";

const polygon = axios.create({
  baseURL: "https://api.polygon.io",
  params: { apiKey: POLYGON_API_KEY },
});

export async function fetchAggregates(
  ticker: string,
  multiplier: number,
  timespan: "minute" | "hour" | "day",
  from: string,
  to: string
) {
  const { data } = await polygon.get(`/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`);
  return data;
}

export async function fetchOptionsChain(
  underlying: string,
  expirationDate?: string
) {
  const { data } = await polygon.get("/v3/reference/options/contracts", {
    params: {
      underlying_ticker: underlying,
      expiration_date: expirationDate,
      limit: 1000,
      order: "asc",
      sort: "expiration_date",
    },
  });
  return data;
}


