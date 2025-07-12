// Geolocation utility for getting user's current location
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let errorMessage = "Unable to retrieve location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
          default:
            errorMessage =
              "An unknown error occurred while retrieving location.";
        }

        reject(new Error(errorMessage));
      },
      options
    );
  });
};

// Watch user's location for changes
export const watchLocation = (callback, errorCallback) => {
  if (!navigator.geolocation) {
    errorCallback(new Error("Geolocation is not supported by this browser."));
    return null;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  };

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      let errorMessage = "Unable to watch location.";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied by user.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out.";
          break;
        default:
          errorMessage = "An unknown error occurred while watching location.";
      }

      errorCallback(new Error(errorMessage));
    },
    options
  );

  return watchId;
};

// Stop watching location
export const stopWatchingLocation = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

// Get location permission status
export const getLocationPermission = async () => {
  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    return permission.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.error("Error checking location permission:", error);
    return "unknown";
  }
};

// Check if geolocation is available
export const isGeolocationAvailable = () => {
  return "geolocation" in navigator;
};
