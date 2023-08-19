import { AxiosResponse } from "axios";
import { getRapidApiHeaders } from "../utils/get-rapid-api-headers";
import { axios } from "../utils/axios";
import clientPromise from "../lib/mongodb";
import { Request } from "express";

type Fixture = {
  get: "fixtures";
  parameters: any;
  errors: any;
  results: number;
  paging: any;
  response: any;
};

const MAX_REQUESTS_ALLOWED = 100;

type GetParams = {
  leagueIds: string[];
  apiKey: string;
  url: string;
  query: Request["query"];
};

type GetResult =
  | {
      errors: string[] | string;
      code?: number;
    }
  | {
      data: Fixture[];
    };

export class FixturesService {
  public static async get({
    leagueIds,
    apiKey,
    url,
    query,
  }: GetParams): Promise<GetResult> {
    const client = await clientPromise;
    const db = client.db("quota");
    const requests = await db.collection("requests");

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
      return {
        code: 429,
        errors: `Too many requests. Currently used ${total} requests out of ${MAX_REQUESTS_ALLOWED} and you are about to make ${leagueIds.length} requests`,
      };
    }

    const fixturePromises = await Promise.allSettled(
      leagueIds.map((leagueId) => {
        return axios.get<Fixture>("/fixtures", {
          params: {
            league: leagueId,
            ...query,
          },
          headers: getRapidApiHeaders(apiKey),
        });
      })
    );

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
      return {
        errors,
        code: 500,
      };
    }

    const contentSizeMb = fulfilledFixtures.reduce(
      (acc, curr) => acc + (Number(curr.headers["content-length"]) || 0),
      0
    );

    await requests.insertOne({
      url,
      token: apiKey,
      date: new Date().toISOString(),
      requestsMade: leagueIds.length,
      contentSizeKb: contentSizeMb / 1024,
    });

    return {
      data: fulfilledFixtures.flatMap((fixtureRes) => fixtureRes.data.response),
    };
  }
}
