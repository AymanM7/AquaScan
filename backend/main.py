import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    alerts,
    automation,
    buildings,
    dealroom,
    debrief,
    health,
    inbox,
    report,
    settings,
    states,
)

app = FastAPI(
    title="RainUSE Nexus API",
    description="Autonomous Water-Opportunity Intelligence Engine",
    version="1.0.0",
)

_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(buildings.router, prefix="/api", tags=["Buildings"])
app.include_router(states.router, prefix="/api", tags=["States"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(settings.router, prefix="/api", tags=["Settings"])
app.include_router(debrief.router, prefix="/api", tags=["Debrief"])
app.include_router(automation.router, prefix="/api", tags=["Automation"])
app.include_router(report.router, prefix="/api", tags=["Reports"])
app.include_router(inbox.router, prefix="/api", tags=["Inbox"])
app.include_router(dealroom.router, prefix="/api", tags=["Dealroom"])
