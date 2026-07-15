.PHONY: all build server cli webclient clean prepare

all: prepare build

prepare:
	cd web-client && npm install

build: server cli webclient

server:
	go build -o bin/gb-server ./cmd/gb-server

cli:
	go build -o bin/gb-cli ./cmd/gb-cli

webclient:
	cd web-client && npm run build

clean:
	rm -rf bin/ web-client/dist/ web-client/node_modules/

dev-server:
	go run ./cmd/gb-server

dev-client:
	cd web-client && npm run dev

dev: prepare
	concurrently "make dev-server" "make dev-client"
