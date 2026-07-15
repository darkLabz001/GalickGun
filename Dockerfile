FROM node:18-alpine AS webbuilder
WORKDIR /app
COPY web-client/package*.json ./
RUN npm ci
COPY web-client/ ./
RUN npm run build

FROM golang:1.22-alpine AS gobuilder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=webbuilder /app/dist ./web-client/dist
RUN CGO_ENABLED=0 go build -o /gb-server ./cmd/gb-server
RUN CGO_ENABLED=0 go build -o /gb-cli ./cmd/gb-cli

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=gobuilder /gb-server .
COPY --from=gobuilder /gb-cli .
COPY --from=webbuilder /app/dist ./web-client/dist
RUN mkdir -p data
EXPOSE 3000
CMD ["./gb-server"]
