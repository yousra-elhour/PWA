// Background sync utility for handling offline requests
class BackgroundSync {
  constructor() {
    this.pendingRequests = JSON.parse(
      localStorage.getItem("pendingWeatherRequests") || "[]"
    );
    this.isOnline = navigator.onLine;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    window.addEventListener("online", async () => {
      this.isOnline = true;
      // Process immediately when back online
      await this.processPendingRequests();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  // Queue a weather request when offline
  queueRequest(cityName, timestamp = Date.now()) {
    const request = {
      id: `${cityName}-${timestamp}`,
      cityName,
      timestamp,
      type: "weather",
    };

    this.pendingRequests.push(request);
    this.savePendingRequests();

    console.log("Request queued:", request);

    // If we're online, process immediately (no delay)
    if (this.isOnline) {
      setTimeout(() => this.processPendingRequests(), 0);
    }
  }

  // Process all pending requests when back online
  async processPendingRequests() {
    if (!this.isOnline || this.pendingRequests.length === 0) {
      return;
    }

    console.log("Processing pending requests...");

    const requestsToProcess = [...this.pendingRequests];
    this.pendingRequests = [];
    this.savePendingRequests();

    for (const request of requestsToProcess) {
      try {
        await this.processRequest(request);
      } catch (error) {
        console.error("Failed to process request:", request, error);
        // Re-queue failed request
        this.pendingRequests.push(request);
      }
    }

    this.savePendingRequests();
  }

  // Process individual request
  async processRequest(request) {
    const { fetchWeather } = await import("../api/fetchWeather");

    try {
      const weatherData = await fetchWeather(request.cityName);

      // Trigger custom event with the weather data
      const event = new CustomEvent("weatherDataReceived", {
        detail: {
          weatherData,
          request,
          source: "backgroundSync",
        },
      });

      window.dispatchEvent(event);

      // Show notification if available
      if (Notification.permission === "granted") {
        new Notification("Weather Update", {
          body: `Weather for ${request.cityName} has been updated!`,
          icon: "/logo.png",
        });
      }

      console.log("Request processed successfully:", request);
    } catch (error) {
      console.error("Error processing request:", error);
      throw error;
    }
  }

  // Save pending requests to localStorage
  savePendingRequests() {
    localStorage.setItem(
      "pendingWeatherRequests",
      JSON.stringify(this.pendingRequests)
    );
  }

  // Get pending requests count
  getPendingRequestsCount() {
    return this.pendingRequests.length;
  }

  // Clear all pending requests
  clearPendingRequests() {
    this.pendingRequests = [];
    this.savePendingRequests();
  }

  // Check if online
  isOnlineStatus() {
    return this.isOnline;
  }
}

// Create singleton instance
const backgroundSync = new BackgroundSync();

export default backgroundSync;
