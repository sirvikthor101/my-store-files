# The Stacks — a free digital-downloads store

A small storefront: browse products, pay by card via Paystack, get the download
link the moment payment is confirmed. No monthly fees — it runs on Vercel's
free tier.

## How it works

1. `index.html` + `app.js` render the catalog from `products.json`.
2. Clicking **Buy** opens the Paystack popup (client-side, using your *public* key).
3. After payment, the browser calls `/api/verify.js`, a serverless function that
   re-checks the payment with Paystack using your *secret* key (never exposed
   to the browser) and confirms the amount matches the product.
4. Only if that check passes does the function return the real download link.

This means a customer can't just guess a download URL and skip paying — the
link is only ever revealed after your server confirms the charge.

**One honest limitation:** the `downloadUrl` itself is a plain link (e.g. to a
file you host on Google Drive, Dropbox, or GitHub). If someone paid once and
shared that exact link with a friend, the friend could use it too — there's no
per-user file gating. For a free/simple setup this is a normal trade-off. If
you outgrow it later, swap `downloadUrl` for a signed, expiring URL from
something like Cloudflare R2 or AWS S3.

## 1. Get your Paystack keys

1. Create a free account at [paystack.com](https://paystack.com) (supports NGN).
2. In the dashboard, go to **Settings → API Keys & Webhooks**.
3. Copy your **Test Public Key** (`pk_test_...`) and **Test Secret Key** (`sk_test_...`)
   to start — switch to live keys once you've tested a real purchase.

## 2. Add your products

Edit `products.json`. Prices are in **kobo** (smallest currency unit), so
₦5,000 is `500000`. `downloadUrl` should point to the actual file — a direct
download link (a GitHub raw file, a Dropbox link with `?dl=1`, etc.).

## 3. Set your public key

In `app.js`, replace:
```js
const PAYSTACK_PUBLIC_KEY = "pk_test_replace_me";
```
with your real public key.

## 4. Deploy to Vercel (free)

1. Push this folder to a new GitHub repo.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import that repo.
3. No build settings needed — it's a static site with one serverless function.
4. Before deploying, add an environment variable:
   - **Name:** `PAYSTACK_SECRET_KEY`
   - **Value:** your `sk_test_...` (or `sk_live_...` once you're live) key
5. Click **Deploy**. Vercel gives you a free `yourproject.vercel.app` URL.

(Netlify works too — same static files, but you'd rewrite `api/verify.js` as
a Netlify Function; ask me if you'd rather deploy there.)

## 5. Test it

Use Paystack's test card while your public key is still `pk_test_...`:
- Card: `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`

You should see the download link appear right after payment.

## Going further, when you're ready

- Add more products by adding entries to `products.json` — no code changes needed.
- Swap Paystack for Stripe if you'd rather charge in USD (I can adapt `app.js`
  and `api/verify.js` for that).
- Add a webhook (`api/webhook.js`) to log every sale, instead of relying only
  on the verify step.
- Connect a custom domain for free in Vercel's project settings.
