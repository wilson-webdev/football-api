import type { NextApiRequest, NextApiResponse } from "next";
import axios, { AxiosResponse } from "axios";

type Fixture = {
  get: "fixtures";
  parameters: any;
  errors: any;
  results: number;
  paging: any;
  response: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { leagues, ...restQuery } = req.query;
  const apiKey = req.headers["x-rapidapi-key"];

  if (!apiKey) {
    res.status(401).json({ errors: "Please provide x-rapidapi-key" });
  }

  if (typeof leagues !== "string") {
    return res
      .status(400)
      .json({ errors: "Please provide a list of league IDs" });
  }

  const leagueIds = leagues.split(",");
  const invalidIds = leagueIds
    .map((leagueId) => {
      const n = Number(leagueId);

      if (Number.isNaN(n)) {
        return leagueId;
      }

      return false;
    })
    .filter(Boolean);

  if (invalidIds.length > 0) {
    return res
      .status(400)
      .json({ errors: `Invalid league IDs: ${invalidIds.join(", ")}` });
  }

  const fixturePromises = await Promise.allSettled(
    leagueIds.map((leagueId) => {
      return axios.get<Fixture>(
        "https://api-football-v1.p.rapidapi.com/v3/fixtures",
        {
          params: {
            league: leagueId,
            ...restQuery,
          },
          headers: {
            "X-RapidAPI-Key": apiKey,
            "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
          },
        }
      );
    })
  );

  const fulfilledFixtures = fixturePromises.filter(
    (f): f is PromiseFulfilledResult<AxiosResponse<Fixture>> =>
      f.status === "fulfilled"
  );

  const errors = fulfilledFixtures
    .map((f) => f.value.data.errors)
    .filter((e) => Object.values(e).length > 0);

  if (errors.length > 0) {
    return res.status(500).json({ message: errors });
  }

  const fixtures = fulfilledFixtures.flatMap((f) => f.value.data.response);

  res.status(200).json(fixtures);
}
