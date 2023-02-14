import { Headers } from "@/types/rapid-api";
import { NextApiRequest } from "next";

export function getRapidApiKey(req: NextApiRequest) {
  return req.headers[Headers.apiKey] as string;
}
