import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.pendingSubscriptions = [];
    this.pendingMessages = [];
  }

  connect(userId, token) {
    const socket = new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8081/ws');
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect(
      { Authorization: `Bearer ${token}` },
      () => {
        this.connected = true;
        console.log('Connected to WebSocket');
        
        this.pendingSubscriptions.forEach(sub => {
          const subscription = this.stompClient.subscribe(sub.destination, sub.callback);
          this.subscriptions.set(sub.destination, subscription);
        });
        this.pendingSubscriptions = [];

        this.pendingMessages.forEach(msg => {
          this.stompClient.send(msg.destination, {}, JSON.stringify(msg.body));
        });
        this.pendingMessages = [];
      },
      (error) => {
        console.error('WebSocket connection error:', error);
        this.connected = false;
        setTimeout(() => this.connect(userId, token), 5000);
      }
    );
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
      this.connected = false;
    }
  }

  subscribe(destination, callback) {
    if (this.stompClient && this.connected) {
      const subscription = this.stompClient.subscribe(destination, callback);
      this.subscriptions.set(destination, subscription);
      return subscription;
    } else {
      this.pendingSubscriptions.push({ destination, callback });
      return { unsubscribe: () => {
        this.pendingSubscriptions = this.pendingSubscriptions.filter(s => s.destination !== destination);
      }};
    }
  }

  unsubscribe(destination) {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
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