package websocket

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
)

// Client represents a WebSocket client
type Client struct {
	Conn   *websocket.Conn
	Send   chan []byte
	Hub    *Hub
	FormID string
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	Clients map[*Client]bool

	// Inbound messages from the clients
	Broadcast chan []byte

	// Register requests from the clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client
}

// Message represents a WebSocket message
type Message struct {
	Type    string      `json:"type"`
	FormID  string      `json:"form_id,omitempty"`
	Data    interface{} `json:"data"`
	EventID string      `json:"event_id,omitempty"`
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.Clients[client] = true
			log.Printf("Client connected. Total clients: %d", len(h.Clients))

		case client := <-h.Unregister:
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
				log.Printf("Client unregistered. Total clients: %d", len(h.Clients))
			}

		case message := <-h.Broadcast:
			for client := range h.Clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
		}
	}
}

// BroadcastToForm sends a message to all clients subscribed to a specific form
func (h *Hub) BroadcastToForm(formID string, messageType string, data interface{}) {
	message := Message{
		Type:   messageType,
		FormID: formID,
		Data:   data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling WebSocket message: %v", err)
		return
	}

	for client := range h.Clients {
		// If client is subscribed to this form or no specific form (general subscription)
		if client.FormID == "" || client.FormID == formID {
			select {
			case client.Send <- jsonData:
			default:
				close(client.Send)
				delete(h.Clients, client)
			}
		}
	}
}

// BroadcastGeneral sends a message to all connected clients
func (h *Hub) BroadcastGeneral(messageType string, data interface{}) {
	message := Message{
		Type: messageType,
		Data: data,
	}

	jsonData, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling WebSocket message: %v", err)
		return
	}

	h.Broadcast <- jsonData
}

// HandleWebSocket handles WebSocket connections
func HandleWebSocket(c *websocket.Conn, hub *Hub) {
	remote := "unknown"
	if c != nil && c.Conn != nil && c.Conn.RemoteAddr() != nil {
		remote = c.Conn.RemoteAddr().String()
	}
	log.Printf("[WS] New connection from %s", remote)
	client := &Client{Conn: c, Send: make(chan []byte, 256), Hub: hub}

	client.Hub.Register <- client

	// Optional greeting
	greeting := Message{Type: "ws_greeting", Data: map[string]interface{}{"message": "connected", "ts": time.Now().Unix()}}
	if b, err := json.Marshal(greeting); err == nil {
		select {
		case client.Send <- b:
		default:
			log.Printf("[WS] Unable to queue greeting to %s (send buffer full)", remote)
		}
	}

	// Start writer in separate goroutine, keep reader in this handler to prevent premature close
	go client.writePump()
	client.readPump()
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing WebSocket message: %v", err)
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		log.Printf("[WS] Client disconnect cleanup; SubscribedForm=%s ActiveClients(before)=%d", c.FormID, len(c.Hub.Clients))
		c.Hub.Unregister <- c
		_ = c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512 * 1024) // 512KB
	c.Conn.SetReadDeadline(time.Now().Add(70 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(70 * time.Second))
		return nil
	})

	for {
		mt, payload, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Unexpected close: %v", err)
			} else {
				log.Printf("[WS] Read loop end: %v", err)
			}
			return
		}

		c.Conn.SetReadDeadline(time.Now().Add(70 * time.Second))

		if mt != websocket.TextMessage { // ignore binary / ping / pong frames; library handles ctrl frames
			continue
		}

		var msg Message
		if err := json.Unmarshal(payload, &msg); err != nil {
			log.Printf("[WS] Bad JSON frame len=%d err=%v data=%s", len(payload), err, truncateForLog(payload, 180))
			continue
		}

		log.Printf("[WS] Inbound Type=%s Form=%s DataType=%T", msg.Type, msg.FormID, msg.Data)

		switch msg.Type {
		case "subscribe_form":
			if formIDStr, ok := msg.Data.(string); ok {
				c.FormID = formIDStr
				log.Printf("[WS] Subscribed to form %s", formIDStr)
			} else {
				log.Printf("[WS] subscribe_form invalid payload: %#v", msg.Data)
			}
		case "ping":
			pong := Message{Type: "pong", Data: "pong"}
			if b, err := json.Marshal(pong); err == nil {
				select {
				case c.Send <- b:
				default:
					log.Printf("[WS] Drop pong (buffer full)")
				}
			}
		default:
			// ignore unknown
		}
	}
}

func truncateForLog(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return fmt.Sprintf("%s...(%d bytes)", string(b[:max]), len(b))
}
