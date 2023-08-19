import { MongoClient } from "mongodb";

const uri = process.env.DB_URL!;
const options = {};

let client;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  let globalVar = global as typeof globalThis & {
    _mongoClientPromise: Promise<MongoClient>;
  };

  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!globalVar._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalVar._mongoClientPromise = client.connect();
  }
  clientPromise = globalVar._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
