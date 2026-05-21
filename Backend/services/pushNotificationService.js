const { Expo } = require('expo-server-sdk');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');

const expo = new Expo();

const USER_MODELS = {
  driver: Driver,
  passenger: Passenger,
};

const normalizeUserType = (userType) => {
  const normalized = String(userType || '').trim().toLowerCase();
  return normalized === 'driver' || normalized === 'passenger' ? normalized : null;
};

const clearPushToken = async (pushToken, userType) => {
  const normalizedType = normalizeUserType(userType);
  const Model = normalizedType ? USER_MODELS[normalizedType] : null;

  if (!pushToken) return;

  try {
    if (Model) {
      await Model.updateMany({ pushToken }, { $unset: { pushToken: '' } });
      return;
    }

    await Promise.all([
      Driver.updateMany({ pushToken }, { $unset: { pushToken: '' } }),
      Passenger.updateMany({ pushToken }, { $unset: { pushToken: '' } }),
    ]);
  } catch (error) {
    console.error('Failed to clear invalid push token:', error);
  }
};

const savePushTokenForUser = async ({ userId, userType, pushToken }) => {
  const normalizedType = normalizeUserType(userType);
  const Model = normalizedType ? USER_MODELS[normalizedType] : null;

  if (!Model) {
    return { success: false, message: 'Invalid userType. Must be driver or passenger' };
  }

  if (!Expo.isExpoPushToken(pushToken)) {
    return { success: false, message: 'Invalid Expo push token' };
  }

  const updated = await Model.findByIdAndUpdate(
    userId,
    { $set: { pushToken } },
    { new: true }
  ).select('_id pushToken');

  if (!updated) {
    return { success: false, message: `${normalizedType} not found` };
  }

  return { success: true, message: 'Push token saved successfully' };
};

const removePushTokenForUser = async ({ userId, userType, pushToken }) => {
  const normalizedType = normalizeUserType(userType);
  const Model = normalizedType ? USER_MODELS[normalizedType] : null;

  if (!Model) {
    return { success: false, message: 'Invalid userType. Must be driver or passenger' };
  }

  const update = pushToken
    ? { $unset: { pushToken: '' } }
    : { $set: { pushToken: null } };

  const query = pushToken ? { _id: userId, pushToken } : { _id: userId };
  await Model.updateOne(query, update);

  return { success: true, message: 'Push token removed successfully' };
};

const getPushTargets = async ({ userType, userIds }) => {
  const normalizedType = normalizeUserType(userType);
  const Model = normalizedType ? USER_MODELS[normalizedType] : null;

  if (!Model) return [];

  const query = {
    pushToken: { $exists: true, $nin: [null, ''] },
  };

  if (Array.isArray(userIds) && userIds.length > 0) {
    query._id = { $in: userIds };
  }

  const users = await Model.find(query).select('_id pushToken').lean();
  return users
    .filter((user) => Expo.isExpoPushToken(user.pushToken))
    .map((user) => ({
      userId: String(user._id),
      userType: normalizedType,
      pushToken: user.pushToken,
    }));
};

const processReceiptsLater = (receiptIds, ticketTokenMap) => {
  if (!receiptIds.length) return;

  setTimeout(async () => {
    try {
      const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status !== 'error') continue;

          console.error('Expo push receipt error:', receipt.message, receipt.details);
          if (receipt.details?.error === 'DeviceNotRegistered') {
            const target = ticketTokenMap.get(receiptId);
            await clearPushToken(target?.pushToken, target?.userType);
          }
        }
      }
    } catch (error) {
      console.error('Failed to process Expo push receipts:', error);
    }
  }, 15 * 60 * 1000);
};

const sendPushNotifications = async ({ targets, title, body, data = {}, priority = 'high' }) => {
  const safeTargets = (targets || []).filter((target) => Expo.isExpoPushToken(target.pushToken));

  if (!safeTargets.length) {
    return { sent: 0, tickets: [] };
  }

  const messages = safeTargets.map((target) => ({
    to: target.pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority,
    channelId: 'default',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  const ticketTokenMap = new Map();
  let targetOffset = 0;

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);

      ticketChunk.forEach((ticket, index) => {
        const target = safeTargets[targetOffset + index];
        if (ticket.status === 'error') {
          console.error('Expo push ticket error:', ticket.message, ticket.details);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            clearPushToken(target?.pushToken, target?.userType);
          }
          return;
        }

        if (ticket.id) {
          ticketTokenMap.set(ticket.id, target);
        }
      });
      targetOffset += chunk.length;
    } catch (error) {
      console.error('Failed to send Expo push notification chunk:', error);
      targetOffset += chunk.length;
    }
  }

  processReceiptsLater(Array.from(ticketTokenMap.keys()), ticketTokenMap);

  return { sent: messages.length, tickets };
};

const sendPushToUsers = async ({ userType, userIds, title, body, data, priority }) => {
  const targets = await getPushTargets({ userType, userIds });
  return sendPushNotifications({ targets, title, body, data, priority });
};

const sendPushToAudience = async ({ audience, title, body, data, priority }) => {
  const targets = [];

  if (audience === 'all' || audience === 'drivers') {
    targets.push(...await getPushTargets({ userType: 'driver' }));
  }

  if (audience === 'all' || audience === 'passengers') {
    targets.push(...await getPushTargets({ userType: 'passenger' }));
  }

  return sendPushNotifications({ targets, title, body, data, priority });
};

module.exports = {
  savePushTokenForUser,
  removePushTokenForUser,
  sendPushNotifications,
  sendPushToUsers,
  sendPushToAudience,
};
