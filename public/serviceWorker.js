const CACHE_NAME = "weather-app-v7";
const urlsToCache = [
  `index.html`,
  `offline.html`,
  `static/js/bundle.js`,
  `static/css/main.css`,
  `logo.png`,
  `manifest.json`,
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache opened!");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event with background sync support
self.addEventListener("fetch", (event) => {
  // Handle weather API requests
  if (event.request.url.includes("api.weatherapi.com")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If successful, return response
          if (response.ok) {
            return response;
          }
          throw new Error("Network response was not ok");
        })
        .catch(() => {
          // If request fails, register background sync
          self.registration.sync.register("weather-sync");

          // Return cached offline page or error response
          return caches.match("offline.html");
        })
    );
  } else {
    // Handle other requests with normal caching strategy
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => caches.match("offline.html"));
      })
    );
  }
});

// Background sync event
self.addEventListener("sync", (event) => {
  if (event.tag === "weather-sync") {
    console.log("Background sync triggered for weather requests");
    event.waitUntil(syncWeatherRequests());
  }
});

// Function to sync weather requests
async function syncWeatherRequests() {
  try {
    const pendingRequests = JSON.parse(
      localStorage.getItem("pendingWeatherRequests") || "[]"
    );

    for (const request of pendingRequests) {
      try {
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=b0a7bad410d5400c8c3145734251107&q=${request.cityName}`
        );
        const data = await response.json();

        // Send message to main thread
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "WEATHER_DATA_SYNCED",
              data: data,
              request: request,
            });
          });
        });

        // Show notification
        self.registration.showNotification("Weather Update", {
          body: `Weather for ${request.cityName} has been updated!`,
          icon: "/logo.png",
          badge: "/logo.png",
        });
      } catch (error) {
        console.error("Error syncing weather request:", error);
      }
    }

    // Clear pending requests
    localStorage.removeItem("pendingWeatherRequests");
  } catch (error) {
    console.error("Error during background sync:", error);
  }
}

// Push notification event
self.addEventListener("push", (event) => {
  console.log("Push message received:", event);

  let notificationData = {
    title: "Weather App",
    body: "New weather update available!",
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: "/",
    },
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload.notification,
        data: payload.data || notificationData.data,
      };
    } catch (e) {
      console.error("Error parsing push payload:", e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If no window/tab is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message event for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "QUEUE_WEATHER_REQUEST") {
    // Store the request for background sync
    const pendingRequests = JSON.parse(
      localStorage.getItem("pendingWeatherRequests") || "[]"
    );
    pendingRequests.push(event.data.request);
    localStorage.setItem(
      "pendingWeatherRequests",
      JSON.stringify(pendingRequests)
    );

    // Register background sync
    self.registration.sync.register("weather-sync");
  }
});

// Activate event
self.addEventListener("activate", (event) => {
  const cacheWhiteList = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhiteList.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
