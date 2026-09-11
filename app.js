// ---- Configuration ----
// Replace with your own Paystack PUBLIC key (starts with pk_). Public keys
// are safe to expose in frontend code — that's how Paystack expects them used.
const PAYSTACK_PUBLIC_KEY = "pk_test_replace_me";

let PRODUCTS = [];

async function loadProducts() {
  const res = await fetch("products.json");
  PRODUCTS = await res.json();
  renderCatalog();
}

function formatPrice(kobo, currency) {
  const major = kobo / 100;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(major);
}

function renderCatalog() {
  const el = document.getElementById("catalog");
  el.innerHTML = PRODUCTS.map(p => `
    <article class="card">
      <span class="card-tab">${p.kind}</span>
      <h2>${p.title}</h2>
      <p class="blurb">${p.blurb}</p>
      <div class="card-foot">
        <div>
          <div class="price">${formatPrice(p.price, p.currency)}</div>
          <div class="size">${p.size}</div>
        </div>
        <button class="buy-btn" data-id="${p.id}">Buy</button>
      </div>
    </article>
  `).join("");

  el.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", () => openEmailModal(btn.dataset.id));
  });
}

function openEmailModal(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  const root = document.getElementById("modal-root");
  root.innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <h3>${product.title}</h3>
        <p>Enter your email — your download link is tied to it and shown right after payment.</p>
        <input type="email" id="buyer-email" placeholder="you@example.com" autofocus />
        <div class="modal-actions">
          <button class="btn-secondary" id="cancel-btn">Cancel</button>
          <button class="buy-btn" id="pay-btn">Pay ${formatPrice(product.price, product.currency)}</button>
        </div>
        <div id="modal-message"></div>
      </div>
    </div>
  `;

  document.getElementById("cancel-btn").addEventListener("click", closeModal);
  document.getElementById("overlay").addEventListener("click", (e) => {
    if (e.target.id === "overlay") closeModal();
  });
  document.getElementById("pay-btn").addEventListener("click", () => startCheckout(product));
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

function startCheckout(product) {
  const email = document.getElementById("buyer-email").value.trim();
  const messageEl = document.getElementById("modal-message");

  if (!email || !email.includes("@")) {
    messageEl.innerHTML = `<p class="error-text">Enter a valid email first.</p>`;
    return;
  }

  const payBtn = document.getElementById("pay-btn");
  payBtn.disabled = true;

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: product.price, // kobo
    currency: product.currency,
    metadata: { product_id: product.id },
    callback: function (response) {
      verifyPayment(response.reference, product.id, messageEl);
    },
    onClose: function () {
      payBtn.disabled = false;
    }
  });

  handler.openIframe();
}

async function verifyPayment(reference, productId, messageEl) {
  messageEl.innerHTML = `<p class="size">Confirming payment…</p>`;
  try {
    const res = await fetch(`/api/verify?reference=${encodeURIComponent(reference)}&product=${encodeURIComponent(productId)}`);
    const data = await res.json();

    if (data.ok) {
      messageEl.innerHTML = `
        <div class="download-ready">
          Payment confirmed. Your file is ready.
          <br />
          <a href="${data.downloadUrl}" target="_blank" rel="noopener">Download now →</a>
        </div>
      `;
    } else {
      messageEl.innerHTML = `<p class="error-text">${data.error || "Could not confirm payment. If you were charged, email hello@example.com with your reference."}</p>`;
    }
  } catch (err) {
    messageEl.innerHTML = `<p class="error-text">Network error confirming payment. Your reference: ${reference}</p>`;
  }
}

loadProducts();
