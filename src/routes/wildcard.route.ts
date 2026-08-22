import express from "express";
import { getRapidApiHeaders } from "../utils/get-rapid-api-headers";
import { getRapidApiKey } from "../utils/get-rapid-api-key";
import { Headers } from "../types/rapid-api";
import { footballApi } from "../utils/axios";

export const wildcardRouter = express.Router();

wildcardRouter.all("*", async (req, res) => {
  const apiKey = getRapidApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ errors: `Please provide ${Headers.apiKey}` });
  }

  const apiRes = await footballApi.request({
    method: req.method,
    url: req.originalUrl,
    headers: getRapidApiHeaders(apiKey),
  });

  return res.status(apiRes.status).header(apiRes.headers).json(apiRes.data);
});
