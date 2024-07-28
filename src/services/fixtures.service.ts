import { AxiosResponse } from "axios";
import { getRapidApiHeaders } from "../utils/get-rapid-api-headers";
import { axios } from "../utils/axios";
import clientPromise from "../lib/mongodb";
import { Request } from "express";
import lodash from "lodash";

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
  include?: string[];
  exclude?: string[];
};

type GetResult =
  | {
      errors: string[] | string;
      code?: number;
    }
  | {
      data: any[];
    };

export class FixturesService {
  private processIncludeExclude(
    fixtures: any[],
    include?: string[],
    exclude?: string[]
  ) {
    if (!include && !exclude) {
      return fixtures;
    }

    return fixtures.map((fixture) => {
      const values = {};
      const includeKeys = include || Object.keys(fixture);

      includeKeys.forEach((key) => {
        lodash.set(values, key, lodash.get(fixture, key));
      });

      exclude?.forEach((key) => {
        lodash.unset(values, key);
      });

      return values;
    });
  }

  async getFixtures({
    leagueIds: leagueIdsArray,
    apiKey,
    url,
    query,
    include,
    exclude,
  }: GetParams): Promise<GetResult> {
    const client = await clientPromise;
    const db = client.db("quota");
    const requests = await db.collection("requests");
    const leagueIds = Array.from(new Set(leagueIdsArray));

    const fixturePromises = await Promise.allSettled(
      [...leagueIds].map((leagueId) => {
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

    const fixtures = fulfilledFixtures.flatMap(
      (fixtureRes) => fixtureRes.data.response
    );

    return {
      data: this.processIncludeExclude(fixtures, include, exclude),
    };
  }
}
