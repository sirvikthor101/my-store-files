// Runs on Vercel as a serverless function at /api/verify
// Requires an environment variable: PAYSTACK_SECRET_KEY (starts with sk_)
// Set it in Vercel: Project Settings -> Environment Variables

const fs = require("fs");
const path = require("path");

module.exports = async (req, res) => {
  const { reference, product } = req.query;

  if (!reference || !product) {
    res.status(400).json({ ok: false, error: "Missing reference or product." });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ ok: false, error: "Server is not configured with a Paystack secret key yet." });
    return;
  }

  let products;
  try {
    const filePath = path.join(process.cwd(), "products.json");
    products = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    res.status(500).json({ ok: false, error: "Could not load product catalog." });
    return;
  }

  const item = products.find(p => p.id === product);
  if (!item) {
    res.status(404).json({ ok: false, error: "Unknown product." });
    return;
  }

  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const data = await paystackRes.json();

    const txn = data && data.data;
    const paid = txn && txn.status === "success";
    const amountMatches = txn && txn.amount === item.price;
    const currencyMatches = txn && txn.currency === item.currency;

    if (paid && amountMatches && currencyMatches) {
      res.status(200).json({ ok: true, downloadUrl: item.downloadUrl });
    } else {
      res.status(402).json({ ok: false, error: "Payment not confirmed for this item." });
    }
  } catch (e) {
    res.status(502).json({ ok: false, error: "Could not reach Paystack to verify payment." });
  }
};
