# RouteWise AI 🚗
## Vehicle-Aware Navigation & Road Defect Intelligence

RouteWise AI is an intelligent road-navigation and infrastructure-monitoring platform designed to help drivers evaluate routes using vehicle compatibility, road conditions, and reported hazards. It also provides a workflow for reporting road defects and a foundation for prioritizing road maintenance.

Unlike conventional navigation systems that primarily focus on distance and travel time, RouteWise AI aims to consider vehicle restrictions, road quality, defect severity, and uncertainty when evaluating routes.

**Project Status:** MVP / Active Development

**Important:** Sample road-network data, defect reports, and routing recommendations are not verified real-world safety information. Validate all critical restrictions before relying on a route.

---

## 1. Features

### 1.1 Vehicle Profiles
- Store vehicle make, model, year, variant, and specifications where supported.
- Evaluate route compatibility using available vehicle information.
- Treat missing critical specifications as unknown rather than assuming a road is suitable.

### 1.2 Vehicle-Aware Route Evaluation
- Compare route options using travel time, road conditions, and hazards.
- Apply penalties for reported road defects and uncertain information where implemented.
- Treat confirmed vehicle restrictions as hard constraints.
- Display warnings when essential road or vehicle information is missing.

### 1.3 Road Defect Reporting
- Report potholes, cracked roads, uneven surfaces, waterlogging, and obstructions.
- Capture location, description, severity, and evidence where supported by the form and backend.
- Provide a foundation for report verification, duplicate detection, and resolution workflows.

### 1.4 Road Intelligence
- Present reported defects and their severity when data is available.
- Help identify road segments that may need inspection.
- Support future maintenance prioritization and infrastructure analytics.

### 1.5 Maintenance Prioritization
- Prioritize reports using severity, vehicle impact, confidence, and freshness where implemented.
- Support a future workflow from report submission to verification and resolution.

**Feature note:** These describe the project's goals and MVP capabilities. Exact functionality depends on the frontend and backend versions running. Do not assume a report was saved unless the API confirms success and the record can be retrieved.

---

## 2. Project Architecture

RouteWise AI follows a frontend-backend architecture.

```text
┌────────────────────────────────────┐
│           React Frontend           │
│                                    │
│ Vehicle Profiles                   │
│ Route Planning                     │
│ Road Defect Reporting              │
│ Road Intelligence                  │
│ Maintenance Dashboard              │
└──────────────────┬─────────────────┘
                   │
                   │ HTTP / REST API
                   ▼
┌────────────────────────────────────┐
│          FastAPI Backend           │
│                                    │
│ Vehicle Management                 │
│ Route Evaluation                   │
│ Road Defect Management             │
│ Maintenance Intelligence           │
└──────────────────┬─────────────────┘
                   │
                   ▼
┌────────────────────────────────────┐
│          SQLite Database           │
│                                    │
│ Vehicle Records                    │
│ Road Defect Reports                │
│ Application Data                   │
└────────────────────────────────────┘

Potential Future Integrations:
OpenStreetMap | Routing Engine | YOLO
PostgreSQL + PostGIS | Verified Vehicle Data
```

---

## 3. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| Maps | Leaflet / OpenStreetMap, if configured |
| Backend | Python, FastAPI |
| API | REST, HTTP, JSON |
| Database | SQLite for the MVP |
| Vehicle data discovery | Optional SerpApi integration |
| Future geospatial storage | PostgreSQL + PostGIS |
| Future computer vision | YOLO-based road-defect detection |

Only integrations actually configured and tested in the current deployment should be considered operational.

---

## 4. Project Folder Structure

Your actual folder names may differ. The following structure illustrates the expected organization.

```text
RouteWise-AI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   │       └── api.ts
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local
│
├── routewise_backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   └── pilot.py
│   │
│   ├── requirements.txt
│   └── .env
│
├── .gitignore
└── README.md
```

**Important file locations:**

