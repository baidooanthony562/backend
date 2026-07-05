export default function PrivacyPolicy() {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-24 pt-10 md:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-golddeep">Legal</p>
      <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-700">

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">1. Who We Are</h2>
          <p>Cindy Nat Enterprise is a home appliance retailer based in Kumasi, Ghana, with locations at Adum and Alabar. We operate the website at <strong>cindynat.vercel.app</strong>. You can reach us at <a href="mailto:baidooanthony562@gmail.com" className="text-brand-dark underline">baidooanthony562@gmail.com</a> or on WhatsApp at <strong>0257543723</strong>.</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">2. Information We Collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Account information:</strong> name, email address, and password when you register.</li>
            <li><strong>Order information:</strong> shipping address, phone number, and payment method when you place an order.</li>
            <li><strong>Guest checkout:</strong> name, email address, and shipping details — no account is created.</li>
            <li><strong>Usage data:</strong> pages visited and actions taken on the site (no personal identifiers are stored).</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">3. How We Use Your Information</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>To process and fulfil your orders.</li>
            <li>To send order confirmation and status update emails.</li>
            <li>To send a verification code when you create an account or reset your password.</li>
            <li>To respond to your support messages.</li>
            <li>We do not sell, rent, or share your personal data with third parties for marketing purposes.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">4. Payment Information</h2>
          <p>We never store card details on our servers. Card payments are processed securely by <strong>Paystack</strong>, a PCI-DSS compliant payment provider — your card information is entered on Paystack's secure checkout and never passes through us. MTN Mobile Money payments are processed through the MTN MoMo API. Cash on delivery and bank transfer payments are handled directly, with no card data collected.</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">5. Data Storage & Security</h2>
          <p>Your data is stored securely on MongoDB Atlas servers. Passwords are hashed using bcrypt and are never stored in plain text. We use HTTPS for all data in transit.</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">6. Your Rights, Retention &amp; Ghana Data Protection</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>You can update your name, phone, and address from your account dashboard at any time.</li>
            <li>You can request deletion of your account and personal data by contacting us at <a href="mailto:baidooanthony562@gmail.com" className="text-brand-dark underline">baidooanthony562@gmail.com</a>.</li>
            <li><strong>Retention:</strong> we keep your account and order information for as long as your account is active or as needed to fulfil orders and meet legal and accounting obligations, after which it is deleted or anonymised.</li>
            <li>As a business operating in Ghana, we handle personal data in line with the <strong>Data Protection Act, 2012 (Act 843)</strong>. You may also contact Ghana's Data Protection Commission regarding your data rights.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">7. Cookies &amp; Analytics</h2>
          <p>We use essential browser storage — a secure sign-in cookie plus localStorage/sessionStorage — to keep you logged in and remember your cart. These are required for the site to work. With your consent, we also use <strong>Google Analytics</strong> to understand how the site is used; it sets its own cookies and shares aggregate usage data with Google. You are asked to accept or decline analytics on your first visit, and declining does not affect your ability to shop. We use no other third-party tracking or advertising cookies.</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">8. Changes to This Policy</h2>
          <p>We may update this policy from time to time. Changes will be posted on this page with a new "last updated" date.</p>
        </div>

        <div>
          <h2 className="mb-2 text-base font-bold text-slate-900">9. Contact Us</h2>
          <p>For any privacy concerns, email us at <a href="mailto:baidooanthony562@gmail.com" className="text-brand-dark underline">baidooanthony562@gmail.com</a> or WhatsApp <strong>0257543723</strong>.</p>
        </div>

      </div>
    </section>
  );
}
