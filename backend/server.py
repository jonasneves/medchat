"""
MedChat Backend Server

FastAPI server that serves the MedChat frontend and proxies
chat requests to the MedGemma inference server.
"""

import os
import json
import httpx
import pathlib
from contextlib import asynccontextmanager
from typing import List, Union, Optional, AsyncGenerator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

MEDGEMMA_URL = os.getenv("MEDGEMMA_API_URL", "http://localhost:8400")

http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=300.0)
    yield
    await http_client.aclose()


app = FastAPI(
    title="MedChat API",
    description="Medical chat interface for MedGemma",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ImageContent(BaseModel):
    type: str = "image_url"
    image_url: dict


class TextContent(BaseModel):
    type: str = "text"
    text: str


class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[Union[dict, TextContent, ImageContent]]]


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    max_tokens: int = 1024
    temperature: float = 0.7
    stream: bool = True


@app.get("/api/health")
async def health():
    """Check MedChat and MedGemma health."""
    model_status = "error"
    try:
        if http_client:
            resp = await http_client.get(f"{MEDGEMMA_URL}/health", timeout=5.0)
            if resp.status_code == 200:
                data = resp.json()
                model_status = data.get("status", "error")
    except Exception:
        pass

    return {
        "status": "healthy",
        "model_status": model_status,
        "model": "medgemma-1.5-4b-it",
    }


async def stream_response(messages: list, max_tokens: int, temperature: float) -> AsyncGenerator[str, None]:
    """Stream response from MedGemma."""
    if not http_client:
        yield f"data: {json.dumps({'error': 'HTTP client not initialized'})}\n\n"
        return

    payload = {
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }

    try:
        async with http_client.stream(
            "POST",
            f"{MEDGEMMA_URL}/v1/chat/completions",
            json=payload,
            timeout=300.0,
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                return

            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    yield f"{line}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Handle chat requests, proxying to MedGemma."""
    if request.stream:
        return StreamingResponse(
            stream_response(request.messages, request.max_tokens, request.temperature),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    if not http_client:
        raise HTTPException(status_code=503, detail="HTTP client not initialized")

    payload = {
        "messages": [{"role": m.role, "content": m.content} for m in request.messages],
        "max_tokens": request.max_tokens,
        "temperature": request.temperature,
        "stream": False,
    }

    try:
        resp = await http_client.post(
            f"{MEDGEMMA_URL}/v1/chat/completions",
            json=payload,
            timeout=300.0,
        )
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Mount static files
static_dir = pathlib.Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/")
async def index():
    """Serve the MedChat frontend."""
    index_file = static_dir / "index.html"
    if index_file.exists():
        response = FileResponse(index_file)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return response
    return {"message": "MedChat API - Frontend not built. Run npm run build in frontend/"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8500"))
    uvicorn.run(app, host="0.0.0.0", port=port)
