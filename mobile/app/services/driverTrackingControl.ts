let driverTrackingStopper: (() => void) | null = null;

export const registerDriverTrackingStopper = (stopper: () => void) => {
  driverTrackingStopper = stopper;
};

export const unregisterDriverTrackingStopper = (stopper: () => void) => {
  if (driverTrackingStopper === stopper) {
    driverTrackingStopper = null;
  }
};

export const forceStopDriverTracking = () => {
  if (driverTrackingStopper) {
    driverTrackingStopper();
  }
};
