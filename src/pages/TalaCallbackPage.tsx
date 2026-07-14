import { TalaCallback } from "@tala/sso-react";

/**
 * This page is loaded inside the OAuth popup window.
 * TalaCallback reads ?code & ?state from the URL,
 * posts them back to the opener window, then closes itself.
 * The parent Login page then calls the backend to exchange the code.
 */
export default function TalaCallbackPage() {
  return <TalaCallback />;
}
