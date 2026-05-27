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
const { setupAccountDeletionCron } = require('./utils/accountDeletionCron');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['https://hamrobus-auos.onrender.com','https://hamro-bus.vercel.app', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000', 'http://192.168.1.72:8081', 'http://10.0.2.2:8081'],
      origin: ['https://hamrobus-auos.onrender.com','https://hamro-bus.vercel.app', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3000', 'http://localhost:19006', 'http://127.0.0.1:19006', 'http://192.168.1.72:8081', 'http://10.0.2.2:8081'],
    credentials: true,
  },
});

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

io.on('connection', (socket) => {

  socket.on('join-admin', () => {
    socket.join('admin-room');

    const rooms = Array.from(socket.rooms);
  });

  socket.on('driver:join-notifications', ({ driverId }) => {
    socket.data.driverId = driverId;
    socket.join('drivers-room');
  });

  socket.on('passenger:join-notifications', ({ passengerId }) => {
    socket.data.passengerId = passengerId;
    socket.join('passengers-room');
    socket.join('passenger:' + passengerId); // personal room for booking status events
  });


  socket.on('driver:join', ({ driverId }) => {
    socket.data.driverId = driverId;
    socket.join(`driver:${driverId}`);
  });

  socket.on('driver:share-location', async (data) => {
    const { busId, driverId, latitude, longitude, heading, speed } = data;
    socket.data.driverId = driverId;
    socket.data.busId = busId;

    let locationPayload;
    let stopUpdate = null;

    try {
      const meta = await getDriverRealtimeMeta({ driverId, busId });
      if (meta.isOnBreak) {
        return;
      }

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

      if (meta.tripStatus === 'in-progress') {
        try {
          const activeTrip = await TripSession.findOne({
            driverId,
            status: 'in-progress',
          })
            .sort({ updatedAt: -1 });

          if (activeTrip) {
            const [routeDoc, scheduleDoc] = await Promise.all([
              Route.findById(activeTrip.routeId).lean(),
              activeTrip.scheduleId
                ? Route.findById(activeTrip.routeId)
                    .select('schedules')
                    .lean()
                    .then((r) => {
                      if (!r) return null;
                      const sched = (r.schedules || []).find(
                        (schedule) => String(schedule?._id) === String(activeTrip.scheduleId)
                      );
                      return sched;
                    })
                : Promise.resolve(null),
            ]);

            if (routeDoc) {
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
                  nextStop: stopDetection.nextStop,
                  stopSequence: stopDetection.stopSequence,
                  eta: stopDetection.eta,
                  tripId: String(activeTrip._id),
                  timestamp: new Date().toISOString(),
                };

              }
            }
          }
        } catch (error) {
          console.error('Error detecting stop update:', error);
        }
      }
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

    io.to(`bus:${busId}`).emit('driver:location-update', locationPayload);

    io.to('admin-room').emit('driver:location-update', locationPayload);

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

    if (stopUpdate) {
      io.to('admin-room').emit('driver:current-stop', stopUpdate);
      io.to(`bus:${busId}`).emit('driver:current-stop', stopUpdate);
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
    }

    io.to('admin-room').emit('driver:location-offline', offlinePayload);
  });

  socket.on('passenger:track-bus', ({ busId }) => {
    socket.join(`bus:${busId}`);

    const rooms = Array.from(socket.rooms);
  });

  socket.on('passenger:track-buses', ({ busIds }) => {
    const normalizedBusIds = normalizeBusIds(busIds);
    normalizedBusIds.forEach((busId) => {
      socket.join(`bus:${busId}`);
    });

    const rooms = Array.from(socket.rooms);
  });

  socket.on('passenger:stop-tracking', ({ busId }) => {
    socket.leave(`bus:${busId}`);
  });

  socket.on('passenger:stop-tracking-buses', ({ busIds }) => {
    const normalizedBusIds = normalizeBusIds(busIds);
    normalizedBusIds.forEach((busId) => {
      socket.leave(`bus:${busId}`);
    });
  });

  socket.on('passenger:join-bus-room', ({ busId }) => {
    if (!busId) return;
    socket.join(`bus:${busId}`);
  });

  socket.on('passenger:leave-bus-room', ({ busId }) => {
    if (!busId) return;
    socket.leave(`bus:${busId}`);
  });

  socket.on('disconnect', () => {
    const { driverId, busId, passengerId} = socket.data || {};

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
    }

    if (passengerId) {
    }

  });
});

app.set('io', io);

app.use(
  cors({
    origin: ['https://hamrobus-auos.onrender.com','https://hamro-bus.vercel.app','http://localhost:3000', 'http://localhost:8081','http://localhost:8082', 'http://localhost:19006', 'http://127.0.0.1:19006', 'http://192.168.1.73:8081', 'http://10.0.2.2:8081'] ,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());


app.use('/api', mainRoute); // Handles /api/users

const startMissedTripScheduler = () => {
  const intervalMinutes = 1;
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
      }
    } catch (error) {
      console.error('Missed-trip scheduler error:', error);
    } finally {
      isRunning = false;
    }
  };

  setTimeout(runMissedTripCheck, 15 * 1000);
  setInterval(runMissedTripCheck, intervalMs);
};

const startServer = async () => {
  await connectDB();
  await dropOldBusIndex();
  await initializeAdmin();
  startMissedTripScheduler();

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    setupAccountDeletionCron();
  });
};

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