- Backend `.env`: inside `routewise_backend`, next to `requirements.txt`.
- Frontend `.env.local`: inside `frontend`, next to `package.json`.
- Backend entry point: `routewise_backend/app/main.py`.
- Frontend API configuration: typically `frontend/src/lib/api.ts`.

The structure above is illustrative; use the actual filenames in your repository.

---

## 5. Prerequisites

Install the following before starting the project:

- Python 3.11 recommended.
- Node.js and npm.
- A code editor such as Visual Studio Code.
- Git, if required for version control.

Verify the installations:

```bat
python --version
node --version
npm --version
```

---

## 6. Backend Setup

### Step 1: Open the backend directory

Open a terminal in the `routewise_backend` folder, where `requirements.txt` is located.

Example:

```bat
cd path\to\RouteWise-AI\routewise_backend
```

Replace the example path with your actual project location.

### Step 2: Create a virtual environment

```bat
python -m venv .venv
```

Activate it on Windows:

```bat
.venv\Scripts\activate
```

### Step 3: Install Python dependencies

```bat
python -m pip install -r requirements.txt
```

Wait until the dependencies have finished installing.

---

## 7. Backend Environment Configuration — `.env`

Create a file named `.env` directly inside the `routewise_backend` directory.

The file should be located at:

```text
RouteWise-AI/
└── routewise_backend/
    ├── app/
    ├── requirements.txt
    └── .env
```

If `.env.example` does not exist, create `.env` manually.

Use the following configuration, matching the variables supported by your current backend:

```env
# Optional: used only to discover candidate vehicle specification sources.
# The backend never treats snippets as verified dimensions.
SERPAPI_API_KEY=
SERPAPI_TIMEOUT_SECONDS=20

# Add the exact origin shown in your frontend browser if it differs.
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173

# Optional absolute path. Default is ./routewise.db
DATABASE_PATH=./routewise.db
```

### Environment variable explanations

**`SERPAPI_API_KEY`**

Optional API key for discovering candidate vehicle specification sources. Leave it empty if SerpApi is not being used.

**`SERPAPI_TIMEOUT_SECONDS`**

The timeout, in seconds, for the optional SerpApi request, provided the implementation reads this setting.

**`CORS_ORIGINS`**

The allowed frontend origins for cross-origin API requests. Include the exact origin shown in your browser if it differs from the listed origins.

**`DATABASE_PATH`**

The optional path to the SQLite database. The documented default is `./routewise.db`.

**Configuration warning:** These variables only work when the backend code actually reads them. Check `app/config.py`, `app/main.py`, and `app/database.py` for the precise configuration expected by your version.

Creating an environment file does not automatically implement an integration or add a missing API endpoint.

### `.gitignore`

At the repository root, create or update `.gitignore`:

```gitignore
# Environment files and secrets
.env
.env.local
.env.*.local

# Python
.venv/
__pycache__/
*.py[cod]

# Local databases
*.db

# Frontend dependencies and builds
node_modules/
dist/

# Operating system files
.DS_Store
Thumbs.db
```

This helps prevent local environment files, database files, and generated artifacts from being committed to Git.

---

## 8. Start the Backend Server

Open a terminal in `routewise_backend`, activate the virtual environment, and run:

```bat
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal open while using the application.

If startup succeeds, the backend should be available at:

```text
http://127.0.0.1:8000
```

Open the interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

The `/docs` page is the definitive place to check which API endpoints are registered by the running backend.

### If you encounter `404 Not Found`

A 404 response means the requested URL path is not registered at that server address.

For example, if `/health` or `/defects` returns a 404:

1. Open `http://127.0.0.1:8000/docs`.
2. Inspect the list of registered endpoints.
3. Check the paths defined in `app/main.py`.
4. Confirm that the frontend calls those exact paths.
5. Verify that the correct backend process is running.

Creating `.env` or `.env.local` will not fix a missing endpoint.

If port 8000 is occupied, stop the old server using `Ctrl+C` in its terminal. If the process cannot be identified, inspect it before terminating it.

---

## 9. Frontend Setup

