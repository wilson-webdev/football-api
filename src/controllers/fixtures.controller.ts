import { getRapidApiKey } from "../utils/get-rapid-api-key";
import { FixturesService } from "../services/fixtures.service";
import { Request, Response } from "express";
import { Headers } from "../types/rapid-api";

export class FixturesController {
  public static async get(req: Request, res: Response) {
    const { leagues, ...restQuery } = req.query;
    const apiKey = getRapidApiKey(req);

    if (!apiKey) {
      return res
        .status(401)
        .json({ errors: `Please provide ${Headers.apiKey}` });
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
      return res.status(400).json({
        errors: `Invalid league IDs: ${invalidIds.join(",")}`,
      });
    }

    const result = await FixturesService.get({
      leagueIds,
      apiKey,
      query: restQuery,
      url: req.url,
    });

    if ("errors" in result) {
      return res.status(result.code || 500).json({ errors: result.errors });
    }

    return res.json(result.data);
  }
}
