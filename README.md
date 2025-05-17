# Flight Booking Data Analysis

A full-stack application for exploring flight booking data via a conversational React frontend and an Express/Node.js backend powered by an Ollama LLM.


## Repository Structure

Organize the project as a monorepo with separate `backend` and `frontend` folders:

```
flight-booking-data-analysis/
├── backend/
│   ├── .env                 # Environment variables for the server (OLLAMA_URL, LLM_MODEL, PORT)
│   ├── package.json         # Backend dependencies and scripts
|   ├──package-lock.json
│   └── src/
│       ├── index.js         # Entry point: configures Express, CORS, JSON, and mounts routes
│       ├── routes.js        # Defines `/api/query` endpoint and orchestrates LLM calls
│       ├── dataLoader.js    # Reads and parses CSV flight-booking data via DuckDB
│       └── llmAgent.js      # LangChain/Ollama LLM logic for interpreting queries
|   |──data/
|        |──Airline ID to Name.csv
|        |──Flight Bookings.csv
│
├── frontend/
│   ├── package.json         # Frontend dependencies (React, charting libs, etc.) and scripts
|   ├──package-lock.json
│   ├── public/
│   │   └── index.html       # Static HTML template including FOUC prevention script
│   └── src/
│       ├── index.js         # ReactDOM mount to `#root`
│       ├── App.jsx          # Root component wrapping chat interface and theme toggle
│       ├── styles.css       # Global & dark-mode CSS variables
│       ├── components/
│       │   ├── ChatInterface.jsx       # Natural-language chat UI
│       │   ├── VisualizationRenderer.jsx # Auto-detect & render pie/bar/line charts or tables
│       │   ├── ThemeToggle.jsx         # Dark/light mode switch with localStorage
│       │   └── usePollingState.js      # Custom hook to poll backend until query complete
│       |   ├── flightFacts.js   # Array of fun flight facts for display during loading
│
└── README.md                # Project documentation (this file)
```

---

## Prerequisites

- **Node.js** v14+ and **npm** or **Yarn** installed globally.
- **Ollama** LLM server running (per `.env` configuration) or another LangChain-compatible LLM endpoint.

---

## Backend Setup

1. **Navigate** into the backend folder:

   ```bash
   cd backend
   ```

2. **Install** dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure** environment variables:

   - Copy `.env.example` to `.env` (if provided) or create `.env` with:
     ```dotenv
     OLLAMA_URL=http://localhost:11434
     LLM_MODEL=mistral
     PORT=5000
     ```

4. **Start** the server:

   ```bash
   npm run dev   # uses nodemon for hot-reload
   # or
   npm start     # runs one-shot
   ```

5. The backend exposes a REST endpoint at `http://localhost:5000/api/query` expecting POSTs of the form:

   ```json
   { "query": "your natural-language question about flight bookings" }
   ```

---

## Frontend Setup

1. **Navigate** into the frontend folder:

   ```bash
   cd frontend
   ```

2. **Install** dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure** environment variables (optional):

   - If needed, create a `.env` in `frontend/` with:
     ```dotenv
     REACT_APP_API_URL=http://localhost:5000/api/query
     REACT_APP_POLL_INTERVAL_MS=1000
     ```

4. **Run** the development server:

   ```bash
   npm start   # or `yarn start`
   ```

5. **Open** [http://localhost:3000](http://localhost:3000) in your browser to interact with the chat UI.

---

## Scripts

- **Backend** (`backend/package.json`)
  - `npm run dev`: Starts Express with nodemon
  - `npm start`: Starts Express normally

- **Frontend** (`frontend/package.json`)
  - `npm start`: Launches React dev server
  - `npm run build`: Bundles React app for production

---

## Contributing & License

Contributions are welcome! Please open issues or PRs. This project is MIT licensed.