### Step 1: Open the frontend directory

Open a second terminal in the `frontend` folder, where `package.json` is located.

```bat
cd path\to\RouteWise-AI\frontend
```

### Step 2: Install dependencies

```bat
npm install
```

### Step 3: Create the frontend `.env.local` file

Create `.env.local` in the frontend project root.

Correct location:

```text
RouteWise-AI/
└── frontend/
    ├── src/
    ├── package.json
    ├── vite.config.ts
    └── .env.local
```

Add the following:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Step 4: Connect the frontend to the backend

The frontend API code must read the environment variable.

Example:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

Use that base URL when constructing API requests.

The exact implementation should match the existing `src/lib/api.ts` or equivalent file in your project.

### Step 5: Start the frontend

```bat
npm run dev
```

Open the local URL printed in the terminal. It is commonly:

```text
http://localhost:5173
```

Keep both terminals running:

- Terminal 1: FastAPI backend.
- Terminal 2: React/Vite frontend.

Restart Vite after changing `.env.local`.

**Security:** Never put `SERPAPI_API_KEY`, `GEMINI_API_KEY`, database passwords, or other private credentials in frontend environment files. Variables prefixed with `VITE_` can be exposed to browser code.

---

## 10. Environment File Summary

### Backend environment file

**Path:** `routewise_backend/.env`

```env
SERPAPI_API_KEY=
SERPAPI_TIMEOUT_SECONDS=20

CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:4173,http://127.0.0.1:4173

DATABASE_PATH=./routewise.db
```

Purpose:

- Optional vehicle specification source discovery.
- Configurable CORS origins.
- SQLite database path configuration.

### Frontend environment file

**Path:** `frontend/.env.local`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Purpose:

- Tells the frontend which backend base URL to use.

The backend and frontend environment files serve different purposes. Do not combine them into one file.

---

## 11. API Documentation and Integration

RouteWise AI uses HTTP/REST communication between the frontend and backend.

Base URL for local development:

```text
http://127.0.0.1:8000
```

Interactive documentation:

```text
http://127.0.0.1:8000/docs
```

Potential API capabilities include:

- Health checks.
- Vehicle listing and lookup.
- Vehicle profile management.
- Route evaluation.
- Road defect creation and retrieval.
- Road restriction lookup.
- Maintenance summaries.
- Defect status updates.

These are intended capabilities, not a guarantee that every endpoint exists in the current implementation.

Use `/docs` and the backend source code to verify the exact endpoint paths, HTTP methods, request fields, and response formats.

### Example road defect report

The following JSON is an illustrative example only. The actual field names must match the request schema defined by the backend.

```json
{
  "defect_type": "pothole",
  "severity": "high",
  "location": "Aluva, Kerala",
  "description": "Large pothole on the left side of the road. It may pose a risk to two-wheelers, particularly during rain or low visibility. Please inspect and repair."
}
```

Example vehicle categories affected:

```json
[
  "cars",
  "two-wheelers"
]
```

Do not send these fields unless the actual API schema supports them.

A report should be considered submitted only after the backend returns a successful response. To verify persistence, retrieve the report again or inspect the configured database.

---

## 12. Road Defect Reporting Workflow

The intended reporting workflow is:

1. The user identifies a road defect.
2. The user selects the defect type.
3. The user provides a location.
4. The user selects a severity level.
5. The user enters a description and adds evidence if supported.
6. The frontend submits the report to the backend.
7. The backend validates the request.
8. The backend saves the report if persistence is implemented and the operation succeeds.
9. The report can be retrieved and displayed in the road intelligence dashboard.

### Example defect types

- Pothole.
- Cracked road surface.
- Uneven road.
- Waterlogging.
- Road obstruction.
- Damaged road edge.

### Example severity levels

- Low.
- Medium.
- High.
- Critical.

These categories are illustrative. Use the values accepted by the actual backend schema.

### Report verification

A community-submitted report should not automatically be treated as a verified road hazard. A production system should support validation, timestamps, duplicate detection, evidence review, and report status tracking.

