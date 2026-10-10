# RouteWise AI 🚗
### Vehicle-Aware Navigation & Road Defect Intelligence

RouteWise AI is an intelligent road-navigation and infrastructure-monitoring platform designed to help drivers choose routes based on vehicle compatibility, road conditions, and reported hazards. It also enables users to report road defects and provides a foundation for prioritizing road maintenance.

Unlike conventional navigation systems that primarily focus on distance and travel time, RouteWise AI aims to incorporate vehicle restrictions, road quality, defect severity, and uncertainty into route evaluation.

> **Project status:** MVP / Active Development  
> Road-network data, defect reports, and routing recommendations must be validated before real-world use.

## ✨ Key Features

### 🚘 1. Vehicle Profiles
- Save vehicle make, model, year, variant, and relevant specifications.
- Support vehicle-aware route evaluation.
- Account for vehicle dimensions and weight where verified data is available.
- Identify missing specifications rather than assuming a vehicle is compatible.

### 🗺️ 2. Intelligent Route Evaluation
- Evaluate possible routes using travel time, road conditions, and hazard information.
- Apply penalties for reported potholes, damaged roads, and uncertain road conditions.
- Exclude routes with confirmed restrictions that make them unsuitable for a vehicle.
- Provide warnings when critical restriction data is unavailable.

### 🚧 3. Road Defect Reporting
- Report potholes, cracks, uneven surfaces, waterlogging, and road obstructions.
- Record defect location, description, severity, and supporting evidence where implemented.
- Support future verification, status updates, and duplicate-report handling.
- Make reports available to the road-intelligence dashboard when successfully persisted.

### 📊 4. Road Intelligence Dashboard
- View reported road defects and their severity.
- Identify road segments that may require inspection.
- Track defect status and maintenance priorities as data becomes available.
- Provide a foundation for data-driven infrastructure planning.

### 🔧 5. Maintenance Prioritization
- Rank defects using severity, vehicle impact, confidence, and report freshness.
- Help identify potentially hazardous road segments.
- Support maintenance workflows from reporting through verification and resolution.

## 🏗️ System Architecture

```text
┌──────────────────────────────┐
│       React Frontend         │
│ Vehicle | Routes | Reports   │
│ Road Intelligence | Settings │
└──────────────┬───────────────┘
               │ HTTP / REST API
               ▼
┌──────────────────────────────┐
│       FastAPI Backend        │
│ Vehicle Management           │
│ Route Evaluation             │
│ Road Defect Management       │
│ Maintenance Intelligence     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       SQLite Database        │
│ Vehicle and Defect Records   │
└──────────────────────────────┘

Future integrations:
OpenStreetMap | Routing Engine | YOLO
PostgreSQL + PostGIS | Verified Vehicle Data
```

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Lucide |
| Maps | Leaflet / OpenStreetMap integration |
| Backend | Python, FastAPI |
| API | REST, HTTP, JSON |
| Database | SQLite for the MVP |
| Vehicle data discovery | Optional SerpApi integration |
| Future geospatial storage | PostgreSQL + PostGIS |
| Future computer vision | YOLO-based road defect detection |

Only integrations actually configured in the current deployment should be considered operational.

## 📁 Project Structure

```text
RouteWise-AI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   │       └── api.ts
│   ├── public/
│   ├── .env.local
│   ├── package.json
│   └── vite.config.ts
│
├── routewise_backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   └── pilot.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
└── README.md
```

*The frontend and backend directory names may differ depending on how you organize your repository.*

## ⚙️ Getting Started

### Prerequisites

Install the following:

- Python 3.11
- Node.js and npm
- Git (optional, for version control)

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd RouteWise-AI
```

Replace the placeholder with your actual repository URL.

### 2. Set up the backend

Open a terminal inside the `routewise_backend` directory.

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bat
.venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Create a local environment file:

```bat
copy .env.example .env
```

Edit `.env` and configure the variables required by your backend. Keep API keys and other secrets on the server.

Start the backend:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open the interactive API documentation:

**http://127.0.0.1:8000/docs**

Use this page to confirm which endpoints are actually registered before connecting the frontend.

### 3. Set up the frontend

Open a second terminal inside your frontend directory, where `package.json` is located.

Install dependencies:

```bash
npm install
```

Create a `.env.local` file in the frontend root:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite, typically:

**http://localhost:5173**

Keep both terminals running while testing the application.

## 🔌 Backend API

The following are intended API capabilities. Confirm their exact paths and methods in `/docs` because the available endpoints depend on the current backend implementation.

| Capability | Intended operation |
|---|---|
| Health check | Check backend availability |
| Vehicle management | List, look up, and save vehicles |
| Route evaluation | Calculate vehicle-aware route options |
| Road defects | Create and retrieve defect reports |
| Road restrictions | Retrieve known vehicle restrictions |
| Maintenance intelligence | Summarize and prioritize defects |
| Defect status | Update reports through verification and resolution |

### Example: Submit a Road Defect

An illustrative REST request might look like this:

```http
POST /defects
Content-Type: application/json
```

```json
{
  "defect_type": "pothole",
  "severity": "high",
  "location": "Aluva, Kerala",
  "description": "Large pothole on the left side of the road."
}
```

**Important:** This payload is illustrative, not a guarantee of the current backend schema. Check the request model in `/docs` before using it. A successful submission must be confirmed by the server and, where persistence is implemented, verified in the database.

## 🔐 Environment Variables

### Frontend — `.env.local`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Backend — `.env`

Use the variables documented in `.env.example`. Optional integrations may require additional configuration.

Never commit `.env`, `.env.local`, database files containing sensitive information, or API secrets to a public repository.

## 🧠 Route Evaluation Concept

RouteWise AI is designed to evaluate a route using several factors:

- Estimated travel time
- Road surface condition
- Defect severity and proximity
- Confirmed vehicle restrictions
- Reliability and freshness of available data

An illustrative scoring model is:

```text
Route Cost =
    Travel Time Cost
  + Road Damage Penalty
  + Hazard Penalty
  + Uncertainty Penalty
```

Confirmed restrictions that make a route unsuitable should be treated as hard constraints rather than ordinary scoring penalties.

The final recommendation should explain why a route was selected and identify important missing information. The scoring model is a design concept, not a claim that the MVP already implements every factor.

## 🚀 Future Enhancements

- Live routing using a suitable routing engine.
- Vehicle-aware routing using verified height, width, weight, and access restrictions.
- GPS-based road defect reporting.
- YOLO-based pothole detection from uploaded images or video.
- Duplicate detection and confidence scoring for community reports.
- PostgreSQL and PostGIS for scalable geospatial queries.
- Road-defect heatmaps and maintenance analytics.
- Report verification and resolution workflows.
- Integration with verified road-authority data where available.

## 🧪 Testing Checklist

Before a release, verify that:

- The frontend can reach the intended backend.
- API endpoints return the expected responses.
- A submitted defect is saved and can be retrieved.
- Reports appear in the dashboard after successful persistence.
- Invalid submissions produce useful validation errors.
- Vehicle restrictions are enforced only when supported by reliable data.
- Missing or stale road information produces explicit warnings.
- API failures are displayed honestly without silently substituting demo data.

## ⚠️ Limitations and Safety

RouteWise AI is an evolving prototype. Sample records and unverified community reports must not be treated as confirmed road conditions.

Road restrictions, bridge clearances, vehicle dimensions, and route suitability require reliable, current sources. Missing data does not mean a road is safe or accessible.

Do not rely on prototype recommendations as the sole basis for emergency driving, heavy-vehicle routing, or other safety-critical decisions.

## 🤝 Contributing

Contributions, bug reports, feature suggestions, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement and test your changes.
4. Submit a pull request describing the change.

## 📄 License

Choose and add a license before distributing the project publicly. Until a license is specified, do not assume that others have permission to reuse or redistribute the code.

---

**RouteWise AI — Smarter routes. Safer roads. Better infrastructure.**
