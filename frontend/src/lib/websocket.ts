import { WebSocketMessage } from '@/types';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL || 'ws://localhost:8081';

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  private lastMessage: any = null;
  private pingInterval: NodeJS.Timeout | null = null;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Use native WebSocket with /ws endpoint
      const wsUrl = WEBSOCKET_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      console.log('Connecting to WebSocket:', `${wsUrl}/ws`);
      this.socket = new WebSocket(`${wsUrl}/ws`);

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        this.connectionError = null;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.stopPingInterval();
        this.emit('disconnected', event.reason);
        
        // Only auto-reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          this.handleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.connectionError = 'Connection failed';
        this.emit('error', error);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.lastMessage = data;
          console.log('WebSocket message received:', data);
          
          // Handle different message types based on backend format
          if (data.type) {
            // Emit the message type with the data
            this.emit(data.type, data.data || data);
            this.emit('message', data);
          } else {
            this.emit('message', data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionError = 'Failed to create connection';
    }
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventListeners.clear();
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  subscribeToForm(formId: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe_form',
        data: formId
      };
      this.socket.send(JSON.stringify(message));
      console.log('Subscribed to form:', formId);
    } else {
      console.log('WebSocket not connected, cannot subscribe to form:', formId);
    }
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.eventListeners.has(event)) {
      return;
    }

    if (callback) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Clear any existing socket
    if (this.socket) {
      this.socket = null;
    }
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  getConnectionState(): {
    isConnected: boolean;
    connectionError: string | null;
    lastMessage: any;
  } {
    return {
      isConnected: this.isConnected,
      connectionError: this.connectionError,
      lastMessage: this.lastMessage
    };
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
