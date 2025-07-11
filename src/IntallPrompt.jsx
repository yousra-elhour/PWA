import React, { useState, useEffect } from "react";
import "./InstallPrompt.css"; // Optional styling

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevent browser auto-prompt
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("✅ App installed");
      } else {
        console.log("❌ App install dismissed");
      }
      setDeferredPrompt(null);
      setShowInstallButton(false);
    });
  };

  if (!showInstallButton) return null;

  return (
    <div className="install-container">
      <button className="install-button" onClick={handleInstallClick}>
        Install App
      </button>
    </div>
  );
};

export default InstallPrompt;
