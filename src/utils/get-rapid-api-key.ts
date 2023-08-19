import { Headers } from "../types/rapid-api";
import { Request } from "express";

export function getRapidApiKey(req: Request) {
  return req.headers[Headers.apiKey] as string | null;
}
