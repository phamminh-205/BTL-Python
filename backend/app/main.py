"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, users, catalog, periods, proposals, councils, workflow


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("AUTO_SEED", "false").lower() == "true":
        from app.seed.seed_data import seed
        seed()
    yield


app = FastAPI(
    title="SciRes — Hệ thống Quản lý NCKH",
    description="Scientific Research Management System",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}", "path": request.url.path},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api")
app.include_router(users.router,     prefix="/api")
app.include_router(catalog.router,   prefix="/api")
app.include_router(periods.router,   prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(councils.router,  prefix="/api")
app.include_router(workflow.router,  prefix="/api")


@app.get("/api/health", tags=["System"])
async def health():
    return {"status": "ok"}
