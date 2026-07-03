const TripSession = require('../models/tripSession.model');
const Driver = require('../models/driver.model');
const Route = require('../models/route.model');
const Bus = require('../models/bus.model');
const Booking = require('../models/booking.model');
const {
    syncBookingsOnTripStart,
    completeBookingsByReachedStop,
    completeAllInProgressBookingsForTrip,
    processMissedTripsForToday,
} = require('../services/bookingLifecycle.service');
const Notification = require('../models/notification.model');
const { v4: uuidv4 } = require('uuid');
const { sendPushToUsers } = require('../services/pushNotificationService');
const { clearTripSpeedHistory } = require('../services/arrivalEta.service');
const { clearArrivalNotificationTripCache } = require('../services/arrivalNotification.service');
const { calculateStartDelayMinutes } = require('../utils/tripDelay');

const normalize = (v) => String(v || '').trim().toLowerCase();
const NEPAL_TIME_OFFSET_MINUTES = 5 * 60 + 45;

const parseNepalDateBoundary = (value, boundary) => {
    if (!value || typeof value !== 'string') return null;

    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!dateOnlyMatch) {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const [, yearRaw, monthRaw, dayRaw] = dateOnlyMatch;
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    const day = Number(dayRaw);
    const parsedDateOnly = new Date(Date.UTC(year, monthIndex, day));
    if (
        parsedDateOnly.getUTCFullYear() !== year ||
        parsedDateOnly.getUTCMonth() !== monthIndex ||
        parsedDateOnly.getUTCDate() !== day
    ) {
        return null;
    }

    const utcStartMs = Date.UTC(year, monthIndex, day) - (NEPAL_TIME_OFFSET_MINUTES * 60 * 1000);
    const utcMs = boundary === 'end'
        ? utcStartMs + (24 * 60 * 60 * 1000) - 1
        : utcStartMs;

    const date = new Date(utcMs);
    return Number.isNaN(date.getTime()) ? null : date;
};

const buildDriverStatusPayload = async ({ trip, driverId }) => {
    const [driverDoc, busDoc] = await Promise.all([
        Driver.findById(driverId).select('firstName lastName profileImgUrl').lean(),
        trip?.busId ? Bus.findById(trip.busId).select('busNumber').lean() : Promise.resolve(null),
    ]);

    const tripStatus = String(trip?.status || 'in-progress');

    return {
        driverId: String(driverId),
        driverName: [driverDoc?.firstName, driverDoc?.lastName].filter(Boolean).join(' ').trim(),
        driverProfileImgUrl: driverDoc?.profileImgUrl || '',
        busId: trip?.busId ? String(trip.busId) : '',
        busNumber: busDoc?.busNumber || '',
        tripId: trip?._id ? String(trip._id) : '',
        tripStatus,
        isOnBreak: tripStatus === 'on-break',
        timestamp: new Date().toISOString(),
    };
};

const notifyPassengersTripStarted = async ({ io, trip, routeDoc, scheduleDoc, delayMinutes = 0 }) => {
  if (!trip || !scheduleDoc) return;

  const bookingRows = await Booking.find({
    tripSessionId: trip._id,
    status: { $in: ['in-progress', 'confirmed'] },
  })
    .populate('passengerId', 'firstName lastName')
    .select('bookingCode passengerId destinationStop')
    .lean();

  const stopArrivals = scheduleDoc.stopArrivals || [];

  for (const b of bookingRows) {
    const passengerId = String(b.passengerId?._id || '');
    if (!passengerId) continue;

    const etaMatch = stopArrivals.find((s) =>
      normalize(s.stopName) === normalize(b.destinationStop?.stopName)
    );
    const eta = etaMatch?.arrivalTime || scheduleDoc.endTime || 'N/A';
    const passengerName = [b.passengerId?.firstName, b.passengerId?.lastName].filter(Boolean).join(' ').trim() || 'Passenger';
        const delayText = delayMinutes > 0
            ? ` Your trip started ${delayMinutes} minutes late.`
            : ' Your trip started on time.';

    const title = 'Trip started';
        const message = `Hi ${passengerName}.${delayText} Expected arrival at ${b.destinationStop?.stopName || 'your stop'} is around ${eta}. (Booking ${b.bookingCode})`;

    const doc = await Notification.create({
      notificationId: `notif_${uuidv4()}`,
      title,
      message,
      sentBy: 'system',
      targetAudience: 'passengers',
      targetUserIds: [passengerId],
      status: 'sent',
      type: 'info',
      severity: 'medium',
    });

    if (io) {
      io.to('passenger:' + passengerId).emit('notification:new', {
        _id: String(doc._id),
        notificationId: doc.notificationId,
        title: doc.title,
        message: doc.message,
        type: doc.type,
        severity: doc.severity,
        sentBy: doc.sentBy,
        targetAudience: doc.targetAudience,
        createdAt: doc.createdAt,
      });
    }

    sendPushToUsers({
      userType: 'passenger',
      userIds: [passengerId],
      title,
      body: message,
      data: {
        notificationId: doc.notificationId,
        bookingCode: b.bookingCode,
        tripId: String(trip._id),
        type: 'trip_started',
        url: '/passenger/notifications',
      },
      priority: 'high',
    }).catch((pushError) => {
      console.error('Passenger trip started push failed:', pushError);
    });
  }
};

