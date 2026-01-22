"""
Multimodal GGUF Inference Server base

Handles image + text for vision-language models like MedGemma.
"""

from __future__ import annotations

import os
import json
import asyncio
import time
import base64
import re
from dataclasses import dataclass
from typing import Optional, List, Union

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from huggingface_hub import hf_hub_download
from llama_cpp import Llama
from llama_cpp.llama_chat_format import Gemma3ChatHandler

# Set thread defaults if not specified (can be overridden via env)
if not os.getenv("OPENBLAS_NUM_THREADS"):
    os.environ["OPENBLAS_NUM_THREADS"] = "1"  # Avoid BLAS thread contention
# OMP_NUM_THREADS left to system default or explicit override


@dataclass
class MultimodalModelConfig:
    title: str
    description: str
    model_name: str
    openai_model_id: str
    owned_by: str
    default_repo: str
    default_file: str
    clip_repo: Optional[str] = None
    clip_file: Optional[str] = None
    chat_format: Optional[str] = None
    default_n_ctx: int = 8192
    default_n_threads: int = 4
    n_batch: int = 512
    last_n_tokens_size: int = 64


class ImageContent(BaseModel):
    type: str = "image_url"
    image_url: dict


class TextContent(BaseModel):
    type: str = "text"
    text: str


class MultimodalMessage(BaseModel):
    role: str
    content: Union[str, List[Union[dict, TextContent, ImageContent]]]


class MultimodalGenerateRequest(BaseModel):
    prompt: Optional[str] = None
    messages: Optional[List[MultimodalMessage]] = None
    max_tokens: int = 2048
    temperature: float = 1.0  # Reasoning mode (undocumented, per Unsloth discovery)
    top_p: float = 0.95
    min_p: float = 0.0
    stream: bool = False
    include_perf: bool = False

    class Config:
        extra = 'ignore'


def _download_model(repo: str, filename: str, cache_subdir: str = "") -> str:
    cache_dir = os.getenv("HF_HOME", "/tmp/hf_cache")
    if cache_subdir:
        cache_dir = os.path.join(cache_dir, cache_subdir)
    print(f"Downloading: {repo}/{filename}")
    model_path = hf_hub_download(
        repo_id=repo,
        filename=filename,
        cache_dir=cache_dir,
    )
    print(f"Downloaded to: {model_path}")
    return model_path


def _extract_images_from_content(content: Union[str, List]) -> tuple[str, List[bytes]]:
    """Extract text and images from multimodal content."""
    if isinstance(content, str):
        return content, []

    text_parts = []
    images = []

    for item in content:
        if isinstance(item, dict):
            if item.get("type") == "text":
                text_parts.append(item.get("text", ""))
            elif item.get("type") == "image_url":
                image_url = item.get("image_url", {})
                url = image_url.get("url", "") if isinstance(image_url, dict) else ""
                if url.startswith("data:"):
                    match = re.match(r"data:image/[^;]+;base64,(.+)", url)
                    if match:
                        images.append(base64.b64decode(match.group(1)))
        elif hasattr(item, "type"):
            if item.type == "text":
                text_parts.append(item.text)
            elif item.type == "image_url":
                url = item.image_url.get("url", "")
                if url.startswith("data:"):
                    match = re.match(r"data:image/[^;]+;base64,(.+)", url)
                    if match:
                        images.append(base64.b64decode(match.group(1)))

    return " ".join(text_parts), images


