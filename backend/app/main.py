from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.clinical import router as clinical_router
from app.api.interview import router as interview_router
from app.api.session import router as session_router


app = FastAPI(
    title="MediKiosk API",
    description="AI-powered clinical intake platform",
    version="0.1.0",
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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