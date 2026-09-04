# Public HTTPS auth bridge

Static pages that must be published on the existing public domain
`https://aracimcepte.hilalaltunay.com`. They are **not** part of the Expo bundle
and are not served by the app.

## Why this exists

Gmail (and most mail apps) refuse to launch a bare custom-scheme anchor such as
`aracimcepte://auth/reset-password` from a message body — tapping the link does
nothing at all. Mail clients *will* open an `https://` link. So the recovery
email now points at an HTTPS page on our own domain, and that page immediately
hands the same recovery payload to the app over the custom scheme, with a manual
"Uygulamada aç" button when the automatic hand-off is blocked.

## Files

| File | Publish at |
| --- | --- |
| `auth/reset-password/index.html` | `https://aracimcepte.hilalaltunay.com/auth/reset-password` |

Deploy with whatever already publishes the legal pages on that domain. The page
is fully self-contained: no scripts, styles, fonts or analytics from anywhere
else.

## Token handling

- Only `token_hash`, `type`, `code`, `error`, `error_code`, `error_description`
  are read and forwarded. Everything else in the URL is dropped.
- A callback whose `type` is present and is not `recovery` is refused.
- `<meta name="referrer" content="no-referrer">` stops the token leaking through
  a `Referer` header.
- `history.replaceState` strips the query from the address bar and history right
  after the payload is captured.
- `noindex, nofollow`.
- The token is never logged, never sent to any third party, and never persisted.

## Required Supabase email template

Authentication → Email Templates → **Reset Password** — the link `href` must be:

```
{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery
```

Full anchor example:

```html
<a href="{{ .SiteURL }}/auth/reset-password?token_hash={{ .TokenHash }}&type=recovery">
  Şifremi yenile
</a>
```

Do **not** use `{{ .ConfirmationURL }}` for this template any more: it routes
through Supabase's `/verify` endpoint, and the browser→app redirect that follows
is exactly the step Android/Gmail drop.

`Site URL` must remain `https://aracimcepte.hilalaltunay.com`. The existing
`aracimcepte://auth/reset-password` entry stays in **Redirect URLs** (the app
still passes it as `redirectTo`, and it is the scheme this page launches).

## Flow

```
Gmail  →  https://aracimcepte.hilalaltunay.com/auth/reset-password?token_hash=…&type=recovery
       →  aracimcepte://auth/reset-password?token_hash=…&type=recovery
       →  app reset screen  →  verifyOtp({ token_hash, type: 'recovery' })
       →  updateUser({ password })  →  "Şifreniz yenilendi. Yeni şifrenizle giriş yapabilirsiniz."
```

`verifyOtp` establishes the session for the user the token belongs to, so
`updateUser({ password })` always updates the correct Supabase Auth user.
