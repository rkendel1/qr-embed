# AI Development Rules

This document outlines the technical stack and development rules for this web application. Following these guidelines will ensure consistency and maintainability.

## Tech Stack

This is a Next.js application built with the following technologies:

*   **Framework**: Next.js (using the Pages Router).
*   **Language**: JavaScript.
*   **Styling**: Tailwind CSS is used for all styling. All components should be styled with utility classes.
*   **API Layer**: Server-side logic is handled through Next.js API Routes located in `src/pages/api/`.
*   **Real-time Updates**: Server-Sent Events (SSE) are used to push status updates from the server to the client in real-time.
*   **Data Persistence**: A simple flat-file `sessions.json` is used for storing session data.
*   **QR Code Generation**: The `qrcode` library is used to generate QR codes on the server.
*   **Unique IDs**: The `uuid` library generates unique tokens for sessions.
*   **Fingerprinting**: `fingerprintjs2` is used on the client-side to create a unique browser fingerprint.

## Development Rules

*   **UI Components**: For any new UI elements, prefer using plain React components styled with Tailwind CSS. Do not add new UI libraries without discussion.
*   **Styling**: All styling must be done using Tailwind CSS. Avoid writing separate CSS files.
*   **State Management**: Use React's built-in hooks (`useState`, `useEffect`, `useRef`) for managing component state. Do not introduce external state management libraries like Redux or Zustand.
*   **Routing**: All pages and routes should be managed by the Next.js file-based router within the `src/pages` directory.
*   **Data Fetching**: Use the native `fetch` API for all client-server communication.
*   **Code Style**: Maintain the existing code style, using functional components and hooks. Keep components small and focused on a single responsibility.