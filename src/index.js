import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality (disabled in development)
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  // In development, unregister any existing service worker
  serviceWorkerRegistration.unregister();
}
