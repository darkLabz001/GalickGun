package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/proxy"
	"github.com/galaticBlast/galaticBlast/pkg/api"
	"github.com/galaticBlast/galaticBlast/pkg/target"
	"github.com/labstack/echo/v4"
)

var clientIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)

type controlEvent struct {
	Type string `json:"type"`
	Data any    `json:"data,omitempty"`
}

type eventHub struct {
	mu      sync.RWMutex
	clients map[string]map[chan controlEvent]struct{}
}

func newEventHub() *eventHub {
	return &eventHub{clients: make(map[string]map[chan controlEvent]struct{})}
}

func (h *eventHub) subscribe(clientID string) (<-chan controlEvent, func()) {
	ch := make(chan controlEvent, 64)
	h.mu.Lock()
	if h.clients[clientID] == nil {
		h.clients[clientID] = make(map[chan controlEvent]struct{})
	}
	h.clients[clientID][ch] = struct{}{}
	h.mu.Unlock()

	return ch, func() {
		h.mu.Lock()
		if subscribers := h.clients[clientID]; subscribers != nil {
			delete(subscribers, ch)
			if len(subscribers) == 0 {
				delete(h.clients, clientID)
			}
		}
		h.mu.Unlock()
	}
}

func (h *eventHub) publish(clientID string, event controlEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients[clientID] {
		select {
		case ch <- event:
		default:
		}
	}
}

type controlServer struct {
	engine     *engine.Engine
	proxies    []engine.Proxy
	userAgents []string
	events     *eventHub
}

func newControlServer(eng *engine.Engine, proxies []engine.Proxy, userAgents []string) *controlServer {
	return &controlServer{
		engine:     eng,
		proxies:    proxies,
		userAgents: userAgents,
		events:     newEventHub(),
	}
}

func (s *controlServer) start(c echo.Context) error {
	var request api.StartAttackRequest
	if err := c.Bind(&request); err != nil {
		return c.JSON(http.StatusBadRequest, api.AttackAcceptedResponse{Message: "invalid request body"})
	}
	if !clientIDPattern.MatchString(request.ClientID) {
		return c.JSON(http.StatusBadRequest, api.AttackAcceptedResponse{Message: "invalid client ID"})
	}
	if err := api.ValidateStartAttackRequest(request); err != nil {
		return c.JSON(http.StatusBadRequest, api.AttackAcceptedResponse{Message: err.Error()})
	}

	method := engine.AttackKind(request.AttackMethod)
	filteredProxies := proxy.FilterByMethod(s.proxies, method)
	if len(filteredProxies) == 0 && len(s.proxies) > 0 {
		return c.JSON(http.StatusBadRequest, api.AttackAcceptedResponse{Message: "no compatible proxies are available"})
	}

	params := engine.AttackParams{
		Target:      request.Target,
		TargetNode:  target.ParseTarget(request.Target),
		Duration:    time.Duration(request.DurationSec) * time.Second,
		PacketDelay: time.Duration(request.PacketDelay) * time.Millisecond,
		PacketSize:  request.PacketSize,
		Method:      method,
		Threads:     request.Threads,
		Verbose:     true,
	}

	attackID := "client-" + request.ClientID
	s.engine.Stop(attackID)
	instance := s.engine.Start(attackID, params, filteredProxies, s.userAgents)
	if instance == nil {
		return c.JSON(http.StatusInternalServerError, api.AttackAcceptedResponse{Message: "the engine rejected the test parameters"})
	}

	go s.forwardStats(request.ClientID, instance)
	return c.JSON(http.StatusOK, api.AttackAcceptedResponse{OK: true, Proxies: len(filteredProxies)})
}

func (s *controlServer) stop(c echo.Context) error {
	var request api.StopAttackRequest
	if err := c.Bind(&request); err != nil || !clientIDPattern.MatchString(request.ClientID) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid client ID"})
	}
	s.engine.Stop("client-" + request.ClientID)
	return c.JSON(http.StatusOK, map[string]string{"status": "stopping"})
}

func (s *controlServer) stream(c echo.Context) error {
	clientID := c.QueryParam("clientId")
	if !clientIDPattern.MatchString(clientID) {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid client ID"})
	}

	response := c.Response()
	response.Header().Set(echo.HeaderContentType, "text/event-stream")
	response.Header().Set(echo.HeaderCacheControl, "no-cache")
	response.Header().Set(echo.HeaderConnection, "keep-alive")
	response.WriteHeader(http.StatusOK)

	flusher, ok := response.Writer.(http.Flusher)
	if !ok {
		return echo.NewHTTPError(http.StatusInternalServerError, "streaming unsupported")
	}
	events, unsubscribe := s.events.subscribe(clientID)
	defer unsubscribe()

	if err := writeControlEvent(response, controlEvent{Type: "ready"}); err != nil {
		return nil
	}
	flusher.Flush()

	for {
		select {
		case <-c.Request().Context().Done():
			return nil
		case event := <-events:
			if err := writeControlEvent(response, event); err != nil {
				return nil
			}
			flusher.Flush()
		}
	}
}

func (s *controlServer) forwardStats(clientID string, instance *engine.AttackInstance) {
	for stats := range instance.StatsCh {
		s.events.publish(clientID, controlEvent{Type: "stats", Data: api.StatsPayload{
			Timestamp:    stats.Timestamp.Unix(),
			PPS:          stats.PacketsPerS,
			TotalPackets: stats.TotalPackets,
			Proxies:      stats.Proxies,
			Log:          stats.Log,
		}})
	}
	s.events.publish(clientID, controlEvent{Type: "attackEnd"})
}

func writeControlEvent(response *echo.Response, event controlEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	_, err = fmt.Fprintf(response, "data: %s\n\n", payload)
	return err
}
