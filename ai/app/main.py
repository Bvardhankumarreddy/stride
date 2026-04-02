from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import (
    acceptance_criteria,
    summarize,
    similar_issues,
    digest,
    release_notes,
)

app = FastAPI(
    title="Stride AI Service",
    description="Claude-powered AI endpoints for Stride",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(acceptance_criteria.router, prefix="/ai", tags=["Acceptance Criteria"])
app.include_router(summarize.router, prefix="/ai", tags=["Summarize"])
app.include_router(similar_issues.router, prefix="/ai", tags=["Similar Issues"])
app.include_router(digest.router, prefix="/ai", tags=["Digest"])
app.include_router(release_notes.router, prefix="/ai", tags=["Release Notes"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "stride-ai"}
