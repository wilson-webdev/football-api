import type { NextApiRequest, NextApiResponse } from "next";
import { AxiosResponse } from "axios";
import { getRapidApiHeaders } from "@/utils/get-rapid-api-headers";
import { getRapidApiKey } from "@/utils/get-rapid-api-key";
import { Headers } from "@/types/rapid-api";
import { axios } from "@/utils/axios";
import clientPromise from "@/lib/mongodb";

type Fixture = {
  get: "fixtures";
  parameters: any;
  errors: any;
  results: number;
  paging: any;
  response: any;
};

const listFormat = new Intl.ListFormat("en");
const MAX_REQUESTS_ALLOWED = 100;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db("quota");
  const requests = await db.collection("requests");

  const { leagues, ...restQuery } = req.query;
  const apiKey = getRapidApiKey(req);

  if (!apiKey) {
    return res.status(401).json({ errors: `Please provide ${Headers.apiKey}` });
  }

  if (typeof leagues !== "string" || leagues.length === 0) {
    return res
      .status(400)
      .json({ errors: "Please provide a list of league IDs" });
  }

  const leagueIds = leagues.split(",");

  const invalidIds = leagueIds.filter((leagueId) => {
    const leagueIdAsNumber = Number(leagueId);
    return !Number.isInteger(leagueIdAsNumber);
  });

  if (invalidIds.length > 0) {
    return res
      .status(400)
      .json({ errors: `Invalid league IDs: ${listFormat.format(invalidIds)}` });
  }

  const date = new Date();

  // Look back a day from now
  date.setDate(date.getDate() - 1);

  const sumOfRequests = await requests.aggregate([
    {
      $match: {
        date: {
          $gte: date.toISOString(),
        },
        token: {
          $eq: apiKey,
        },
      },
    },
    {
      $group: {
        _id: "$token",
        total: {
          $sum: "$requestsMade",
        },
      },
    },
  ]);

  const total = (await sumOfRequests.toArray())?.[0]?.total || 0;

  if (total + leagueIds.length > MAX_REQUESTS_ALLOWED) {
    return res.status(429).json({
      errors: `Too many requests. Currently used ${total} requests out of ${MAX_REQUESTS_ALLOWED} and you are about to make ${leagueIds.length} requests`,
    });
  }

  const fixturePromises = await Promise.allSettled(
    leagueIds.map((leagueId) => {
      return axios.get<Fixture>("/fixtures", {
        params: {
          league: leagueId,
          ...restQuery,
        },
        headers: getRapidApiHeaders(apiKey),
      });
    })
  );

  await requests.insertOne({
    url: req.url,
    token: apiKey,
    date: new Date().toISOString(),
    requestsMade: leagueIds.length,
  });

  const fulfilledFixtures = fixturePromises
    .filter(
      (f): f is PromiseFulfilledResult<AxiosResponse<Fixture>> =>
        f.status === "fulfilled"
    )
    .map((f) => f.value);

  const errors = fulfilledFixtures
    .map((fixtureRes) => fixtureRes.data.errors)
    .filter((e) => Object.values(e).length > 0);

  if (errors.length > 0) {
    return res.status(500).json({ errors });
  }

  const fixtures = fulfilledFixtures.flatMap(
    (fixtureRes) => fixtureRes.data.response
  );

  res.status(200).json(fixtures);
}
