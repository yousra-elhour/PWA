import React, { useState, useEffect } from "react";

// Simple notifications without Firebase (for now)
// You can add Firebase later when you have the proper config

const Notifications = ({ onNotificationReceived }) => {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Simple notification permission check
    const checkPermission = async () => {
      if (Notification.permission === "granted") {
        setIsSubscribed(true);
      }
    };

    checkPermission();
  }, []);

  const scheduleWeatherReminder = () => {
    if (permission === "granted") {
      // Schedule a local notification for weather reminder
      const scheduleTime = new Date();
      scheduleTime.setHours(8, 0, 0, 0); // 8 AM

      const now = new Date();
      const delay = scheduleTime.getTime() - now.getTime();

      if (delay > 0) {
        setTimeout(() => {
          new Notification("Weather Reminder", {
            body: "Good morning! Check today's weather forecast.",
            icon: "/logo.png",
            badge: "/logo.png",
          });
        }, delay);
      }
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        setIsSubscribed(true);
        console.log("Notifications enabled successfully!");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  return (
    <div className="notifications-component">
      <h3>Weather Notifications</h3>

      {permission === "default" && (
        <button
          onClick={requestNotificationPermission}
          className="notification-btn"
        >
          Enable Notifications
        </button>
      )}

      {permission === "granted" && (
        <div className="notification-settings">
          <p>✅ Notifications enabled</p>
          <button
            onClick={scheduleWeatherReminder}
            className="notification-btn"
          >
            Set Daily Weather Reminder
          </button>
          {isSubscribed && <p>🔔 Notifications ready!</p>}
        </div>
      )}

      {permission === "denied" && (
        <p>
          ❌ Notifications blocked. Please enable them in your browser settings.
        </p>
      )}
    </div>
  );
};

export default Notifications;
