# AS Proyecto

Documentación de demo para Backstage TechDocs.

## Qué hace este servicio

* Sirve una API para **ranking de videojuegos** (ventas) y **leaderboards** (puntuaciones).
* Permite **registrar récords** y los guarda en MongoDB y en un CSV.
* Expone los juegos (UI) mediante proxy:

  * `/pacman`
  * `/juego-2048`
  * `/tetris`

## Endpoints de la API

### `GET /ranking`

Devuelve el ranking de juegos ordenado por ventas globales.

**Query params**

* `year` (opcional, number)
* `platform` (opcional, string)
* `limit` (opcional, number, por defecto 20)

Ejemplo:

* `/ranking?year=2013&platform=PS4&limit=20`

---

### `GET /leaderboard`

Devuelve el leaderboard de puntuaciones.

**Query params**

* `game` (opcional, string)
* `limit` (opcional, number, por defecto 10)

Ejemplo:

* `/leaderboard?game=pacman&limit=10`

---

### `POST /record`

Registra un récord (score).

**Body (JSON)**

```json
{
  "game": "pacman",
  "player": "Andoni",
  "score": 12345
}
```

**Respuestas**

* `201` OK (guardado)
* `400` Validación (faltan campos / score inválido)
* `500` Error interno

---

## Juegos (proxy)

* `GET /pacman`
* `GET /juego-2048`
* `GET /tetris`

## Notas

La especificación completa OpenAPI se puede ver en Backstage en la sección **API Docs**.
