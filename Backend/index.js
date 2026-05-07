const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const { connectDB, dropOldBusIndex } = require('./config/db');
const mainRoute = require('./routes/index.routes');
require('dotenv').config();
const initializeAdmin = require('./config/initializeAdmin');
const { processMissedTripsForToday } = require('./services/bookingLifecycle.service');
const Driver = require('./models/driver.model');
const Bus = require('./models/bus.model');
const TripSession = require('./models/tripSession.model');
const Route = require('./models/route.model');
const { detectAndUpdateCurrentStop } = require('./services/distanceUtils');
const { setIoInstance } = require('./services/ioManager');

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: ['https://hamrobus-auos.onrender.com', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000', 'http://192.168.1.72:8081', 'http://10.0.2.2:8081'],
      // include Expo web dev server (default port 19006)
      // and local dev host variants
      origin: ['https://hamrobus-auos.onrender.com', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000', 'http://localhost:19006', 'http://127.0.0.1:19006', 'http://192.168.1.72:8081', 'http://10.0.2.2:8081'],
    credentials: true,
  },
});

// Register io instance globally for use in controllers
setIoInstance(io);

const normalizeBusIds = (busIds) => {
  if (!Array.isArray(busIds)) return [];
  return busIds
    .map((id) => String(id || '').trim())
    .filter((id) => id.length > 0);
};

