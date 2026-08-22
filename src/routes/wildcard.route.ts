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

  const { data, status, headers } = await footballApi.request({
    method: req.method,
    url: req.originalUrl,
    headers: getRapidApiHeaders(apiKey),
  });

  if (data.errors) {
    const errors = parseErrors(data.errors);
    if (errors) {
      const errorStatus = status >= 200 && status < 300 ? 400 : status;
      return res.status(errorStatus).json({ errors });
    }
  }

  return res.status(status).header(headers).json(data.response);
});

function parseErrors(errors: unknown) {
  if (Array.isArray(errors) && errors.length > 0) {
    return errors;
  }

  if (typeof errors === "object" && Object.keys(errors || {}).length > 0) {
    return errors;
  }

  if (typeof errors === "string" && errors.length > 0) {
    return errors;
  }

  return null;
}
