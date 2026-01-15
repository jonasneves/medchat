"""
MedGemma 1.5 4B Multimodal Inference Server

Medical vision-language model supporting radiology, dermatology,
pathology, and ophthalmology image analysis.
"""

import os
import uvicorn
from multimodal_base import MultimodalModelConfig, create_multimodal_app

config = MultimodalModelConfig(
    title="MedGemma 1.5 4B Inference API",
    description="Medical multimodal model for radiology, dermatology, pathology analysis",
    model_name="MedGemma 1.5 4B",
    openai_model_id="medgemma-1.5-4b-it",
    owned_by="google",
    default_repo="unsloth/medgemma-1.5-4b-it-GGUF",
    default_file="medgemma-1.5-4b-it-Q4_K_M.gguf",
    clip_repo="unsloth/medgemma-1.5-4b-it-GGUF",
    clip_file="mmproj-F16.gguf",
    chat_format="gemma",
    default_n_ctx=8192,
    default_n_threads=4,
    n_batch=512,
)

app = create_multimodal_app(config)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8400"))
    uvicorn.run(app, host="0.0.0.0", port=port)
