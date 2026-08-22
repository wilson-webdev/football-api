import { Headers } from "../types/rapid-api";

export function getRapidApiHeaders(apiKey: string) {
  return {
    [Headers.apiKey]: apiKey,
  };
}
