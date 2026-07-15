FROM node:18-alpine AS webbuilder
WORKDIR /app
COPY web-client/package*.json ./
RUN npm ci
COPY web-client/ ./
RUN npm run build

FROM golang:1.26-alpine AS gobuilder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=webbuilder /app/dist ./web-client/dist
RUN CGO_ENABLED=0 go build -o /galickgun-server ./cmd/gb-server
RUN CGO_ENABLED=0 go build -o /galickgun-cli ./cmd/gb-cli

FROM alpine:latest
RUN apk --no-cache add ca-certificates
ENV GB_SERVER_HOST=0.0.0.0
WORKDIR /app
COPY --from=gobuilder /galickgun-server .
COPY --from=gobuilder /galickgun-cli .
COPY --from=webbuilder /app/dist ./web-client/dist
RUN mkdir -p data
EXPOSE 3000
CMD ["./galickgun-server"]
