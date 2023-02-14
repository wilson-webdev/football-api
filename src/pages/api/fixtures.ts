import type { NextApiRequest, NextApiResponse } from "next";
import { AxiosResponse } from "axios";
import { getRapidApiHeaders } from "@/utils/get-rapid-api-headers";
import { getRapidApiKey } from "@/utils/get-rapid-api-key";
import { Headers } from "@/types/rapid-api";
import { axios } from "@/utils/axios";

type Fixture = {
  get: "fixtures";
  parameters: any;
  errors: any;
  results: number;
  paging: any;
  response: any;
};

const listFormat = new Intl.ListFormat("en");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