---

## 13. Vehicle-Aware Route Evaluation

RouteWise AI aims to evaluate routes using factors such as:

- Estimated travel time.
- Road surface condition.
- Road defect severity and proximity.
- Vehicle height, width, weight, and other relevant specifications.
- Confirmed vehicle access restrictions.
- Reliability and freshness of available information.

An illustrative route scoring model is:

```text
Route Cost =
    Travel Time Cost
  + Road Damage Penalty
  + Hazard Penalty
  + Uncertainty Penalty
```

Lower-cost routes may be preferred when all required constraints and inputs are properly evaluated.

A confirmed restriction that makes a road unsuitable for a vehicle should be treated as a hard constraint rather than merely as a scoring penalty.

Missing data must not be interpreted as proof that a road is safe or accessible.

This formula describes the intended design. It does not establish that every factor is implemented in the current MVP.

---

## 14. Road Intelligence and Maintenance Prioritization

RouteWise AI can serve as a foundation for road maintenance intelligence.

Potential functionality includes:

- Viewing reported defects.
- Grouping reports by location.
- Displaying defect severity.
- Identifying frequently reported road segments.
- Prioritizing inspections.
- Tracking report status.
- Monitoring resolution progress.
- Generating road maintenance summaries.

A future prioritization model could consider:

```text
Priority Score =
    Severity
  + Traffic or Vehicle Impact
  + Report Confidence
  + Information Freshness
```

The actual weights and calculation method would need to be defined and validated before operational use.

---

## 15. Database

The MVP uses SQLite for local development.

The configured database path is controlled by `DATABASE_PATH` if the application reads that environment variable. The documented default is:

```text
./routewise.db
```

The relative path is resolved according to the application's implementation and working directory.

Potential database records include:

- Vehicle profiles.
- Road defect reports.
- Defect severity.
- Report descriptions.
- Location information.
- Report timestamps.
- Report verification and resolution status, where implemented.

For production-scale geospatial operations, PostgreSQL with PostGIS could be considered.

Do not assume a table or record exists without verifying the actual database schema.

---

## 16. Optional SerpApi Integration

RouteWise AI can optionally use SerpApi to discover candidate sources for vehicle specifications if that integration is implemented.

Environment variable:

```env
SERPAPI_API_KEY=
SERPAPI_TIMEOUT_SECONDS=20
```

If you use SerpApi, provide the key through the backend `.env` file and ensure the backend reads it.

Search results and snippets are not verified vehicle dimensions. Vehicle specifications should be confirmed against reliable manufacturer documentation or another authoritative source.

If you do not have a SerpApi key, leave the value empty and ensure that the application can run without the optional integration.

---

## 17. Testing Checklist

Before relying on a feature, verify the following.

### Backend
- [ ] The virtual environment activates correctly.
- [ ] All dependencies install successfully.
- [ ] Uvicorn starts without import errors.
- [ ] The intended backend process is listening on the expected port.
- [ ] `/docs` opens successfully.
- [ ] The endpoints required by the frontend appear in `/docs`.
- [ ] Database initialization works.
- [ ] Invalid requests return understandable errors.

### Frontend
- [ ] The application starts using `npm run dev`.
- [ ] `.env.local` is in the frontend root.
- [ ] `VITE_API_BASE_URL` points to the intended backend.
- [ ] The API code reads the configured base URL.
- [ ] Browser requests use the correct API paths.
- [ ] CORS allows the frontend origin.
- [ ] API failures are shown clearly.

### Road reporting
- [ ] A report can be submitted using the actual schema.
- [ ] The backend returns a successful response.
- [ ] The report can be retrieved after submission.
- [ ] The dashboard displays the backend record.
- [ ] Validation errors are handled correctly.
- [ ] Demo data is distinguished from verified real-world data.

### Routing
- [ ] Vehicle restrictions use reliable information.
- [ ] Missing specifications produce appropriate warnings.
- [ ] Reported defects are not automatically treated as verified.
- [ ] The application does not present unverified route results as guaranteed safe.

