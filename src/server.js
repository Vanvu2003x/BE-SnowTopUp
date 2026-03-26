require("dotenv").config();
const app = require('./app');
const http = require("http");
const { Server } = require("socket.io");
const { initSocket } = require("./sockets/websocket");

const PORT = process.env.PORT || 5000;
const SOCKET_PORT = process.env.SOCKET_PORT || 5001;

// API Server
const server = http.createServer(app);

// Separate Socket.IO Server
const socketServer = http.createServer();

// Socket.IO CORS configuration
const getAllowedOrigins = () => {
  const originsEnv = process.env.SOCKET_ORIGINS;
  if (originsEnv) {
    const origins = originsEnv.split(',').map(o => o.trim()).filter(Boolean);
    return origins;
  }
  if (process.env.NODE_ENV === 'production') {
    if (process.env.FRONTEND_URL) {
      return [process.env.FRONTEND_URL];
    }
    console.warn("⚠️ Production mode nhưng không có SOCKET_ORIGINS hoặc FRONTEND_URL!");
  }
  return true; // Allow all origins in development
};

const allowedOrigins = getAllowedOrigins();

const io = new Server(socketServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    credentials: false // Must be false when origin is "*"
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

initSocket(io);

// Start API Server
server.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});

// Start Socket.IO Server on separate port
socketServer.listen(SOCKET_PORT, () => {
  console.log(`🔌 Socket.IO Server running on port ${SOCKET_PORT}`);
});

// Background Job: Auto-fail pending transactions > 20 mins - Moved to cron.service
// const WalletLogService = require("./modules/walletLog/walletLog.service");
// setInterval is removed to prevent overlaps

// ✅ Initialize Cron Jobs
const { initCronJobs } = require('./services/cron.service');
initCronJobs().catch((error) => {
  console.error("Failed to initialize cron jobs:", error);
});