const emitPassengerBookingStatusEvents = ({ io, trip, changedBookings }) => {
  if (!io || !trip || !Array.isArray(changedBookings) || changedBookings.length === 0) return;

  for (const booking of changedBookings) {
    const payload = {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      passengerId: booking.passengerId,
      status: booking.status,
      tripId: String(trip._id),
      routeId: String(trip.routeId),
      busId: String(trip.busId || ''),
      scheduleId: String(trip.scheduleId || ''),
      startedAt: booking.startedAt || null,
      completedAt: booking.completedAt || null,
      timestamp: new Date().toISOString(),
    };

    io.to('passenger:' + booking.passengerId).emit('booking:status-updated', payload);

    if (booking.status === 'completed') {
      io.to('passenger:' + booking.passengerId).emit('booking:completed', payload);
    }
  }
};

const parseQrPayload = (rawQrData) => {
    try {
        if (typeof rawQrData !== 'string') return null;
        const parsed = JSON.parse(rawQrData);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        console.error("Error parsing QR payload:", error);
        return null;
    }
}

const getUtcDayRange = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
};

const getAssignedRoute = async (req, res) => {
    const driverId = req.user.id; // From JWT middleware

    try {
        const driver = await Driver.findById(driverId).populate({
            path: 'assignedBus',
            select: 'busNumber registrationNumber assignedRouteId _id'
        });

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        if (!driver.assignedBus || !driver.assignedBus.assignedRouteId) {
            return res.status(404).json({ message: "No bus or route assigned to this driver" });
        }

        const routeId = driver.assignedBus.assignedRouteId;
        const busId = driver.assignedBus._id;

        const route = await Route.findById(routeId)
            .populate('assignedBusIds', 'busNumber model')
            .populate('assignedDriverIds', 'firstName lastName')
            .populate('schedules.driverId', 'firstName lastName licenseNo')
            .populate('schedules.busId', 'busNumber registrationNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        const driverSchedules = (route.schedules || []).filter(
            schedule => {
                const scheduleDriverId = schedule.driverId?._id?.toString() || schedule.driverId?.toString();
                const scheduleBusId = schedule.busId?._id?.toString() || schedule.busId?.toString();
                return scheduleDriverId === driverId.toString() && scheduleBusId === busId.toString();
            }
        );


        const responseData = {
            route: route,
            bus: {
                _id: driver.assignedBus._id,
                busNumber: driver.assignedBus.busNumber,
                registrationNumber: driver.assignedBus.registrationNumber
            },
            driverSchedules: driverSchedules
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error fetching assigned route:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getDriverSchedules = async (req, res) => {
    const driverId = req.user.id;
    const { days = 7 } = req.query; // Default 7 days

    try {
        const driver = await Driver.findById(driverId).populate({
            path: 'assignedBus',
            select: 'busNumber assignedRouteId _id'
        });

        if (!driver || !driver.assignedBus || !driver.assignedBus.assignedRouteId) {
            return res.status(404).json({ message: "No route assigned" });
        }

        const routeId = driver.assignedBus.assignedRouteId;
        const busId = driver.assignedBus._id;

        const route = await Route.findById(routeId)
            .populate('schedules.driverId', 'firstName lastName licenseNo')
            .populate('schedules.busId', 'busNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        const driverSchedules = (route.schedules || []).filter(
            schedule => {
                const scheduleDriverId = schedule.driverId?._id?.toString() || schedule.driverId?.toString();
                const scheduleBusId = schedule.busId?._id?.toString() || schedule.busId?.toString();
                return scheduleDriverId === driverId.toString() && scheduleBusId === busId.toString();
            }
        );


        const upcomingTrips = await TripSession.find({
            driverId: driverId,
            status: { $in: ['scheduled', 'in-progress', 'on-break'] }
        })
            .populate('routeId', 'routeName source destination')
            .populate('busId', 'busNumber')
            .sort({ startTime: 1 })
            .limit(parseInt(days) * 10); // Rough estimate: 10 trips per day

        res.status(200).json({
            schedules: driverSchedules,
            upcomingTrips: upcomingTrips
        });

    } catch (error) {
        console.error("Error fetching driver schedules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getCurrentTrip = async (req, res) => {
    const driverId = req.user.id;

    try {
        const currentTrip = await TripSession.findOne({
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        })
            .populate('routeId', 'routeName stops source destination')
            .populate('busId', 'busNumber registrationNumber totalCapacity');

        if (!currentTrip) {
            return res.status(404).json({ message: "No active trip" });
        }

        res.status(200).json(currentTrip);

    } catch (error) {
        console.error("Error fetching current trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const startTrip = async (req, res) => {
    const driverId = req.user.id;
    const { routeId, busId, scheduleId } = req.body;

    try {
        if (!routeId) {
            return res.status(400).json({ message: "routeId is required" });
        }

        const routeDoc = await Route.findById(routeId).select('routeName schedules');
        if (!routeDoc) {
            return res.status(404).json({ message: "Route not found" });
        }

        let scheduleDoc = null;
        if (scheduleId) {
            scheduleDoc = routeDoc.schedules?.id(scheduleId) || null;
            if (!scheduleDoc) {
                return res.status(404).json({ message: "Schedule not found for this route" });
            }
        }

        const existingTrip = await TripSession.findOne({
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        });

        if (existingTrip) {
            return res.status(400).json({ message: "Driver already has an active trip" });
        }

        let finalBusId = busId;
        if (!finalBusId) {
            const driver = await Driver.findById(driverId).populate('assignedBus', '_id');
            if (driver && driver.assignedBus) {
                finalBusId = driver.assignedBus._id;
            }
        }

        const actualStartTime = new Date();
        const startDelayMinutes = calculateStartDelayMinutes(scheduleDoc, actualStartTime);

        const newTrip = new TripSession({
            driverId: driverId,
            routeId: routeId,
            busId: finalBusId || null,
            scheduleId: scheduleId || null,
            status: 'in-progress',
            startTime: actualStartTime,
            startDelayMinutes,
            passengerCount: 0,
            completedStops: [],
            breakHistory: []
        });

        await newTrip.save();

        await newTrip.populate('routeId', 'routeName stops source destination');
        await newTrip.populate('busId', 'busNumber');

        const bookingSyncStats = await syncBookingsOnTripStart({ trip: newTrip });


        const io = req.app.get('io');
        if (io) {
            io.to(`driver:${driverId}`).emit('trip:started', newTrip);
            io.to(`driver:${driverId}`).emit('trip:updated', newTrip);
            emitPassengerBookingStatusEvents({
                io,
                trip: newTrip,
                changedBookings: bookingSyncStats.changedBookings || [],
            });
        }
        if (scheduleDoc) {
            try {
                await notifyPassengersTripStarted({
                    io,
                    trip: newTrip,
                    routeDoc,
                    scheduleDoc,
                    delayMinutes: startDelayMinutes,
                });
            } catch (notifyError) {
                console.error('Failed to notify passengers on trip start:', notifyError);
            }
        }

        res.status(201).json({
            message: "Trip started successfully",
            trip: newTrip,
            bookingSync: bookingSyncStats
        });

    } catch (error) {
        console.error("Error starting trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const endTrip = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        if (!tripId) {
            return res.status(400).json({ message: "tripId is required" });
        }

        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        });

        if (!trip) {
            return res.status(404).json({ message: "Trip not found or already completed" });
        }

        trip.status = 'completed';
        trip.endTime = new Date();
        await trip.save();
        clearTripSpeedHistory(trip._id);
        clearArrivalNotificationTripCache(trip._id);

        const bookingCompletionStats = await completeAllInProgressBookingsForTrip({ trip });

        const io = req.app.get('io');
        if (io) {
            io.to(`driver:${driverId}`).emit('trip:ended', trip);
            io.to(`driver:${driverId}`).emit('trip:updated', trip);
            emitPassengerBookingStatusEvents({
                io,
                trip,
                changedBookings: bookingCompletionStats.changedBookings || [],
            });
            if (trip.busId) {
                try {
                    const Bus = require('../models/bus.model');
                    await Bus.findByIdAndUpdate(trip.busId, { currentPassengers: 0, updatedAt: new Date() });
                    io.to(`bus:${String(trip.busId)}`).emit('trip:occupancy-updated', {
                        tripId: String(trip._id),
                        busId: String(trip.busId),
                        passengerCount: 0,
                        timestamp: new Date().toISOString(),
                    });
                } catch (busResetErr) {
                    console.error('Error resetting bus occupancy on trip end:', busResetErr);
                }
            }
        }

        res.status(200).json({
            message: "Trip ended successfully",
            trip: trip,
            bookingCompletion: bookingCompletionStats
        });

    } catch (error) {
        console.error("Error ending trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const startBreak = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: 'in-progress'
        });

        if (!trip) {
            return res.status(404).json({ message: "Active trip not found" });
        }

        trip.status = 'on-break';
        trip.breakHistory.push({
            breakStartTime: new Date()
        });

        await trip.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`driver:${driverId}`).emit('trip:updated', trip);
            const statusPayload = await buildDriverStatusPayload({ trip, driverId });
            if (statusPayload.busId) {
                io.to(`bus:${statusPayload.busId}`).emit('driver:status-update', statusPayload);
            }
            io.to('admin-room').emit('driver:status-update', statusPayload);
        }

        res.status(200).json({
            message: "Break started",
            trip: trip
        });

    } catch (error) {
        console.error("Error starting break:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const endBreak = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: 'on-break'
        });

        if (!trip) {
            return res.status(404).json({ message: "No active break found" });
        }

        const lastBreak = trip.breakHistory[trip.breakHistory.length - 1];
        if (lastBreak && !lastBreak.breakEndTime) {
            const breakEndTime = new Date();
            lastBreak.breakEndTime = breakEndTime;

            const durationMs = breakEndTime - lastBreak.breakStartTime;
            const durationMinutes = Number((durationMs / (1000 * 60)).toFixed(2));
            lastBreak.duration = durationMinutes;

            trip.totalBreakTime += durationMinutes;
        }

        trip.status = 'in-progress';
        await trip.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`driver:${driverId}`).emit('trip:updated', trip);
            const statusPayload = await buildDriverStatusPayload({ trip, driverId });
            if (statusPayload.busId) {
                io.to(`bus:${statusPayload.busId}`).emit('driver:status-update', statusPayload);
            }
            io.to('admin-room').emit('driver:status-update', statusPayload);
        }

        res.status(200).json({
            message: "Break ended",
            trip: trip
        });

    } catch (error) {
        console.error("Error ending break:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updatePassengerCount = async (req, res) => {
    const driverId = req.user.id;
    const { tripId, stopId, passengersBoarded, passengersAlighted } = req.body;

    try {
        if (!tripId) {
            return res.status(400).json({ message: "tripId is required" });
        }

        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId
        });

        if (!trip) {
            return res.status(404).json({ message: "Trip not found" });
        }

        const boarded = Number(passengersBoarded || 0);
        const alighted = Number(passengersAlighted || 0);
        const normalizedStopId = typeof stopId === 'string' ? stopId.trim() : '';

        const previousOccupancy = trip.passengerCount || 0;
        trip.passengerCount = Math.max(0, previousOccupancy + boarded - alighted);

        if (normalizedStopId && (boarded > 0 || alighted > 0)) {
            if (!trip.occupancyHistory) {
                trip.occupancyHistory = [];
            }
            trip.occupancyHistory.push({
                timestamp: new Date(),
                stopName: normalizedStopId,
                passengersBoarded: boarded,
                passengersAlighted: alighted,
                currentOccupancy: trip.passengerCount,
                eventType: 'manual-update'
            });
        }

        if (normalizedStopId) {
            const alreadyCompleted = trip.completedStops?.some(
                completed => completed.stopId === normalizedStopId
            );

            if (!alreadyCompleted) {
                trip.completedStops.push({
                    stopId: normalizedStopId,
                    completionTime: new Date(),
                    passengersBoarded: boarded,
                    passengersAlighted: alighted
                });
            }

            trip.currentStop = normalizedStopId;
        }

        await trip.save();

        const io = req.app.get('io');

        const bookingCompletionStats = normalizedStopId
            ? await completeBookingsByReachedStop({ trip, reachedStopName: normalizedStopId, io })
            : { matched: 0, modified: 0 };

        if (normalizedStopId) {
        }

        if (io) {
            io.to(`driver:${driverId}`).emit('trip:updated', trip);

            if (trip.busId) {
                try {
                    const occupancyData = {
                        tripId: String(trip._id),
                        busId: String(trip.busId),
                        passengerCount: trip.passengerCount,
                        timestamp: new Date().toISOString()
                    };

                    io.to(`bus:${trip.busId}`).emit('trip:occupancy-updated', occupancyData);

                    if (trip.currentStop) {
                        let nextStopName = null;
                        try {
                            const routeDoc = await Route.findById(trip.routeId).select('stops').lean();
                            const currentStop = (routeDoc?.stops || []).find(
                                (stop) => normalize(stop.stopName) === normalize(trip.currentStop)
                            );
                            const currentSequence = Number(currentStop?.sequence || -1);
                            const nextStop = (routeDoc?.stops || [])
                                .filter((stop) => Number(stop.sequence || -1) > currentSequence)
                                .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0];
                            nextStopName = nextStop?.stopName || null;
                        } catch (nextStopError) {
                            console.error('Error resolving next stop:', nextStopError);
                        }

                        const stopData = {
                            tripId: String(trip._id),
                            busId: String(trip.busId),
                            currentStop: trip.currentStop,
                            previousStop: trip.completedStops?.[trip.completedStops.length - 2]?.stopId || null,
                            nextStop: nextStopName,
                            timestamp: new Date().toISOString()
                        };
                        io.to(`bus:${trip.busId}`).emit('driver:current-stop', stopData);
                    }
                } catch (emitError) {
                    console.error('Error emitting updates to bus room:', emitError);
                }
            }
        }

        if (trip.busId) {
            try {
                await Bus.findByIdAndUpdate(
                    trip.busId,
                    {
                        currentPassengers: trip.passengerCount,
                        updatedAt: new Date()
                    },
                    { new: true }
                );
            } catch (updateBusError) {
                console.error('Error persisting occupancy to Bus DB:', updateBusError);
            }
        }

        res.status(200).json({
            message: "Passenger count updated",
            trip: trip,
            bookingCompletion: bookingCompletionStats
        });

    } catch (error) {
        console.error("Error updating passenger count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getTripHistory = async (req, res) => {
    const driverId = req.user.id;
    const { limit = 20, skip = 0 } = req.query;

    try {
        const trips = await TripSession.find({
            driverId: driverId,
            status: { $in: ['completed', 'cancelled', 'missed'] }
        })
            .populate('routeId', 'routeName source destination')
            .populate('busId', 'busNumber')
            .sort({ updatedAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await TripSession.countDocuments({
            driverId: driverId,
            status: { $in: ['completed', 'cancelled', 'missed'] }
        });

        const enrichedTrips = trips.map(trip => ({
            ...trip.toObject(),
            currentOccupancy: trip.passengerCount || 0,
            occupancyHistory: trip.occupancyHistory || []
        }));

        res.status(200).json({
            trips: enrichedTrips,
            total: total,
            hasMore: skip + trips.length < total
        });

    } catch (error) {
        console.error("Error fetching trip history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getTodayCompletedTrips = async (req, res) => {
    const driverId = req.user.id;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const completedTrips = await TripSession.find({
            driverId: driverId,
            status: 'completed',
            endTime: { $gte: today, $lt: tomorrow }
        })
            .populate('routeId', 'routeName')
            .populate('busId', 'busNumber')
            .select('scheduleId startTime endTime');

        res.status(200).json({
            completedTrips: completedTrips,
            count: completedTrips.length
        });

    } catch (error) {
        console.error("Error fetching today's completed trips:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getScheduleSeatMap = async (req, res) => {
    const driverId = req.user.id;
    const { scheduleId, serviceDate } = req.query;

    try {
        if (!scheduleId || !serviceDate) {
            return res.status(400).json({ message: 'scheduleId and serviceDate are required' });
        }

        const parsedServiceDate = new Date(serviceDate);
        if (Number.isNaN(parsedServiceDate.getTime())) {
            return res.status(400).json({ message: 'serviceDate must be a valid date (YYYY-MM-DD)' });
        }

        const dayStart = new Date(parsedServiceDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const driver = await Driver.findById(driverId).populate({
            path: 'assignedBus',
            select: '_id busNumber capacity assignedRouteId'
        });

        if (!driver || !driver.assignedBus || !driver.assignedBus.assignedRouteId) {
            return res.status(404).json({ message: 'Driver bus/route assignment not found' });
        }

        const route = await Route.findById(driver.assignedBus.assignedRouteId).select('routeName schedules');
        if (!route) {
            return res.status(404).json({ message: 'Assigned route not found' });
        }

        const schedule = route.schedules.id(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found on assigned route' });
        }

        const scheduleDriverId = schedule.driverId?.toString?.() || String(schedule.driverId || '');
        const scheduleBusId = schedule.busId?.toString?.() || String(schedule.busId || '');

        if (
            scheduleDriverId !== String(driverId) ||
            scheduleBusId !== String(driver.assignedBus._id)
        ) {
            return res.status(403).json({ message: 'This schedule is not assigned to the authenticated driver' });
        }

        const bookings = await Booking.find({
            routeId: route._id,
            busId: driver.assignedBus._id,
            scheduleId: scheduleId,
            serviceDate: { $gte: dayStart, $lt: dayEnd },
            status: { $in: ['confirmed', 'in-progress'] }
        })
            .populate('passengerId', 'firstName lastName phoneNumber')
            .select('bookingCode seatNumbers passengerId status paymentStatus payment isBoarded boardedAt boardingStop destinationStop seatCount')
            .lean();

        const reservedSeats = bookings.flatMap((booking) => {
            const passenger = booking.passengerId || {};
            const passengerName = [passenger.firstName, passenger.lastName].filter(Boolean).join(' ').trim();

            return (booking.seatNumbers || []).map((seatNumber) => ({
                seatNumber,
                bookingCode: booking.bookingCode,
                status: booking.status,
                passengerName: passengerName || 'Passenger',
                passengerPhone: passenger.phoneNumber || '',
                paymentStatus: booking.paymentStatus || false,
                payment: booking.payment || null,
                boarded: Boolean(booking.isBoarded),
                boardedAt: booking.boardedAt || null,
                boardingStop: booking.boardingStop || null,
                destinationStop: booking.destinationStop || null,
                seatCount: booking.seatCount || (booking.seatNumbers || []).length
            }));
        });

        return res.status(200).json({
            routeId: route._id,
            routeName: route.routeName,
            busId: driver.assignedBus._id,
            busNumber: driver.assignedBus.busNumber,
            totalSeats: driver.assignedBus.capacity,
            schedule: {
                _id: schedule._id,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime
            },
            serviceDate: dayStart,
            reservedSeats
        });
    } catch (error) {
        console.error('Error fetching schedule seat map:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Process missed trips for today
 * This endpoint should be called periodically or after schedule end times
 * Admin/System only endpoint
 */
const processMissedTrips = async (req, res) => {
    try {
        const io = req.app.get('io')
        const result = await processMissedTripsForToday({io});

        return res.status(200).json({
            message: 'Missed trips processed',
            stats: {
                processedSchedules: result.processed,
                totalCancelledBookings: result.totalCancelled,
                errors: result.errors,
            },
            result,
        });
    } catch (error) {
        console.error('Error processing missed trips:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const scanBookingQr = async (req, res) => {
  const driverId = req.user.id;
  const { qrData } = req.body || {};

  try {
    if (!qrData) {
      return res.status(400).json({ message: 'qrData is required' });
    }

    const payload = parseQrPayload(qrData);
    if (!payload) {
      return res.status(400).json({ message: 'Invalid QR payload format' });
    }

    if (payload.type !== 'passenger-booking') {
      return res.status(400).json({ message: 'Invalid QR type' });
    }

    const bookingId = String(payload.bookingId || '').trim();
    const qrToken = String(payload.qrToken || '').trim();

    if (!bookingId || !qrToken) {
      return res.status(400).json({ message: 'Invalid QR payload fields' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      qrToken,
      status: { $in: ['confirmed', 'in-progress'] },
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or invalid QR token' });
    }

    const activeTrip = await TripSession.findOne({
      driverId,
      status: { $in: ['in-progress', 'on-break'] },
    });

    if (!activeTrip) {
      return res.status(409).json({ message: 'No active trip. Start trip before scanning.' });
    }

    if (
      String(activeTrip.routeId) !== String(booking.routeId) ||
      String(activeTrip.busId) !== String(booking.busId) ||
      String(activeTrip.scheduleId) !== String(booking.scheduleId)
    ) {
      return res.status(409).json({
        message: 'This booking does not belong to your current trip',
      });
    }

    const bookingDay = getUtcDayRange(booking.serviceDate);
    const tripStart = activeTrip.startTime ? new Date(activeTrip.startTime) : new Date();

    if (!bookingDay || tripStart < bookingDay.start || tripStart >= bookingDay.end) {
      return res.status(409).json({
        message: 'This booking is not for today active trip service date',
      });
    }

    booking.lastScannedAt = new Date();
    booking.boardingScanCount = Number(booking.boardingScanCount || 0) + 1;

    if (booking.isBoarded) {
      await booking.save();

      return res.status(200).json({
        message: 'Passenger already boarded',
        alreadyBoarded: true,
                bookingId: String(booking._id),
        bookingCode: booking.bookingCode,
        seatNumbers: booking.seatNumbers,
        isBoarded: booking.isBoarded,
        boardedAt: booking.boardedAt,
      });
    }

    booking.isBoarded = true;
    booking.boardedAt = new Date();
    booking.boardedByDriverId = driverId;
    booking.boardedTripSessionId = activeTrip._id;

    booking.status = 'in-progress';

    await booking.save();

    activeTrip.passengerCount = Math.max(
      0,
      Number(activeTrip.passengerCount || 0) + Number(booking.seatCount || 0)
    );
    await activeTrip.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`driver:${driverId}`).emit('trip:seat-boarded', {
        bookingId: String(booking._id),
        bookingCode: booking.bookingCode,
        seatNumbers: booking.seatNumbers,
        isBoarded: true,
        boardedAt: booking.boardedAt,
      });
      io.to(`driver:${driverId}`).emit('trip:updated', activeTrip);
            if (activeTrip.busId) {
                try {
                    const Bus = require('../models/bus.model');
                    const busDoc = await Bus.findById(activeTrip.busId).select('currentPassengers');
                    if (busDoc) {
                        busDoc.currentPassengers = Math.max(0, Number(busDoc.currentPassengers || 0) + Number(booking.seatCount || 0));
                        await busDoc.save();
                        io.to(`bus:${String(activeTrip.busId)}`).emit('trip:occupancy-updated', {
                            tripId: String(activeTrip._id),
                            busId: String(activeTrip.busId),
                            passengerCount: busDoc.currentPassengers,
                            timestamp: new Date().toISOString(),
                        });
                    }
                } catch (err) {
                    console.error('Error updating/publishing bus occupancy after scan:', err);
                }
            }
    }

    return res.status(200).json({
      message: 'Passenger marked as boarded',
      alreadyBoarded: false,
            bookingId: String(booking._id),
      bookingCode: booking.bookingCode,
      seatNumbers: booking.seatNumbers,
      isBoarded: booking.isBoarded,
      boardedAt: booking.boardedAt,
      passengerCount: activeTrip.passengerCount,
    });
  } catch (error) {
    console.error('Error scanning booking QR:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAllTripsWithBookings = async (req, res) => {
  try {
    const { status, routeId, startDate, endDate } = req.query;

    const tripFilter = {};
    if (status) tripFilter.status = status; // 'in-progress', 'completed', 'missed'
    if (routeId) tripFilter.routeId = routeId;
    if (startDate || endDate) {
      const dateRange = {};
      const startBoundary = parseNepalDateBoundary(startDate, 'start');
      const endBoundary = parseNepalDateBoundary(endDate, 'end');
      if (startBoundary) dateRange.$gte = startBoundary;
      if (endBoundary) dateRange.$lte = endBoundary;

      if (Object.keys(dateRange).length > 0) {
        tripFilter.$or = [
          { startTime: dateRange },
          { startTime: { $exists: false }, createdAt: dateRange },
          { startTime: null, createdAt: dateRange },
        ];
      }
    }

    const trips = await TripSession.find(tripFilter)
      .populate({
        path: 'busId',
        select: 'busNumber capacity',
      })
      .populate({
        path: 'routeId',
        select: 'routeName startingStop endingStop',
      })
      .populate({
        path: 'driverId',
        select: 'firstName lastName phoneNumber profileImgUrl',
      })
      .sort({ createdAt: -1 })
      .lean();

    const tripsWithBookings = await Promise.all(
      trips.map(async (trip) => {
        const bookings = await Booking.find({ tripSessionId: trip._id })
          .populate('passengerId', 'firstName lastName phoneNumber profileImgUrl')
          .lean();

        const totalPassengers = bookings.reduce((sum, b) => sum + (b.seatCount || 0), 0);

        return {
          tripId: trip._id,
          routeName: trip.routeId?.routeName || ((trip.routeId?.startingStop || '') + ' to ' + (trip.routeId?.endingStop || '')),
          busNumber: trip.busId?.busNumber || 'N/A',
          driverName: [trip.driverId?.firstName, trip.driverId?.lastName].filter(Boolean).join(' '),
          driverProfileImgUrl: trip.driverId?.profileImgUrl || null,
          status: trip.status,
          startTime: trip.startTime || trip.createdAt,
          delayMinutes: trip.startDelayMinutes || 0,
          currentOccupancy: trip.passengerCount || 0,
          occupancyHistory: trip.occupancyHistory || [],
          passengerCount: totalPassengers,
          bookingCount: bookings.length,
          totalSeats: totalPassengers,
          bookings: bookings.map(b => ({
            bookingCode: b.bookingCode,
            passengerName: [b.passengerId?.firstName, b.passengerId?.lastName].filter(Boolean).join(' '),
            passengerProfileImgUrl: b.passengerId?.profileImgUrl || null,
            phoneNumber: b.passengerId?.phoneNumber,
            seats: b.seatNumbers.join(', '),
            boardingStop: b.boardingStop?.stopName,
            alightingStop: b.destinationStop?.stopName,
            paymentStatus: b.payment?.status || 'pending',
            bookingStatus: b.status,
            totalFare: b.totalFare
          }))
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: tripsWithBookings,
      count: tripsWithBookings.length
    });
  } catch (error) {
    console.error('Error fetching trips with bookings:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getTripDetailsById = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await TripSession.findById(tripId)
      .populate('busId')
      .populate('routeId', 'routeName startingStop endingStop schedules')
      .populate('driverId', 'firstName lastName phoneNumber profileImgUrl licenseImgUrl')
      .lean();

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    let schedule = null;
    if (trip.routeId && trip.scheduleId) {
      const Route = require('../models/route.model');
      const routeDoc = await Route.findById(trip.routeId).lean();
      if (routeDoc?.schedules) {
        schedule = routeDoc.schedules.find(s => String(s._id) === String(trip.scheduleId));
      }
    }

    const bookings = await Booking.find({ tripSessionId: tripId })
      .populate('passengerId', 'firstName lastName phoneNumber profileImgUrl')
      .lean();

    const tripDetails = {
      tripId: trip._id,
      route: {
        startingStop: trip.routeId?.startingStop || '',
        endingStop: trip.routeId?.endingStop || '',
      },
      bus: {
        busNumber: trip.busId?.busNumber || 'N/A',
        capacity: trip.busId?.capacity || 0,
      },
      driver: {
        name: [trip.driverId?.firstName, trip.driverId?.lastName].filter(Boolean).join(' '),
        phone: trip.driverId?.phoneNumber || 'N/A',
        profileImgUrl: trip.driverId?.profileImgUrl || null,
        licenseImgUrl: trip.driverId?.licenseImgUrl || null,
      },
      status: trip.status,
      times: {
        scheduledStart: schedule?.startTime || 'N/A',
        actualStart: trip.startTime ? new Date(trip.startTime).toISOString() : 'N/A',
        scheduledEnd: schedule?.endTime || 'N/A',
        actualEnd: trip.endTime ? new Date(trip.endTime).toISOString() : 'N/A',
        delayMinutes: trip.startDelayMinutes || 0,
        restTimeMinutes: trip.totalBreakTime || 0
      },
      metrics: {
        passengerCount: bookings.reduce((sum, b) => sum + (b.seatCount || 0), 0),
        currentOccupancy: trip.passengerCount || 0,
        totalSeats: trip.busId?.capacity || bookings.reduce((sum, b) => sum + (b.seatCount || 0), 0),
        totalFare: bookings.reduce((sum, b) => sum + (b.totalFare || 0), 0),
        paidBookings: bookings.filter(b => b.payment?.status === 'paid').length,
        pendingPayments: bookings.filter(b => b.payment?.status !== 'paid').length,
      },
      occupancyHistory: trip.occupancyHistory || [],
      bookings: bookings.map(b => ({
        bookingCode: b.bookingCode,
        passengerName: [b.passengerId?.firstName, b.passengerId?.lastName].filter(Boolean).join(' '),
        passengerProfileImgUrl: b.passengerId?.profileImgUrl || null,
        passengerPhone: b.passengerId?.phoneNumber,
        seats: b.seatNumbers.join(', '),
        seatCount: b.seatCount,
        boardingStop: b.boardingStop?.stopName,
        alightingStop: b.destinationStop?.stopName,
        fare: b.totalFare,
        paymentStatus: b.payment?.status || 'pending',
        paymentMethod: b.payment?.method || 'N/A',
        bookingStatus: b.status,
      }))
    };

    return res.status(200).json({
      success: true,
      data: tripDetails
    });
  } catch (error) {
    console.error('Error fetching trip details:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
    getAssignedRoute,
    getDriverSchedules,
    getCurrentTrip,
    startTrip,
    endTrip,
    startBreak,
    endBreak,
    updatePassengerCount,
    getTripHistory,
    getTodayCompletedTrips,
    getScheduleSeatMap,
    processMissedTrips,
    scanBookingQr,
    getAllTripsWithBookings,
    getTripDetailsById
};
