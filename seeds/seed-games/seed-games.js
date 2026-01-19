import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";

const MONGO_USER  = process.env.MONGO_USER;
const MONGO_PWD   = process.env.MONGO_PWD;
const MONGO_DB    = process.env.MONGO_DB  || "appdb";
const CSV_PATH    = process.env.CSV_PATH  || "./vgsales.csv";
const FORCE       = process.argv.includes("--force");

const MONGO_URL   = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PWD)}@servidor-bbdd:27017/appdb?authSource=admin`;

const toInt = x => { const n = parseInt(String(x ?? "").trim(),10); return Number.isNaN(n)?null:n; };
const toNum = x => { const n = parseFloat(String(x ?? "").trim());  return Number.isNaN(n)?null:n; };

const client = new MongoClient(MONGO_URL);
await client.connect();
const db  = client.db(MONGO_DB);
const col = db.collection("games");

const count = await col.estimatedDocumentCount();
if (count > 0 && !FORCE) {
  console.log(`GamesDB ya tiene ${count} documentos. Usa --force para resembrar.`);
  await client.close();
  process.exit(0);
}
if (FORCE && count > 0) {
  console.log("Limpiando colección games...");
  await col.deleteMany({});
}

await col.createIndex({ Name: 1, Platform: 1, Year: 1 }, { unique: true });                          
await col.createIndex({ Year: 1, Platform: 1, Global_Sales: -1 }, {unique: false});    

console.log(`Leyendo ${CSV_PATH}...`);
const csv = readFileSync(CSV_PATH, "utf8");
const rows = parse(csv, { columns:true, skip_empty_lines:true });

const docs = rows.map(r => ({
  Name: r.Name, Platform: r.Platform, Year: toInt(r.Year),
  Genre: r.Genre, Publisher: r.Publisher,
  NA_Sales: toNum(r.NA_Sales), EU_Sales: toNum(r.EU_Sales),
  JP_Sales: toNum(r.JP_Sales), Other_Sales: toNum(r.Other_Sales),
  Global_Sales: toNum(r.Global_Sales),
}));

if (docs.length) {
  const ops = docs.map(doc => ({
    updateOne: {
      filter: { Name: doc.Name, Platform: doc.Platform, Year: doc.Year },
      update: { $set: doc },
      upsert: true,
    }
  }));
  const res = await col.bulkWrite(ops, { ordered: false });
}

console.log(`seed-games: ${docs.length} docs insertados.`);
await client.close();
