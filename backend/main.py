from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes, fleet, employees, trips

app = FastAPI(
    title="Fleet Management Intelligence API",
    description="AI-powered B2B Fleet Management System Backend",
    version="1.0.0"
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(fleet.router, prefix="/api/fleet", tags=["Fleet"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(trips.router, prefix="/api/trips", tags=["Trips"])

@app.get("/")
def read_root():
    return {"status": "System Operational", "module": "Fleet Intelligence Engine"}
