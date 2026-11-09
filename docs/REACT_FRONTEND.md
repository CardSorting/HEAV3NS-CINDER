<!-- [LAYER: UI] -->
# CINDER React frontend

The React 19 and TypeScript client lives in `src/ui/web/react/`. Vite serves it separately from the existing Node server; the `/api` proxy forwards REST and server-sent events unchanged. The original interface remains available on the backend port.

## Run

Use Node.js 22.12 or later and run `npm ci`, then `npm start`. Open the Vite address printed in the terminal (normally `http://localhost:5173`). The API and original interface are at `http://localhost:3000`. Stop both with Ctrl+C. `PORT` changes the backend port; `CINDER_API_URL` overrides the Vite proxy target.

For separate development processes, run `npm run start:api` and `npm run dev:ui`. Build with `npm run build:ui`; serve the built frontend with `npm run preview:ui` while the backend is running. Vite's preview server is for local preview, not a production server.

## Frontend checks

`npm test` runs the existing backend tests. `npm run test:ui` runs the browser journey against a real backend and Vite using Chrome; set `CHROME_PATH` if Chrome is not installed at its default macOS location. Run `npm run build:ui` for TypeScript validation and a production bundle.

## Data boundaries

- A connection appears only when both attendees like one another; the UI does not request automatic reciprocity.
- Pod chat, matches, direct messages, and profiles follow the existing backend's in-memory lifetime. Activity observed while the application is open is stored locally per attendee, survives a page reload, and can be cleared; it is not a complete server notification history and does not include events missed while disconnected or using another device. Browser storage is not private from other users of the same browser profile.
- The agenda API supplies session times but not a conference date or time zone. Attendees can optionally enter a known date and IANA time zone for this browser; the interface marks these as personal, unverified details and calculates session status only after both are supplied. This does not update the backend or share the settings with anyone else.
- Meetup and RSVP feedback follows the server response. The existing backend may pre-populate RSVP data; the UI displays the returned state and does not claim that other members explicitly responded.
- The generated conference illustration already in the repository is reused as contextual artwork; it is not an application screenshot or a representation of live attendees.

Navigation supports browser back/forward and shareable destination hashes. Mutations are never automatically retried: when the server response is uncertain, check the result before retrying. If a confirmed mutation is followed by a failed refresh, the UI reports that distinction so users do not accidentally repeat the action.

## Journey and visual direction

The implemented path is check-in/profile → discovery → mutual match → direct conversation or Pod → meetup and agenda → continued discovery. Desktop uses a persistent sidebar; mobile keeps Home, Discover, Matches, Pods, and Agenda within thumb reach, with Activity and Profile in the header. The visual direction combines CINDER's conference artwork with quiet green surfaces and a restrained warm accent, prioritizing the next action and readable conversations.