const getDriverRealtimeMeta = async ({ driverId, busId }) => {
  const [driverDoc, busDoc, activeTrip] = await Promise.all([
    driverId
      ? Driver.findById(driverId).select('firstName lastName profileImgUrl').lean()
      : Promise.resolve(null),
    busId
      ? Bus.findById(busId).select('busNumber').lean()
      : Promise.resolve(null),
    driverId
      ? TripSession.findOne({
          driverId,
          status: { $in: ['in-progress', 'on-break'] },
        })
          .sort({ updatedAt: -1 })
          .select('status')
          .lean()
      : Promise.resolve(null),
  ]);

  const tripStatus = activeTrip?.status || 'in-progress';

  return {
    busNumber: busDoc?.busNumber || '',
    driverName: [driverDoc?.firstName, driverDoc?.lastName].filter(Boolean).join(' ').trim(),
    driverProfileImgUrl: driverDoc?.profileImgUrl || '',
    tripStatus,
    isOnBreak: tripStatus === 'on-break',
  };
};

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Admin room
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin joined admin-room, socket:', socket.id);
    
    // Get all rooms for this socket
    const rooms = Array.from(socket.rooms);
    console.log('📋 Current rooms for this socket:', rooms);
  });
  
  // ===================== NOTIFICATION ROOMS =====================
  // Driver joins notification room
  socket.on('driver:join-notifications', ({ driverId }) => {
    socket.data.driverId = driverId;
    socket.join('drivers-room');
    console.log(`🚗 Driver ${driverId} joined drivers-room for notifications`);
  });

  // Passenger joins notification room
  socket.on('passenger:join-notifications', ({ passengerId }) => {
    socket.data.passengerId = passengerId;
    socket.join('passengers-room');
    socket.join('passenger:' + passengerId); // personal room for booking status events
    console.log(`👥 Passenger ${passengerId} joined passengers-room for notifications`);
  });

  // ===================== END NOTIFICATION ROOMS =====================
  
  // Driver joins their specific room
  socket.on('driver:join', ({ driverId }) => {
    socket.data.driverId = driverId;
    socket.join(`driver:${driverId}`);
    console.log(`🚗 Driver ${driverId} joined room`);
  });
  
  // Driver location broadcasting
  socket.on('driver:share-location', async (data) => {
    const { busId, driverId, latitude, longitude, heading, speed } = data;
    socket.data.driverId = driverId;
    socket.data.busId = busId;
    console.log(`📍 Driver ${driverId} location:`, { latitude, longitude });
    
    let locationPayload;
    let stopUpdate = null;
    
    try {
      // Get driver metadata for location payload
      const meta = await getDriverRealtimeMeta({ driverId, busId });
      locationPayload = {
        busId,
        busNumber: meta.busNumber,
        driverId,
        driverName: meta.driverName,
        driverProfileImgUrl: meta.driverProfileImgUrl,
        tripStatus: meta.tripStatus,
        isOnBreak: meta.isOnBreak,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date().toISOString(),
      };

      // ========== REAL-TIME STOP TRACKING ==========
      if (meta.tripStatus === 'in-progress') {
        try {
          // Fetch active trip session
          const activeTrip = await TripSession.findOne({
            driverId,
            status: 'in-progress',
          })
            .sort({ updatedAt: -1 })
            .lean();

          if (activeTrip) {
            // Fetch route and schedule for stop detection
            const [routeDoc, scheduleDoc] = await Promise.all([
              Route.findById(activeTrip.routeId).lean(),
              activeTrip.scheduleId
                ? Route.findById(activeTrip.routeId)
                    .select('schedules')
                    .lean()
                    .then((r) => {
                      if (!r) return null;
                      const sched = r.schedules?.id(activeTrip.scheduleId);
                      return sched;
                    })
                : Promise.resolve(null),
            ]);

            if (routeDoc) {
              // Detect if driver reached a new stop
              const stopDetection = await detectAndUpdateCurrentStop(
                activeTrip,
                latitude,
                longitude,
                routeDoc,
                scheduleDoc
              );

              if (stopDetection.changed) {
                stopUpdate = {
                  driverId,
                  busId,
                  currentStop: stopDetection.currentStop,
                  previousStop: stopDetection.previousStop,
                  stopSequence: stopDetection.stopSequence,
                  eta: stopDetection.eta,
                  tripId: String(activeTrip._id),
                  timestamp: new Date().toISOString(),
                };

                console.log(`🛑 [STOP CHANGED] Emitting driver:current-stop:`, stopUpdate);
              }
            }
          }
        } catch (error) {
          console.error('Error detecting stop update:', error);
        }
      }
      // ========== END STOP TRACKING ==========
    } catch (error) {
      console.error('Error enriching driver realtime metadata:', error);
      locationPayload = {
        busId,
        driverId,
        tripStatus: 'in-progress',
        isOnBreak: false,
        latitude,
        longitude,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date().toISOString(),
      };
    }
    
    // Broadcast location to all passengers tracking this bus
    io.to(`bus:${busId}`).emit('driver:location-update', locationPayload);
    console.log(`✅ Broadcast to bus:${busId}`);
    
    // Also broadcast to admin room for real-time monitoring
    io.to('admin-room').emit('driver:location-update', locationPayload);
    console.log('✅ Broadcast to admin-room');

    // Persist last known location to Bus document so admin/panel can show last location even if driver goes offline
    try {
      if (busId) {
        await Bus.findByIdAndUpdate(busId, {
          $set: {
            lastKnownLocation: {
              latitude: Number(latitude),
              longitude: Number(longitude),
              heading: heading || 0,
              speed: speed || 0,
              timestamp: new Date()
            }
          }
        }, { new: true });
      }
    } catch (err) {
      console.warn('Failed to persist lastKnownLocation for bus:', err.message || err);
    }

    // If stop changed, emit to admin and bus rooms
    if (stopUpdate) {
      io.to('admin-room').emit('driver:current-stop', stopUpdate);
      io.to(`bus:${busId}`).emit('driver:current-stop', stopUpdate);
      console.log(`✅ Broadcast driver:current-stop to admin-room and bus:${busId}`);
    }
  });

  socket.on('driver:go-offline', async (data = {}) => {
    const driverId = data.driverId || socket.data.driverId;
    const busId = data.busId || socket.data.busId;

    if (!driverId) {
      return;
    }

    let offlinePayload;
    try {
      const meta = await getDriverRealtimeMeta({ driverId, busId });
      offlinePayload = {
        driverId,
        driverName: meta.driverName,
        driverProfileImgUrl: meta.driverProfileImgUrl,
        busId,
        busNumber: meta.busNumber,
        tripStatus: meta.tripStatus,
        isOnBreak: meta.isOnBreak,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error enriching driver offline metadata:', error);
      offlinePayload = {
        driverId,
        busId,
        timestamp: new Date().toISOString(),
      };
    }

    if (busId) {
      io.to(`bus:${busId}`).emit('driver:location-offline', offlinePayload);
      console.log(`🛑 Broadcast offline to bus:${busId}`);
    }

    io.to('admin-room').emit('driver:location-offline', offlinePayload);
    console.log('🛑 Broadcast offline to admin-room');
  });
  
  // Passenger tracking
  socket.on('passenger:track-bus', ({ busId }) => {
    socket.join(`bus:${busId}`);
    console.log(`🚌 [PASSENGER] Socket ${socket.id} joined bus:${busId} room`);
    
    // Get all rooms this socket is in
    const rooms = Array.from(socket.rooms);
    console.log(`📋 [PASSENGER] Socket ${socket.id} is now in rooms:`, rooms);
  });

  socket.on('passenger:track-buses', ({ busIds }) => {
    const normalizedBusIds = normalizeBusIds(busIds);
    normalizedBusIds.forEach((busId) => {
      socket.join(`bus:${busId}`);
    });

    console.log(`🚌 [PASSENGER] Socket ${socket.id} joined ${normalizedBusIds.length} bus rooms`);
    const rooms = Array.from(socket.rooms);
    console.log(`📋 [PASSENGER] Socket ${socket.id} is now in rooms:`, rooms);
  });
  
  socket.on('passenger:stop-tracking', ({ busId }) => {
    socket.leave(`bus:${busId}`);
    console.log(`🛑 [PASSENGER] Socket ${socket.id} left bus:${busId} room`);
  });

  socket.on('passenger:stop-tracking-buses', ({ busIds }) => {
    const normalizedBusIds = normalizeBusIds(busIds);
    normalizedBusIds.forEach((busId) => {
      socket.leave(`bus:${busId}`);
    });
    console.log(`🛑 [PASSENGER] Socket ${socket.id} left ${normalizedBusIds.length} bus rooms`);
  });

  // ========== NEW: Handle bus room join/leave for occupancy updates ==========
  socket.on('passenger:join-bus-room', ({ busId }) => {
    if (!busId) return;
    socket.join(`bus:${busId}`);
    console.log(`✅ [PASSENGER] Socket ${socket.id} joined bus:${busId} room for real-time occupancy`);
  });

  socket.on('passenger:leave-bus-room', ({ busId }) => {
    if (!busId) return;
    socket.leave(`bus:${busId}`);
    console.log(`✅ [PASSENGER] Socket ${socket.id} left bus:${busId} room`);
  });
  // ========== END NEW ==========
  
  socket.on('disconnect', () => {
    const { driverId, busId, passengerId } = socket.data || {};
    
    // Handle driver disconnect
    if (driverId) {
      const offlinePayload = {
        driverId,
        busId,
        timestamp: new Date().toISOString(),
      };

      if (busId) {
        io.to(`bus:${busId}`).emit('driver:location-offline', offlinePayload);
      }

      io.to('admin-room').emit('driver:location-offline', offlinePayload);
      console.log(`🛑 Driver ${driverId} disconnected, emitted offline`);
    }

    // Handle passenger disconnect
    if (passengerId) {
      console.log(`🛑 Passenger ${passengerId} disconnected`);
    }

    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

app.use(
  cors({
    origin: ['https://hamrobus-auos.onrender.com', 'http://localhost:3000', 'http://localhost:8081','http://localhost:8082', 'http://localhost:19006', 'http://127.0.0.1:19006', 'http://192.168.1.73:8081', 'http://10.0.2.2:8081'] ,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());


app.use('/api', mainRoute); // Handles /api/users

const startMissedTripScheduler = () => {
  const intervalMinutes = Math.max(Number(process.env.MISSED_TRIP_CHECK_INTERVAL_MINUTES) || 1, 1);
  const intervalMs = intervalMinutes * 60 * 1000;
  let isRunning = false;

  const runMissedTripCheck = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      const result = await processMissedTripsForToday({io});
      if ((result?.totalCancelled || 0) > 0) {
        console.log(
          `🕒 Missed-trip check: cancelled ${result.totalCancelled} booking(s) across ${result.processed} schedule(s)`
        );
      }
    } catch (error) {
      console.error('Missed-trip scheduler error:', error);
    } finally {
      isRunning = false;
    }
  };

  // Run once shortly after startup, then on interval.
  setTimeout(runMissedTripCheck, 15 * 1000);
  setInterval(runMissedTripCheck, intervalMs);
  console.log(`🕒 Missed-trip scheduler started (every ${intervalMinutes} minute(s))`);
};

// Initialize database and drop old indexes
const startServer = async () => {
  await connectDB();
  await dropOldBusIndex();
  await initializeAdmin();
  startMissedTripScheduler();
  
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
