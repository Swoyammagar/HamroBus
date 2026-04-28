// Global socket.io instance manager
let globalIoInstance = null;

const setIoInstance = (io) => {
  globalIoInstance = io;
};

const getIoInstance = () => {
  if (!globalIoInstance) {
    console.warn('⚠️ Socket.IO instance not initialized. Notifications may not be sent.');
  }
  return globalIoInstance;
};

module.exports = {
  setIoInstance,
  getIoInstance,
};
