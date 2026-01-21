import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { MongoClient} from 'mongodb';
import csvWriterPkg from 'csv-writer';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";


const { createObjectCsvWriter } = csvWriterPkg;
const app = express();
const port            = process.env.PORT;
const MONGO_USER      = process.env.MONGO_USER;
const MONGO_PWD       = process.env.MONGO_PWD;
const MONGO_DB_GAMES  = process.env.MONGO_DB || 'appdb';
const MONGO_DB_SCORES = process.env.MONGO_DB || 'scoresdb';

const MONGO_URL = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PWD)}@servidor-bbdd:27017/?authSource=admin`;

let dbGames;
let dbScores;

app.use(express.static("public"));
app.use(express.json());

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "AS_Proyecto API", version: "1.0.0" },
    servers: [{ url: "http://localhost:3001", description: "Local API" }],
  },
  apis: ["./app.js"], 
});

app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Expone cada juego bajo un subpath y reenvía la petición  (solución para el problema de obtener score :) )
app.use('/pacman',     createProxyMiddleware({ target: 'http://pacman:80',     changeOrigin:true, pathRewrite:{'^/pacman':'/'} }));
app.use('/juego-2048', createProxyMiddleware({ target: 'http://juego-2048:80', changeOrigin:true, pathRewrite:{'^/juego-2048':'/'} }));
app.use('/tetris',     createProxyMiddleware({ target: 'http://tetris:80',     changeOrigin:true, pathRewrite:{'^/tetris':'/'} }));

async function connect() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();                  
  dbGames = client.db(MONGO_DB_GAMES);      
  dbScores = client.db(MONGO_DB_SCORES)           
  console.log(`Mongo conectado. games-> ${MONGO_DB_GAMES} | scores-> ${MONGO_DB_SCORES}`);
}
connect().catch(err => { console.error(err); process.exit(1); });

// ==== CSV SCORES  ====
const CSV_DIR  = process.env.SCORES_DIR || path.resolve(process.cwd(), 'data');
const CSV_PATH = path.join(CSV_DIR, 'scores.csv');

const writer = createObjectCsvWriter({
  path: CSV_PATH,
  header: [
    { id: 'Game',      title: 'Game' },
    { id: 'Player',    title: 'Player' },
    { id: 'Score',     title: 'Score' },
    { id: 'CreatedAt', title: 'CreatedAt' },
  ],
  append: true,
});

// ========== RANKING ==========
/** 
@openapi
*  /ranking:
*    get:
*      summary: Ranking de videojuegos por ventas globales
*      description: Devuelve una lista ordenada por Global_Sales descendente.
*      parameters:
*        - name: year
*          in: query
*          required: false
*          schema:
*            type: integer
*          example: 2013
*        - name: platform
*          in: query
*          required: false
*          schema:
*            type: string
*          example: PS4
*        - name: limit
*          in: query
*          required: false
*          schema:
*            type: integer
*            default: 20
*            minimum: 1
*            maximum: 200
*          example: 20
*      responses:
*        "200":
*          description: Lista de juegos
*          content:
*            application/json:
*              schema:
*                type: array
*                items:
*                  $ref: "#/components/schemas/RankingItem"
*/
app.get('/ranking', async (req, res) => {
  const { year, platform, limit = 20 } = req.query;
  const q = {};
  if (year) q.Year = Number(year);
  if (platform) q.Platform = String(platform);

  const rows = await dbGames.collection('games')
    .find(q, { projection: { _id:0, Name:1, Platform:1, Year:1, Global_Sales:1 } })
    .sort({ Global_Sales: -1 })
    .limit(Number(limit))
    .toArray();

  res.json(rows);
});

// ========== LEADERBOARD ==========
/**
 @openapi
 * /leaderboard:
 *   get:
 *     summary: Leaderboard de puntuaciones
 *     description: Devuelve puntuaciones ordenadas por Score desc y fecha asc.
 *     parameters:
 *       - name: game
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         example: pacman
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 200
 *         example: 10
 *     responses:
 *       "200":
 *         description: Lista de scores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/ScoreItem"
*/
app.get('/leaderboard', async (req, res) => {
  const { game, limit = 10 } = req.query;
  const q = {};
  if (game) q.Game = String(game);

  const rows = await dbScores.collection('scores')
    .find(q, { projection: { _id: 0, Game: 1, Player: 1, Score: 1, CreatedAt: 1 } })
    .sort({ Score: -1, CreatedAt: 1 })       // desempate por fecha
    .limit(Number(limit))
    .toArray();

  res.json(rows);
});

// ========== RECORD ==========
/**
 @openapi
 * /record:
  *  post:
  *    summary: Registrar un récord
  *    description: Inserta un score en MongoDB y lo añade al CSV.
  *    requestBody:
  *      required: true
  *      content:
  *        application/json:
  *          schema:
  *            $ref: "#/components/schemas/RecordRequest"
  *          examples:
  *            ejemplo:
  *              value:
  *                game: pacman
  *                player: Andoni
  *                score: 12345
  *    responses:
  *      "201":
  *        description: Récord guardado
  *        content:
  *          application/json:
  *            schema:
  *              $ref: "#/components/schemas/RecordResponse"
  *      "400":
  *        description: Validación fallida
  *        content:
  *          application/json:
  *            schema:
  *              $ref: "#/components/schemas/ErrorResponse"
  *            examples:
  *              game_requerido:
  *                value: { error: "game requerido" }
  *              player_requerido:
  *                value: { error: "player requerido" }
  *              score_invalido:
  *                value: { error: "score inválido" }
  *      "500":
  *        description: Error interno al guardar
  *        content:
  *          application/json:
  *            schema:
  *              $ref: "#/components/schemas/ErrorResponse"
  *            examples:
  *              fallo:
  *                value: { error: "Fallo guardando el récord" }
 */
app.post('/record', async (req, res) => {
  try {
    console.log('REQ BODY:', req.body); // <-- mira exactamente qué llega
    let { game, player, score } = req.body || {};
    game   = (game ?? '').toString().trim();
    player = (player ?? '').toString().trim();
    score  = Number(score);

    if (!game)   return res.status(400).json({ error: 'game requerido' });
    if (!player) return res.status(400).json({ error: 'player requerido' });
    if (!Number.isFinite(score) || score < 0)
      return res.status(400).json({ error: 'score inválido' });

    const doc = { Game: game, Player: player, Score: score, CreatedAt: new Date().toISOString() };

    await dbScores.collection('scores').insertOne(doc);

     //  Escribir CSV + logs útiles 
    await writer.writeRecords([doc]);
    const stat = await fs.stat(CSV_PATH).catch(() => null);
    const tail = await fs.readFile(CSV_PATH, 'utf8').then(t => t.trim().split('\n').slice(-2)).catch(() => []);
    console.log('CSV bytes:', stat?.size, '| tail:', tail);

    return res.status(201).json({ ok: true, score: doc });
  } catch (e) {
    console.error('Error en /record:', e);
    return res.status(500).json({ error: 'Fallo guardando el récord' });
  }
});

app.listen(port, () => console.log(`API en el puerto ${port}`));
