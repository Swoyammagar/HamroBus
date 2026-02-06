const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const connectDB = require('./config/db');
const mainRoute = require('./routes/index.routes');
require('dotenv').config();
const initializeAdmin = require('./config/initializeAdmin');

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000', 'http://192.168.1.72:8081', 'http://10.0.2.2:8081'],
    credentials: true,
  },
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Admin room
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('Admin joined room');
  });
  
  // Driver location broadcasting
  socket.on('driver:share-location', (data) => {
    const { busId, driverId, latitude, longitude, heading, speed } = data;
    console.log(`📍 Driver ${driverId} location:`, { latitude, longitude });
    
    // Broadcast to all passengers tracking this bus
    io.to(`bus:${busId}`).emit('driver:location-update', {
      busId,
      driverId,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Passenger tracking
  socket.on('passenger:track-bus', ({ busId }) => {
    console.log(`🚌 Passenger ${socket.id} tracking bus ${busId}`);
    socket.join(`bus:${busId}`);
  });
  
  socket.on('passenger:stop-tracking', ({ busId }) => {
    console.log(`🛑 Passenger ${socket.id} stopped tracking bus ${busId}`);
    socket.leave(`bus:${busId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

app.use(
  cors({
    origin: ['http://localhost:8081','http://localhost:8082', 'http://192.168.1.73:8081', 'http://10.0.2.2:8081'] ,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());


app.use('/api', mainRoute); // Handles /api/users

connectDB();
initializeAdmin();

const PORT = process.env.PORT || 5000;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
