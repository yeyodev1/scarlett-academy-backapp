import "dotenv/config";
import { dbConnect } from "../src/config/mongo";
import { createApp } from "../src/app";

let initialized = false;

async function ensureDb() {
  if (initialized) return;
  await dbConnect();
  initialized = true;
}

const { app } = createApp();

export default async function handler(req: any, res: any) {
  await ensureDb();
  app(req, res);
}
