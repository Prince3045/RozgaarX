import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.activeSubscriptions = new Map(); // Stores destination -> callback for reconnection
    this.subscriptions = new Map();       // Stores destination -> stompSubscription
    this.pendingMessages = [];
  }

  connect(userId, token) {
    // Prevent duplicate connections
    if (this.stompClient && this.connected) return;

    const socket = new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws');
    this.stompClient = Stomp.over(socket);

    // Disable logging in production if needed, or leave enabled for development debugging
    this.stompClient.debug = (str) => console.log("[STOMP]", str);

    this.stompClient.connect(
      { Authorization: `Bearer ${token}` },
      () => {
        this.connected = true;
        console.log('Connected to WebSocket');
        
        // Automatically subscribe or re-subscribe all active subscriptions
        this.activeSubscriptions.forEach((callback, destination) => {
          console.log(`Subscribing to WebSocket channel: ${destination}`);
          try {
            const subscription = this.stompClient.subscribe(destination, callback);
            this.subscriptions.set(destination, subscription);
          } catch (err) {
            console.error(`Failed to subscribe to ${destination}:`, err);
          }
        });

        // Send any queued messages
        this.pendingMessages.forEach(msg => {
          this.stompClient.send(msg.destination, {}, JSON.stringify(msg.body));
        });
        this.pendingMessages = [];
      },
      (error) => {
        console.error('WebSocket connection error:', error);
        this.connected = false;
        // Retry connection after 5 seconds
        setTimeout(() => this.connect(userId, token), 5000);
      }
    );
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect(() => {
        console.log('Disconnected from WebSocket');
      });
      this.connected = false;
    }
  }

  subscribe(destination, callback) {
    // Save to active subscriptions so it can be restored on reconnect
    this.activeSubscriptions.set(destination, callback);

    if (this.stompClient && this.connected) {
      const subscription = this.stompClient.subscribe(destination, callback);
      this.subscriptions.set(destination, subscription);
      return subscription;
    }

    // Return a proxy object so the component can still call unsubscribe cleanly
    return {
      unsubscribe: () => this.unsubscribe(destination)
    };
  }

  unsubscribe(destination) {
    this.activeSubscriptions.delete(destination);
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      try {
        subscription.unsubscribe();
      } catch (err) {
        console.warn('Stomp unsubscribe failed (likely already disconnected):', err);
      }
      this.subscriptions.delete(destination);
    }
  }

  send(destination, body) {
    if (this.stompClient && this.connected) {
      this.stompClient.send(destination, {}, JSON.stringify(body));
    } else {
      this.pendingMessages.push({ destination, body });
    }
  }

  acceptJob(jobId, workerId) {
    this.send('/app/job/accept', { jobId, workerId });
  }

  declineJob(jobId, workerId) {
    this.send('/app/job/decline', { jobId, workerId });
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;