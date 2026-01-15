.PHONY: install dev build run-backend run-inference setup-tunnel clean

install:
	cd frontend && npm install
	pip install -r scripts/requirements.txt

dev:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

run-backend:
	cd backend && python server.py

run-inference:
	cd inference && python inference_server.py

setup-tunnel:
	python scripts/setup_tunnel.py

docker-build:
	docker build -f backend/Dockerfile -t medchat .
	docker build -f inference/Dockerfile -t medgemma-inference .

clean:
	rm -rf frontend/node_modules frontend/dist
	rm -rf __pycache__ */__pycache__
