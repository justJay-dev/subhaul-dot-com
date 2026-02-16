dev:
	bun run dev
build:
	bun run build
preview:
	bun run preview
format:
	bun run format
wordpress-up:
	docker compose -f wordpress-docker-compose.yml up -d

ship-dev:
	@echo "Running TSC to confirm this will build..."
	tsc -p tsconfig.json
	@echo "Deploying..."
	bash patch.sh arm-07.velociraptor-opah.ts.net .ci/dev/.env
	@echo "Patching complete!"
	@echo "Building..."
	bash build-and-deploy.sh arm-07.velociraptor-opah.ts.net

ship-prod:
	@echo "Running TSC to confirm this will build..."
	tsc -p tsconfig.json
	@echo "Deploying..."
	bash patch.sh arm-11.velociraptor-opah.ts.net .ci/prod/.env
	@echo "Patching complete!"
	@echo "Building..."
	bash build-and-deploy.sh arm-11.velociraptor-opah.ts.net