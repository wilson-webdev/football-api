import { Headers } from "@/types/rapid-api";
import { AxiosHeaders } from "axios";

export function getRapidApiHeaders(apiKey: string, headers?: AxiosHeaders) {
  return {
    [Headers.apiKey]: apiKey,
    ...headers,
  };
}
