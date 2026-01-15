.PHONY: help install dev build run-backend run-inference setup-tunnel clean

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install        Install frontend and script dependencies"
	@echo "  dev            Run frontend dev server"
	@echo "  build          Build frontend for production"
	@echo "  run-backend    Run backend server (port 8500)"
	@echo "  run-inference  Run MedGemma inference server (port 8400)"
	@echo "  setup-tunnel   Create Cloudflare tunnel (requires .env)"
	@echo "  docker-build   Build Docker images"
	@echo "  clean          Remove build artifacts"

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

setup-tunnel:
	python3 scripts/setup_tunnel.py

docker-build:
	docker build -f backend/Dockerfile -t medchat .
	docker build -f inference/Dockerfile -t medgemma-inference .

clean:
	rm -rf frontend/node_modules frontend/dist
	rm -rf __pycache__ */__pycache__
