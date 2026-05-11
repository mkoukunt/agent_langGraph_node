import "dotenv/config";
import { MongoClient, Db, Collection, Document } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "ndp";

const client = new MongoClient(uri);
let dbInstance: Db | null = null;

export async function getDb(): Promise<Db> {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(dbName);
  }
  return dbInstance;
}

export async function getCollection<T extends Document = Document>(
  name: string,
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export async function closeMongo(): Promise<void> {
  await client.close();
  dbInstance = null;
}

export default client;
