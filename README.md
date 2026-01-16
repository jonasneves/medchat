# MedChat

Medical image analysis chat interface powered by MedGemma 1.5 4B.

## Features

- Multimodal analysis of X-rays, CT scans, dermatology photos, pathology slides
- Real-time streaming responses
- Example images from NIH ChestX-ray14 dataset
- Runs on CPU (no GPU required)

## Architecture

```
frontend/     React + Vite + Tailwind
backend/      FastAPI proxy server
inference/    llama.cpp with MedGemma GGUF
```

## Quick Start

```bash
# Install dependencies
make install

# Run locally (requires backend services)
make dev
```

## Deployment

Deploys via GitHub Actions to Cloudflare Tunnel. Runs on GitHub-hosted runner with 16GB swap.

```bash
# Setup Cloudflare tunnel
make setup-tunnel

# Trigger deploy
gh workflow run deploy.yml
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| N_CTX | 4096 | Context window size |
| N_THREADS | 4 | CPU threads for inference |
| N_BATCH | 512 | Batch size for prompt processing |

## Disclaimer

For research and educational purposes only. Not for clinical diagnosis or medical advice.

## License

MIT
