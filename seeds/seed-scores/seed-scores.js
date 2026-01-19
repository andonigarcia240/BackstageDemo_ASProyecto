import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const MONGO_USER  = process.env.MONGO_USER;
const MONGO_PWD   = process.env.MONGO_PWD;
const MONGO_DB    = process.env.MONGO_DB  || "scoresdb";
const CSV_PATH    = process.env.CSV_PATH  || "./scores.csv";
const FORCE       = process.argv.includes("--force");

const MONGO_URL   = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PWD)}@servidor-bbdd:27017/scoresdb?authSource=admin`;

const toNum = x => { const n = parseFloat(String(x ?? "").trim());  return Number.isNaN(n)?null:n; };
const toDate = s => { const d = new Date(String(s ?? "").trim());  return isNaN(d) ? new Date() : d;};

const client = new MongoClient(MONGO_URL);
await client.connect();
const db  = client.db(MONGO_DB);
const col = db.collection("scores");

const count = await col.estimatedDocumentCount();
if (count > 0 && !FORCE) {
  console.log(`ScoresDB ya tiene ${count} documentos. Usa --force para resembrar.`);
  await client.close();
  process.exit(0);
}
if (FORCE && count > 0) {
  console.log("Limpiando colección scores...");
  await col.deleteMany({});
}

await col.createIndex({ Game: 1, Score: -1, CreatedAt: 1 });          
await col.createIndex({ Game: 1, Player: 1, Score: -1 }, { unique: true });   //para evitar duplicados

console.log(`Leyendo ${CSV_PATH}...`);
const csv = readFileSync(CSV_PATH, "utf8");
const rows = parse(csv, { columns:true, skip_empty_lines:true });

const docs = rows.map(r => ({
  Game: r.Game, 
  Player: r.Player, 
  Score: toNum(r.Score),
  CreatedAt: toDate(r.CreatedAt), 
}));

if (docs.length) await col.insertMany(docs, { ordered:false });

console.log(`seed-scores: ${docs.length} docs insertados.`);
await client.close();
