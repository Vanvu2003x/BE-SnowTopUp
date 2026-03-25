const { verifyToken } = require("../services/jwt.service");
const { db } = require("../configs/drizzle");
const { users } = require("../db/schema");
const { eq } = require("drizzle-orm");

// Map: socketId -> userData
const userSocketMap = new Map();
// Map: userId -> Set of socketIds
const userIdToSockets = new Map();

let _io = null;

function trackSocket(socketId, userId) {
  if (!userIdToSockets.has(userId)) {
    userIdToSockets.set(userId, new Set());
  }
  userIdToSockets.get(userId).add(socketId);
}

function untrackSocket(socketId, userId) {
  if (userId && userIdToSockets.has(userId)) {
    userIdToSockets.get(userId).delete(socketId);
    if (userIdToSockets.get(userId).size === 0) {
      userIdToSockets.delete(userId);
    }
  }
}

async function getFreshBalance(userId) {
  try {
    const [user] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    return user?.balance ?? 0;
  } catch (error) {
    console.error("[Socket] Failed to fetch balance:", error.message);
    return 0;
  }
}

function initSocket(io) {
  _io = io;
  io.on("connection", async (socket) => {
    // Parse cookie from handshake
    const cookieString = socket.handshake.headers.cookie;
    let token = null;
    if (cookieString) {
      const tokenMatch = cookieString.match(/(?:^|;\s*)token=([^;]*)/);
      if (tokenMatch) {
        token = tokenMatch[1];
      }
    }

    if (token) {
      const { valid, decoded } = verifyToken(token);
      if (valid) {
        const { id, email, name } = decoded;
        const freshBalance = await getFreshBalance(id);
        const userData = { id, balance: freshBalance, email, name };
        userSocketMap.set(socket.id, userData);
        trackSocket(socket.id, id);
        socket.user = userData;
        socket.emit("authenticated", userData);
      }
    }

    // Keep manual auth for backward compatibility
    socket.on("auth", async (token) => {
      const { valid, decoded } = verifyToken(token);
      if (!valid) {
        socket.emit("error", { message: "Invalid token" });
        return;
      }
      const { id, email, name } = decoded;
      const freshBalance = await getFreshBalance(id);
      const userData = { id, balance: freshBalance, email, name };
      userSocketMap.set(socket.id, userData);
      trackSocket(socket.id, id);
      socket.user = userData;
      socket.emit("authenticated", userData);
    });

    socket.on("disconnect", () => {
      const userData = userSocketMap.get(socket.id);
      if (userData) {
        untrackSocket(socket.id, userData.id);
      }
      userSocketMap.delete(socket.id);
    });
  });
}

function getIO() {
  return _io;
}

function emitToUser(userId, event, data) {
  if (!_io) return;

  if (userIdToSockets.has(userId)) {
    const socketIds = userIdToSockets.get(userId);
    for (const socketId of socketIds) {
      if (userSocketMap.has(socketId)) {
        _io.to(socketId).emit(event, data);
      }
    }
  }
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  userSocketMap,
};
