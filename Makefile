.PHONY: setup-tunnel install-scripts

install-scripts:
	pip install -r scripts/requirements.txt

setup-tunnel: install-scripts
	python scripts/setup_tunnel.py
