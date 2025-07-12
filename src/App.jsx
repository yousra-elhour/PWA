import React, { useState, useEffect } from "react";
import { fetchWeather, fetchWeatherByCoords } from "./api/fetchWeather";
import {
  getCurrentLocation,
  isGeolocationAvailable,
} from "./utils/geolocation";
import backgroundSync from "./utils/backgroundSync";
import Notifications from "./components/Notifications";
import "./App.css";

const App = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [cityName, setCityName] = useState("");
  const [error, setError] = useState(null);
  const [isCelsius, setIsCelsius] = useState(true);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [locationError, setLocationError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const handleGetCurrentLocation = async () => {
    if (!isGeolocationAvailable()) {
      setLocationError("Geolocation is not available in this browser");
      return;
    }

    try {
      setLoading(true);
      setLocationError(null);

      const location = await getCurrentLocation();
      setUserLocation(location);

      // Fetch weather for current location
      const data = await fetchWeatherByCoords(
        location.latitude,
        location.longitude
      );
      setWeatherData(data);
      updateRecentSearches(data.location.name);
    } catch (error) {
      setLocationError(error.message);
      console.error("Location error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (city) => {
    setLoading(true);
    setError(null);

    try {
      if (isOnline) {
        const data = await fetchWeather(city);
        setWeatherData(data);
        setCityName("");
        updateRecentSearches(data.location.name);
      } else {
        // Queue request for background sync
        backgroundSync.queueRequest(city);
        setPendingRequestsCount(backgroundSync.getPendingRequestsCount());
        setError(
          "You're offline. Request queued for when connection is restored."
        );
        setCityName("");
      }
    } catch (error) {
      if (isOnline) {
        setError("City not found. Please try again.");
      } else {
        backgroundSync.queueRequest(city);
        setPendingRequestsCount(backgroundSync.getPendingRequestsCount());
        setError(
          "You're offline. Request queued for when connection is restored."
        );
        setCityName("");
      }
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchData(cityName);
    }
  };

  const updateRecentSearches = (city) => {
    const updatedSearches = [
      city,
      ...recentSearches.filter((c) => c !== city),
    ].slice(0, 5);
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  useEffect(() => {
    const savedSearches =
      JSON.parse(localStorage.getItem("recentSearches")) || [];
    setRecentSearches(savedSearches);

    // Set up online/offline listeners
    const handleOnline = async () => {
      setIsOnline(true);
      // Clear error message when back online
      setError(null);
      // Immediately process any pending requests
      await backgroundSync.processPendingRequests();
      setPendingRequestsCount(backgroundSync.getPendingRequestsCount());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for background sync weather data
    const handleWeatherDataReceived = (event) => {
      if (event.detail.source === "backgroundSync") {
        setWeatherData(event.detail.weatherData);
        updateRecentSearches(event.detail.weatherData.location.name);
        // Clear error message when request is processed
        setError(null);
      }
    };

    window.addEventListener("weatherDataReceived", handleWeatherDataReceived);

    // Update pending requests count
    const updatePendingCount = () => {
      setPendingRequestsCount(backgroundSync.getPendingRequestsCount());
    };

    updatePendingCount();

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "WEATHER_DATA_SYNCED") {
          setWeatherData(event.data.data);
          updateRecentSearches(event.data.data.location.name);
          updatePendingCount();
          // Clear error message when service worker syncs data
          setError(null);
        }
      });
    }

    // Auto-detect location on app load
    handleGetCurrentLocation();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "weatherDataReceived",
        handleWeatherDataReceived
      );
    };
  }, []); // Empty dependency array to run only once on mount

  const handleRecentSearch = (city) => {
    setCityName(city);
    fetchData(city);
  };

  const toggleTemperatureUnit = () => {
    setIsCelsius(!isCelsius);
  };

  const getTemperature = () => {
    if (!weatherData) return "";
    return isCelsius
      ? `${weatherData.current.temp_c} °C`
      : `${weatherData.current.temp_f} °F`;
  };

  const handleNotificationReceived = (payload) => {
    console.log("Notification received in app:", payload);
    // Handle notification data if needed
  };

  return (
    <div>
      <div className="app">
        <h1>Weather App</h1>

        {/* Connection Status */}
        <div className={`connection-status ${isOnline ? "online" : "offline"}`}>
          <span>{isOnline ? "🟢 Online" : "🔴 Offline"}</span>
          {pendingRequestsCount > 0 && (
            <span className="pending-requests">
              {pendingRequestsCount} request(s) queued
            </span>
          )}
        </div>

        {/* Geolocation Section */}
        <div className="location-section">
          <button onClick={handleGetCurrentLocation} className="location-btn">
            📍 Get Current Location Weather
          </button>
          {locationError && <p className="location-error">{locationError}</p>}
          {userLocation && (
            <p className="location-info">
              📍 Location: {userLocation.latitude.toFixed(4)},{" "}
              {userLocation.longitude.toFixed(4)}
            </p>
          )}
        </div>

        {/* Notifications Component */}
        <Notifications onNotificationReceived={handleNotificationReceived} />

        {/* Search Section */}
        <div className="search">
          <input
            type="text"
            placeholder="Enter city name..."
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            onClick={() => fetchData(cityName)}
            disabled={!cityName.trim()}
          >
            Search
          </button>
        </div>

        {/* Temperature Unit Toggle */}
        <div className="unit-toggle">
          <span>°C</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={!isCelsius}
              onChange={toggleTemperatureUnit}
            />
            <span className="slider round"></span>
          </label>
          <span>°F</span>
        </div>

        {/* Loading State */}
        {loading && <div className="loading">Loading...</div>}

        {/* Error State */}
        {error && <div className="error">{error}</div>}

        {/* Weather Information */}
        {weatherData && (
          <div className="weather-info">
            <h2>
              {weatherData.location.name}, {weatherData.location.region},{" "}
              {weatherData.location.country}
            </h2>
            <p>Temperature: {getTemperature()}</p>
            <p>Condition: {weatherData.current.condition.text}</p>
            <img
              src={weatherData.current.condition.icon}
              alt={weatherData.current.condition.text}
            />
            <p>Humidity: {weatherData.current.humidity}%</p>
            <p>Pressure: {weatherData.current.pressure_mb} mb</p>
            <p>Visibility: {weatherData.current.vis_km} km</p>
            <p>
              Wind: {weatherData.current.wind_kph} kph{" "}
              {weatherData.current.wind_dir}
            </p>
            <p>
              Feels like:{" "}
              {isCelsius
                ? weatherData.current.feelslike_c
                : weatherData.current.feelslike_f}
              °{isCelsius ? "C" : "F"}
            </p>
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <h3>Recent Searches</h3>
            <ul>
              {recentSearches.map((city, index) => (
                <li key={index} onClick={() => handleRecentSearch(city)}>
                  {city}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
