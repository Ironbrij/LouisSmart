
# Louis Smart — V1 Plan

Premium AI chat UI (ChatGPT/Claude/Linear aesthetic) with real Firebase auth and a webhook-driven AI backend. Focused v1 scope: auth, sidebar, chat, markdown, simulated-streaming from webhook, image upload wiring. Polish items (regenerate/like/dislike, delete-all confirmation, settings panel) are stubbed for v2.

## What you'll need to provide

1. **Firebase config** (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) — from Firebase Console → Project Settings. These are publishable, safe in code.
2. **Google OAuth** enabled in Firebase Console → Authentication → Sign-in method.
3. **Webhook URL** for AI responses. Contract:
   - `POST { firebase_uid, chat_uuid, message, history?, image_url? }`
   - Response: streamed text (SSE or chunked) OR JSON `{ reply: string }`. I'll implement chunked-text streaming + JSON fallback.
4. Firestore + Storage enabled in Firebase Console (rules: users can only read/write their own `users/{uid}/**`).

I'll ask for these via a secure form once we're in build mode; publishable Firebase config gets committed to code, webhook URL goes to `VITE_WEBHOOK_URL`.

## Tech / Stack notes

This project is TanStack Start (not Vite+React Router). I'll adapt:
- Routing → **TanStack Router** file routes (`/auth`, `/app`, `/app/$chatId`)
- Everything else exactly as requested: Tailwind, Framer Motion, lucide-react, react-markdown + remark-gfm, Firebase Web SDK (auth, firestore, storage)

Confirm this substitution is OK — using literal `react-router-dom` here would fight the framework.

## File structure

```text
src/
  lib/
    firebase.ts            # initializeApp, auth, db, storage
    webhook.ts             # streamAiReply({ uid, chatId, message, image? })
    types.ts               # Message, Chat, User interfaces
  contexts/
    AuthContext.tsx        # user, loading, signIn, signInGoogle, signUp, signOut
    ThemeContext.tsx       # light/dark, localStorage persist
  hooks/
    useChats.ts            # list/create/rename/delete chats (Firestore)
    useMessages.ts         # subscribe messages for active chatId
    useAutoScroll.ts
  components/
    auth/AuthCard.tsx
    layout/AppShell.tsx
    sidebar/Sidebar.tsx
    sidebar/ChatListItem.tsx
    sidebar/UserMenu.tsx
    chat/EmptyState.tsx        # mascot + floating suggestion cards (crown on "Generate 6 months of content")
    chat/MessageList.tsx
    chat/MessageBubble.tsx     # user vs assistant styling
    chat/Markdown.tsx          # react-markdown + remark-gfm + code block w/ copy
    chat/Composer.tsx          # auto-grow textarea, attach, send/stop
    chat/TypingIndicator.tsx
    ui/... (existing shadcn)
  routes/
    __root.tsx               # updated meta + AuthProvider + ThemeProvider
    index.tsx                # redirects to /app or /auth
    auth.tsx                 # login/signup card
    app.tsx                  # AppShell layout with <Outlet/>
    app.index.tsx            # empty state / new chat
    app.$chatId.tsx          # active chat view
  assets/
    wizard-louis.png.asset.json    # via lovable-assets from upload
    premium-crown.png.asset.json   # via lovable-assets from upload
```

## Feature scope (v1)

**Auth (`/auth`)**
- Centered card: mascot, "Louis Smart", "Welcome Back" copy, email + password inputs, Forgot Password link, Login button, divider, Continue with Google.
- Background: radial gradient + subtle grid + blurred floating gradient blobs.
- Toggle sign in ↔ sign up in one card.
- On success → `/app`. Redirect if already authed.

**Shell (`/app`)**
- Three-panel: Sidebar (280/72 collapsible, drawer on mobile) · header · chat · sticky composer.
- Framer Motion width transitions.

**Sidebar**
- New Chat button (creates UUID, navigates `/app/{uuid}`, writes empty `chats/{uuid}` doc lazily on first message).
- Search input (client-side filter of loaded chats).
- Recent chats list from Firestore `users/{uid}/chats` ordered by `updatedAt desc`. Hover: rename (inline) / delete (confirm).
- Bottom: user avatar + name + email, dropdown (Theme toggle, Logout). "Delete all chats" outlined red button with confirm dialog.

