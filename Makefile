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
	@echo ""
	@echo "\033[2mDevelopment\033[0m"
	@echo "  \033[36minstall\033[0m         Install frontend and script dependencies"
	@echo "  \033[36mdev\033[0m             Run frontend dev server"
	@echo "  \033[36mbuild\033[0m           Build frontend for production"
	@echo "  \033[36mrun-backend\033[0m     Run backend server (port 8500)"
	@echo "  \033[36mrun-inference\033[0m   Run MedGemma inference server (port 8400)"
	@echo "  \033[36mclean\033[0m           Remove build artifacts"
	@echo ""
	@echo "\033[2mSetup\033[0m"
	@echo "  \033[36msetup-github\033[0m    Create GitHub App for workflow automation"
	@echo "  \033[36msetup-tunnel\033[0m    Create Cloudflare tunnel (requires .env)"
	@echo ""
	@echo "\033[2mDocker\033[0m"
	@echo "  \033[36mdocker-build\033[0m    Build Docker images"
	@echo ""
