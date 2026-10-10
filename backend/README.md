# RouteWise AI — FastAPI backend

This backend was built against the uploaded RouteWise AI frontend's current `src/lib/api.ts` and `src/types/index.ts` contracts.

## Features

- FastAPI endpoints used by the current frontend (`/vehicles`, `/vehicles/lookup`, `/defects`, `/restrictions`, `/routes`, `/maintenance/summary`).
- SQLite persistence for vehicles, road-defect reports, and restrictions.
- Seeded illustrative vehicle catalogue and Kochi pilot road graph matching frontend IDs (`FKC`, `ERS`, `MGR`, `VYT`, `PLV`, `EDP`, `KLM`, `ALV`, `KKD`, `TPR`; road segments `S1`–`S16`).
- Route evaluation against the supplied vehicle profile, mapped restrictions, missing data, and active defect reports.
- Defect status updates persist across restarts.
- Optional SerpApi lookup for discovering candidate vehicle-source pages. Search snippets do not fill dimensions automatically; new candidate profiles have unknown specs until reviewed.
- CORS configuration for local Vite/TanStack development.

## Important data warning

The included Kochi road graph, geometry, road widths, surface condition, restrictions, and seeded defect reports are **illustrative demo data**. They are not live reports, surveyed road geometry, official restrictions, or a guarantee of safe routing. Do not use this prototype for real-world navigation decisions until road data and restrictions have been independently verified and a suitable production routing provider has been integrated.

## Run on Windows

Open a terminal in this `routewise_backend` folder:

```bat
py -3.11 -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` to try the endpoints and `http://127.0.0.1:8000/health` for a health check.

Set `SERPAPI_API_KEY` in `.env` only if you want vehicle source discovery for models not in the local catalogue. Keep `.env` private.

## Connect the frontend

In the frontend project root, create/update `.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart the frontend dev server after changing the environment file. When `VITE_API_BASE_URL` is set, the current frontend switches to live backend mode and does not silently fall back to mock data.

## API contract implemented

- `GET /health`, `GET /api/health`, `GET /api/meta`
- `GET /vehicles`, `GET /vehicles/{id}`, `POST /vehicles/lookup`, `PUT /vehicles`, `DELETE /vehicles/{id}`
- `GET /defects`, `POST /defects`, `GET /defects/{id}`, `PATCH /defects/{id}/status`, `POST /defects/{id}/confirm`, `POST /defects/{id}/resolve`
- `GET /restrictions`, `GET /roads/{segment_id}`, `GET /roads/nearby`
- `POST /routes`
- `GET /maintenance/summary`
- `GET /admin/defects`, `GET /admin/priority-segments`, `POST /admin/inspections`, `POST /admin/repairs`

## Reset the local demo database

Stop the backend, delete `routewise.db`, then start the backend again. The database is recreated and illustrative seed records are loaded.

## Notes / known limitations

- The routing engine evaluates a small, seeded undirected Kochi graph for prototype purposes. It is not a replacement for a production routing engine such as GraphHopper with validated truck profiles.
- The optional SerpApi integration discovers candidate sources only. It does not scrape/verify technical dimensions, and it never treats search snippets as confirmed vehicle specifications.
- Photo submission currently accepts a `photoUrl` string as expected by the current frontend contract. Production should use multipart upload or signed object-storage URLs, size/type validation, authentication, and malware scanning.
- Admin endpoints are prototypical and do not yet enforce authentication/authorization. Do not expose them publicly without adding auth and audit logging.
- SQLite is suitable for local development. Postgres/PostGIS is recommended for multi-user deployment and scalable spatial queries.
