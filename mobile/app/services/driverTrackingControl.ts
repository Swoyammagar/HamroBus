let driverTrackingStopper: (() => void) | null = null;
let driverTrackingStarter: (() => Promise<void>) | null = null;

export const registerDriverTrackingStopper = (stopper: () => void) => {
  driverTrackingStopper = stopper;
};

export const unregisterDriverTrackingStopper = (stopper: () => void) => {
  if (driverTrackingStopper === stopper) {
    driverTrackingStopper = null;
  }
};

export const registerDriverTrackingStarter = (starter: () => Promise<void>) => {
  driverTrackingStarter = starter;
};

export const unregisterDriverTrackingStarter = (starter: () => Promise<void>) => {
  if (driverTrackingStarter === starter) {
    driverTrackingStarter = null;
  }
};

export const forceStopDriverTracking = () => {
  if (driverTrackingStopper) {
    driverTrackingStopper();
  }
};

export const startDriverTrackingNow = async (): Promise<void> => {
  if (driverTrackingStarter) {
    try {
      await driverTrackingStarter();
    } catch (err) {
      console.error('Error starting driver tracking starter:', err);
    }
  }
};