---

## 18. Common Problems and Troubleshooting

### Problem 1: `404 Not Found`

**Possible cause:** The endpoint does not exist at the requested URL, the path is incorrect, or a different application is running on the port.

**Solution:**

1. Open `http://127.0.0.1:8000/docs`.
2. Find the endpoint in the documentation.
3. Compare its path and HTTP method with the frontend request.
4. Check `app/main.py` for route definitions.
5. Confirm that the intended backend is running.

### Problem 2: `Connection refused`

**Possible cause:** The backend is stopped or listening on a different address or port.

**Solution:**

1. Start the backend using the Uvicorn command.
2. Keep the terminal open.
3. Verify the URL in `frontend/.env.local`.
4. Check whether another process occupies port 8000.

### Problem 3: CORS error

**Possible cause:** The frontend origin is not included in the backend's allowed origins.

**Solution:**

1. Check the frontend URL in the browser.
2. Add the exact origin to `CORS_ORIGINS`.
3. Confirm the backend actually reads this variable.
4. Restart the backend.

Do not add URL paths such as `/dashboard` to an origin. An origin consists of the scheme, hostname, and optional port.

### Problem 4: Environment variable changes have no effect

**Possible cause:** The variable is not read by the application, the file is in the wrong directory, or the development server was not restarted.

**Solution:**

- Confirm the file location.
- Check the relevant configuration code.
- Restart Vite after frontend environment changes.
- Restart the backend after backend configuration changes.

### Problem 5: Frontend displays success but the report is missing

**Possible cause:** The frontend displays a success state without confirming backend persistence, or the backend saves to a different database.

**Solution:**

- Inspect the network response.
- Verify the HTTP status.
- Check the backend logs.
- Retrieve the report using the API.
- Confirm the configured database path.

---

## 19. Future Enhancements

Potential improvements include:

- Live routing through a suitable routing engine.
- Vehicle-aware routing using verified height, width, weight, and access restrictions.
- GPS-based road defect reporting.
- YOLO-based pothole detection from images or video.
- Duplicate-report detection.
- Confidence scoring and report verification.
- PostgreSQL and PostGIS for geospatial queries.
- Road-defect heatmaps.
- Maintenance analytics and priority dashboards.
- Report verification and resolution workflows.
- Integration with verified road-authority data.
- Improved mobile responsiveness.
- Automated backend and frontend tests.

These are proposed enhancements and should not be considered implemented until developed and tested.

---

## 20. Limitations and Safety

RouteWise AI is an evolving prototype. Sample records and unverified community reports must not be treated as confirmed road conditions.

Road restrictions, bridge clearances, vehicle dimensions, and route suitability require reliable, current sources. Missing data does not mean a road is safe or accessible.

Do not rely on prototype recommendations as the sole basis for emergency driving, heavy-vehicle routing, or other safety-critical decisions.

Any production deployment should include reliable data sources, robust validation, security controls, monitoring, and appropriate testing.

---

## 21. Contributing

Contributions can follow this workflow:

1. Fork the repository.
2. Create a feature branch.
3. Implement the change.
4. Test the affected functionality.
5. Document new configuration variables and API endpoints.
6. Submit a pull request describing the changes.

Keep secrets out of source control and document any new environment variables.

---

## 22. License

Add an appropriate license file before distributing the project publicly.

Until a license is specified, do not assume that others have permission to reuse or redistribute the code.

---

## 23. Quick Start Reference

### Backend terminal

Run from the `routewise_backend` directory:

```bat
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend API documentation:

```text
http://127.0.0.1:8000/docs
```

### Frontend `.env.local`

Location: `frontend/.env.local`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Frontend terminal

Run from the `frontend` directory:

```bat
npm install
npm run dev
```

Open the local URL printed by Vite.

Keep both the backend and frontend terminals running while testing the application.

---

**RouteWise AI — Smarter routes. Safer roads. Better infrastructure.**
