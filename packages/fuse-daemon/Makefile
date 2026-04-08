.PHONY: build test lint

build:
	go build -ldflags="-s -w" -o ../../dist/fuse-daemon ./cmd/daemon

test:
	go test ./...

lint:
	golangci-lint run ./...
