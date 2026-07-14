import { TalaCallback } from "@tala/sso-react";

/**
 * This page is loaded inside the OAuth popup window.
 * TalaCallback captures the ?code & ?state from the URL,
 * sends it to the backend, and posts the result back to the opener window.
 */
export default function TalaCallbackPage() {
  return (
    <TalaCallback
      callbackEndpoint={`${import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"}/auth/tala/callback`}
    />
  );
}
