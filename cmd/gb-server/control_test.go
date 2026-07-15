package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/pkg/api"
	"github.com/labstack/echo/v4"
)

type controlTestWorker struct{}

func (controlTestWorker) Fire(context.Context, engine.AttackParams, engine.Proxy, string, chan<- engine.AttackStats) error {
	return nil
}

func TestStartControlAcknowledgesValidRequest(t *testing.T) {
	eng := engine.NewEngine()
	eng.Registry().Register(engine.HTTPFlood, controlTestWorker{})
	control := newControlServer(eng, nil, []string{"GalickGun-Test/1.0"})

	e := echo.New()
	e.POST("/api/attacks/start", control.start)

	body := `{"clientId":"test-client","target":"http://127.0.0.1","attackMethod":"http_flood","duration":1,"packetDelay":100,"packetSize":64,"threads":1}`
	req := httptest.NewRequest(http.MethodPost, "/api/attacks/start", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	var response api.AttackAcceptedResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.OK {
		t.Fatalf("response rejected: %+v", response)
	}

	eng.Stop("client-test-client")
}
