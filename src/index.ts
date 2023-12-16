import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import { fixturesRouter } from "./routes/fixtures.route";
import { HealthCheckService } from "./services/health-check.service";

const app = express();

app.use(bodyParser.json());

app.get("/health", (req, res) => {
  res.json(HealthCheckService.get());
});

app.use("/fixtures", fixturesRouter);

// Start web server on port 3000
app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
