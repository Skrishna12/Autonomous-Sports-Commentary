.PHONY: bootstrap test up down eval

bootstrap:
	python -m ascs.cli bootstrap

test:
	pytest

eval:
	python eval/run_eval.py

up:
	docker compose up -d --build

down:
	docker compose down
