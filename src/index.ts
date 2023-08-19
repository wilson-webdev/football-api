import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";
import { fixturesRouter } from "./routes/fixtures.route";

const app = express();

app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({ success: true });
});

app.use("/fixtures", fixturesRouter);

// Start web server on port 3000
app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
