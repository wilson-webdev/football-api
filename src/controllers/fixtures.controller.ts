import { getRapidApiKey } from "../utils/get-rapid-api-key";
import { FixturesService } from "../services/fixtures.service";
import { Request, Response } from "express";
import { Headers } from "../types/rapid-api";

export class FixturesController {
  public static async get(req: Request, res: Response) {
    const { leagues, include, exclude, ...restQuery } = req.query;
    const apiKey = getRapidApiKey(req);
    const fixturesService = new FixturesService();

    if (!apiKey) {
      return res
        .status(401)
        .json({ errors: `Please provide ${Headers.apiKey}` });
    }

    if (typeof leagues !== "string" || leagues.length === 0) {
      return res.status(400).json({
        errors:
          "Please provide a list of league IDs under the leagues query param",
      });
    }

    const leagueIds = leagues.split(",");

    const invalidIds = leagueIds.filter((leagueId) => {
      const leagueIdAsNumber = Number(leagueId);
      return !Number.isInteger(leagueIdAsNumber);
    });

    if (invalidIds.length > 0) {
      return res.status(400).json({
        errors: `Invalid league IDs: ${invalidIds.join(",")}`,
      });
    }

    const result = await fixturesService.getFixtures({
      leagueIds,
      apiKey,
      query: restQuery,
      url: req.url,
      include: typeof include === "string" ? include.split(",") : undefined,
      exclude: typeof exclude === "string" ? exclude.split(",") : undefined,
    });

    if ("errors" in result) {
      return res.status(result.code || 500).json({ errors: result.errors });
    }

    return res.json(result.data);
  }
}
