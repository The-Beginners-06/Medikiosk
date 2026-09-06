from fastapi import FastAPI

from app.api.clinical import router as clinical_router
from app.api.interview import router as interview_router
from app.api.session import router as session_router


app = FastAPI(
    title="MediKiosk API",
    description="AI-powered clinical intake platform",
    version="0.1.0",
)


@app.get("/")
def root():
    return {
        "name": "MediKiosk",
        "status": "online",
        "message": "MediKiosk backend is running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


app.include_router(clinical_router)
app.include_router(interview_router)
app.include_router(session_router)