def create_multimodal_app(config: MultimodalModelConfig) -> FastAPI:
    app = FastAPI(
        title=config.title,
        description=config.description,
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    llm: Optional[Llama] = None
    chat_handler: Optional[Gemma3ChatHandler] = None
    stop_tokens = ["<end_of_turn>", "<eos>"]
    max_concurrent = int(os.getenv("MAX_CONCURRENT", "1"))
    inference_lock = asyncio.Semaphore(max_concurrent)
    always_include_perf = os.getenv("ALWAYS_INCLUDE_PERF", "").lower() in {"1", "true"}

    def _load_model():
        nonlocal llm, chat_handler
        model_path = _download_model(config.default_repo, config.default_file, "models")

        clip_path = None
        if config.clip_repo and config.clip_file:
            clip_path = _download_model(config.clip_repo, config.clip_file, "clip")
            chat_handler = Gemma3ChatHandler(clip_model_path=clip_path)

        n_ctx = int(os.getenv("N_CTX", str(config.default_n_ctx)))
        n_threads = int(os.getenv("N_THREADS", str(config.default_n_threads)))
        n_batch = int(os.getenv("N_BATCH", str(config.n_batch)))

        print(f"Loading multimodal model: n_ctx={n_ctx}, n_threads={n_threads}, n_batch={n_batch}")

        llama_kwargs = {
            "model_path": model_path,
            "n_ctx": n_ctx,
            "n_threads": n_threads,
            "use_mlock": True,
            "use_mmap": True,
            "n_batch": n_batch,
            "last_n_tokens_size": config.last_n_tokens_size,
            "flash_attn": True,
            "type_k": 8,  # KV cache quantization (q8_0) - reduces memory bandwidth
            "type_v": 8,
            "verbose": True,
        }

        if chat_handler:
            llama_kwargs["chat_handler"] = chat_handler

        if config.chat_format:
            llama_kwargs["chat_format"] = config.chat_format

        llm = Llama(**llama_kwargs)
        print("Multimodal model loaded!")

        print("Warming up model...")
        try:
            llm.create_chat_completion(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=1,
                temperature=0.1,
            )
            print("Warm-up complete!")
        except Exception as e:
            print(f"Warm-up warning: {e}")

    @app.on_event("startup")
    async def _startup():
        _load_model()

    @app.get("/health")
    async def health():
        return {
            "status": "healthy" if llm is not None else "loading",
            "model": config.model_name,
            "format": "GGUF",
            "multimodal": True,
        }

    @app.get("/health/details")
    async def health_details():
        return {
            "status": "healthy" if llm is not None else "loading",
            "model": config.model_name,
            "format": "GGUF",
            "multimodal": True,
            "clip_model": config.clip_file,
            "n_ctx": int(os.getenv("N_CTX", str(config.default_n_ctx))),
            "n_threads": int(os.getenv("N_THREADS", str(config.default_n_threads))),
            "n_batch": int(os.getenv("N_BATCH", str(config.n_batch))),
            "max_concurrent": max_concurrent,
        }

    @app.get("/v1/models")
    async def list_models():
        return {
            "data": [
                {
                    "id": config.openai_model_id,
                    "object": "model",
                    "owned_by": config.owned_by,
                    "capabilities": ["text", "vision"],
                }
            ]
        }

    def _prepare_messages_for_llm(messages: List[MultimodalMessage]) -> List[dict]:
        """Convert multimodal messages to llama-cpp format."""
        prepared = []
        for msg in messages:
            text, images = _extract_images_from_content(msg.content)

            if images:
                content_parts = []
                for img_data in images:
                    b64 = base64.b64encode(img_data).decode()
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    })
                if text:
                    content_parts.append({"type": "text", "text": text})
                prepared.append({"role": msg.role, "content": content_parts})
            else:
                prepared.append({"role": msg.role, "content": text})

        return prepared

    async def _generate_stream(
        messages: list,
        max_tokens: int,
        temperature: float,
        top_p: float,
        min_p: float,
        *,
        include_perf: bool,
    ):
        nonlocal llm
        try:
            request_start = time.perf_counter()
            wait_start = time.perf_counter()
            async with inference_lock:
                lock_acquired = time.perf_counter()
                response = await asyncio.to_thread(
                    llm.create_chat_completion,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    min_p=min_p,
                    stream=True,
                    stop=stop_tokens,
                )

                generated_text = ""
                first_token_time: Optional[float] = None
                for chunk in response:
                    if "choices" in chunk and len(chunk["choices"]) > 0:
                        delta = chunk["choices"][0].get("delta", {})
                        if "content" in delta:
                            content = delta["content"]
                            generated_text += content
                            if first_token_time is None and content:
                                first_token_time = time.perf_counter()
                            yield f"data: {json.dumps(chunk)}\n\n"
                            await asyncio.sleep(0)

                generation_done = time.perf_counter()

                completion_tokens = len(generated_text.split()) * 1.3
                prompt_tokens = 100
                total_tokens = int(prompt_tokens + completion_tokens)

                usage_chunk = {
                    "choices": [{"delta": {}, "finish_reason": "stop"}],
                    "usage": {
                        "prompt_tokens": int(prompt_tokens),
                        "completion_tokens": int(completion_tokens),
                        "total_tokens": total_tokens,
                    },
                }

                if include_perf:
                    queue_ms = int((lock_acquired - wait_start) * 1000)
                    generation_ms = int((generation_done - lock_acquired) * 1000)
                    ttft_ms = (
                        int((first_token_time - request_start) * 1000)
                        if first_token_time else None
                    )
                    usage_chunk["perf"] = {
                        "queue_ms": queue_ms,
                        "ttft_ms": ttft_ms,
                        "generation_ms": generation_ms,
                    }

                yield f"data: {json.dumps(usage_chunk)}\n\n"
                yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    @app.post("/v1/chat/completions")
    async def chat_completions(request: MultimodalGenerateRequest):
        nonlocal llm
        if llm is None:
            raise HTTPException(status_code=503, detail="Model not loaded")

        try:
            include_perf = bool(request.include_perf) or always_include_perf

            if request.messages:
                messages = _prepare_messages_for_llm(request.messages)
            elif request.prompt:
                messages = [{"role": "user", "content": request.prompt}]
            else:
                raise HTTPException(status_code=400, detail="Either messages or prompt required")

            if request.stream:
                return StreamingResponse(
                    _generate_stream(
                        messages,
                        request.max_tokens,
                        request.temperature,
                        request.top_p,
                        request.min_p,
                        include_perf=include_perf,
                    ),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )

            async with inference_lock:
                response = await asyncio.to_thread(
                    llm.create_chat_completion,
                    messages=messages,
                    max_tokens=request.max_tokens,
                    temperature=request.temperature,
                    top_p=request.top_p,
                    min_p=request.min_p,
                    stop=stop_tokens,
                )

            return {
                "id": f"chatcmpl-{config.openai_model_id}",
                "object": "chat.completion",
                "model": config.openai_model_id,
                "choices": response["choices"],
                "usage": response.get("usage", {}),
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return app