**Chat UUID**
- `crypto.randomUUID()` on New Chat; URL is the source of truth (`/app/$chatId`), so refresh preserves the active chat.
- Firestore doc id === chat UUID.

**Empty state**
- Centered wizard mascot (uploaded image, via lovable-assets CDN).
- Heading "How can Louis Smart help today?" + subtitle "So smart it probably ignores your bad ideas."
- 6–8 floating suggestion pills around the mascot (Framer Motion gentle float + hover lift). "Generate 6 months of content" pill carries the crown image badge.
- Click a pill → fills composer.

**Composer**
- Auto-growing textarea, attach (image) button, send button, Enter=send / Shift+Enter=newline, disabled when empty, character counter.
- While generating: send swaps to Stop button (aborts the fetch/stream).
- Image: preview chip with remove; on send, upload to `gs://.../users/{uid}/chats/{chatId}/{msgId}` then include `image_url` in webhook payload.

**Messages**
- User: right-aligned blue→indigo gradient bubble, white text, timestamp.
- Assistant: left-aligned soft muted bubble, small wizard avatar, markdown rendered.
- Framer Motion fade+slide-in per message. Auto-scroll to bottom.
- Persistence: on send → write user msg to `chats/{chatId}/messages`, POST webhook, stream chunks into a placeholder assistant msg, finalize on completion.
- If chat has no title, set title from first user message (first ~40 chars).

**Markdown**
- `react-markdown` + `remark-gfm`.
- Prose styling via Tailwind (custom component overrides; no @tailwindcss/typography required — I'll style components directly to stay lean).
- Tables: bordered, zebra rows, sticky header, horizontal scroll wrapper, rounded.
- Code blocks: dark bg, language label chip, copy button. Inline code: rounded gray badge.
- Blockquotes, lists, checklists, hr, links styled.

**Streaming UX**
- Read webhook response as `ReadableStream`; append tokens to the active assistant message with a blinking caret at the tail.
- Stop button aborts via `AbortController`.
- After completion: Copy button under assistant message. Regenerate/Like/Dislike deferred to v2 (buttons rendered but no-op with tooltip "coming soon" — or omitted; I'll omit to stay focused).

**Theme**
- Light/dark toggle in user menu; class-based dark mode already wired in styles.css. Persist in localStorage.

**Responsive**
- Desktop: sidebar visible. Tablet: collapsible. Mobile: sheet drawer (`@/components/ui/sheet`).

## Firestore shape

```text
users/{uid}
  profile: { displayName, email, photoURL, createdAt }
  chats/{chatUuid}
    title, createdAt, updatedAt
    messages/{msgId}
      role: 'user' | 'assistant'
      content: string
      attachments?: [{ url, type }]
      timestamp
```

Security rules (I'll include a `firestore.rules` file for you to paste into Firebase Console):

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Storage rules similarly scoped to `users/{uid}/**`.

## Out of scope for v1 (call out for v2)

- Regenerate / Like / Dislike actions
- Settings modal (only theme + logout in user menu)
- Skeleton loaders for the chat list (using a simple spinner)
- Advanced image drag-and-drop overlay (click-to-attach only; drop still works via input)
- SEO/OG image for /app (private area)

## Build order

1. Install deps: `firebase`, `framer-motion`, `react-markdown`, `remark-gfm`, `uuid`.
2. Add Firebase config + webhook URL (secure form).
3. Assets via `lovable-assets` from the two uploaded PNGs.
4. `lib/firebase.ts`, `AuthContext`, `ThemeContext`, updated `__root.tsx`.
5. Routes: `/auth`, `/app`, `/app/$chatId`, index redirect.
6. Sidebar + user menu + chat list hooks.
7. Empty state with mascot + floating suggestions (+ crown on the 6-months pill).
8. Composer + streaming webhook client + message list + markdown renderer.
9. Theme toggle, mobile drawer, polish pass (animations, focus rings, spacing).
10. Manual smoke test against the preview.

Ready to build once you confirm: (a) TanStack Router substitution OK, (b) Firebase config + webhook URL ready to paste.
