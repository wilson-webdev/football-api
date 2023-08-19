import { Headers } from "../types/rapid-api";
import ax from "axios";

export const axios = ax.create({
  baseURL: "https://api-football-v1.p.rapidapi.com/v3",
  headers: {
    [Headers.host]: "api-football-v1.p.rapidapi.com",
  },
});
