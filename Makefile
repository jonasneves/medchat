.PHONY: help install dev build run-backend run-inference setup-tunnel setup-github docker-build clean
.DEFAULT_GOAL := help

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────

install:
	cd frontend && npm install
	pip3 install -r scripts/requirements.txt

dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

run-backend:
	cd backend && python3 server.py

run-inference:
	cd inference && python3 inference_server.py

clean:
	rm -rf frontend/node_modules frontend/dist
	rm -rf __pycache__ */__pycache__

# ─────────────────────────────────────────────────────────────────────────────
# Setup
# ─────────────────────────────────────────────────────────────────────────────

setup-github:
	python3 scripts/create_github_app.py

setup-tunnel:
	python3 scripts/setup_tunnel.py

# ─────────────────────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────────────────────

docker-build:
	docker build -f backend/Dockerfile -t medchat .
	docker build -f inference/Dockerfile -t medgemma-inference .

# ─────────────────────────────────────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────────────────────────────────────

help:
	@echo "Development:"
	@echo "  make install        Install frontend and script dependencies"
	@echo "  make dev            Run frontend dev server"
	@echo "  make build          Build frontend for production"
	@echo "  make run-backend    Run backend server (port 8500)"
	@echo "  make run-inference  Run MedGemma inference server (port 8400)"
	@echo "  make clean          Remove build artifacts"
	@echo ""
	@echo "Setup:"
	@echo "  make setup-github   Create GitHub App for workflow automation"
	@echo "  make setup-tunnel   Create Cloudflare tunnel (requires .env)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   Build Docker images"
