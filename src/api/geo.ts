import { client } from "./client";

export interface Country {
  code: string;
  name: string;
}

/** País aproximado por IP — se llama una sola vez, en la primera visita. */
export async function detectRegion(): Promise<string> {
  const res = await client.get("/geo/detect");
  return res.data.country;
}

export async function listCountries(): Promise<Country[]> {
  const res = await client.get("/countries");
  return res.data.results;
}
