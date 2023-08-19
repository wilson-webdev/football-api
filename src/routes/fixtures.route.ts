import { FixturesController } from "../controllers/fixtures.controller";
import express from "express";

const fixturesRouter = express.Router();

fixturesRouter.get("/", FixturesController.get);

export { fixturesRouter };
