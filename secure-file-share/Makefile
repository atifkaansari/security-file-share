.PHONY: dev-up dev-down dev-logs prod-up prod-down prod-logs build

# Development
dev-up:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

dev-down:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Production
prod-up:
	docker-compose -f docker-compose.yml up -d --build

prod-down:
	docker-compose -f docker-compose.yml down

prod-logs:
	docker-compose -f docker-compose.yml logs -f

# Utilities
migrate:
	docker-compose exec api npx prisma migrate dev

studio:
	docker-compose exec api npx prisma studio

shell:
	docker-compose exec api sh
