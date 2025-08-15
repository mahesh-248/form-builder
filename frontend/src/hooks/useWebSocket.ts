import { useState, useEffect, useRef } from 'react';
import wsClient from '@/lib/websocket';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  formId?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (event: string, data: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const currentOptions = optionsRef.current;

    // Event handlers
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
      currentOptions.onConnect?.();
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      currentOptions.onDisconnect?.(reason);
    };

    const handleError = (error: Error) => {
      setConnectionError(error.message);
      currentOptions.onError?.(error);
    };

    const handleMessage = (event: string, data: any) => {
      setLastMessage({ event, data, timestamp: Date.now() });
      currentOptions.onMessage?.(event, data);
    };

    // Register event listeners
    wsClient.on('connected', handleConnect);
    wsClient.on('disconnected', handleDisconnect);
    wsClient.on('error', handleError);
    wsClient.on('form_created', (data: any) => handleMessage('form_created', data));
    wsClient.on('form_updated', (data: any) => handleMessage('form_updated', data));
    wsClient.on('form_deleted', (data: any) => handleMessage('form_deleted', data));
    wsClient.on('form_published', (data: any) => handleMessage('form_published', data));
    wsClient.on('form_unpublished', (data: any) => handleMessage('form_unpublished', data));
    wsClient.on('response_submitted', (data: any) => handleMessage('response_submitted', data));
    wsClient.on('analytics_updated', (data: any) => handleMessage('analytics_updated', data));

    // Auto-connect if enabled
    if (currentOptions.autoConnect !== false) {
      wsClient.connect();
    }

    // Subscribe to specific form if formId provided
    if (currentOptions.formId && wsClient.getConnectionState().isConnected) {
      wsClient.subscribeToForm(currentOptions.formId);
    }

    // Cleanup function
    return () => {
      wsClient.off('connected', handleConnect);
      wsClient.off('disconnected', handleDisconnect);
      wsClient.off('error', handleError);
      wsClient.off('form_created');
      wsClient.off('form_updated');
      wsClient.off('form_deleted');
      wsClient.off('form_published');
      wsClient.off('form_unpublished');
      wsClient.off('response_submitted');
      wsClient.off('analytics_updated');
    };
  }, []);

  // Subscribe to form when formId changes
  useEffect(() => {
    if (options.formId && isConnected) {
      wsClient.subscribeToForm(options.formId);
    }
  }, [options.formId, isConnected]);

  const connect = () => {
    wsClient.connect();
  };

  const disconnect = () => {
    wsClient.disconnect();
    setIsConnected(false);
  };

  const subscribeToForm = (formId: string) => {
    if (isConnected) {
      wsClient.subscribeToForm(formId);
    }
  };

  return {
    isConnected,
    connectionError,
    lastMessage,
    connect,
    disconnect,
    subscribeToForm,
  };
}
