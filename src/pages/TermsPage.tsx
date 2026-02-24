import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-3 mb-10">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            L
          </div>
          <span className="text-2xl font-bold text-foreground">Lunex</span>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-1">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: February 2026</p>
        <p className="text-muted-foreground text-sm mb-10">Effective date: February 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">Section 1 — Acceptance of terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              By creating a Lunex account you agree to be bound by these terms of service. If you do not agree to these terms do not use Lunex. These terms are governed by the laws of the Republic of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 2 — What Lunex provides</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lunex provides a digital client management system allowing professional businesses to organise client files, store documents and images securely, and share information with clients through secure private links. Lunex is provided as a subscription service accessible at lunexweb.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 3 — Your account</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. You must provide accurate information during signup. You must be at least 18 years old to use Lunex. You must notify us immediately at support@lunexweb.com if you suspect unauthorised access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 4 — Acceptable use</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You may use Lunex only for lawful purposes. You may not use Lunex to store illegal content of any kind. You may not attempt to access another user's data. You may not use Lunex to harm, harass, or defraud others. You may not attempt to reverse engineer or compromise the security of Lunex. Violation of these terms may result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 5 — Your data and content</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You retain full ownership of all client files, documents, and data you store in Lunex. Lunex claims no ownership over your content. You grant Lunex only the limited rights necessary to store and display your content to you as part of the service. You are responsible for ensuring you have the right to store any personal information of your clients in accordance with POPIA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 6 — POPIA compliance</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              As a Lunex user who stores personal information of others you are a responsible party under POPIA. You are responsible for ensuring you have obtained the necessary consent from your clients to store their personal information. Lunex provides the tools to store and manage this information securely but you remain responsible for your compliance obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 7 — Service availability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We aim for maximum uptime but cannot guarantee uninterrupted service. We are not liable for any loss caused by service interruptions beyond our reasonable control. We will notify users of planned maintenance where possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 8 — Subscription and payment</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lunex is a paid subscription service. Subscription fees are charged monthly or annually as selected. All fees are in South African Rands unless otherwise stated. Subscriptions auto-renew unless cancelled before the renewal date. No refunds are provided for partial months of service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 9 — Termination</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You may cancel your Lunex account at any time from the settings page. We may terminate or suspend accounts that violate these terms with or without notice. Upon termination your data will be deleted within 30 days in accordance with our privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 10 — Limitation of liability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lunex is provided as is without warranty of any kind. To the maximum extent permitted by South African law Lunex shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 11 — Changes to these terms</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We may update these terms from time to time. We will notify you by email at support@lunexweb.com of any material changes. Continued use of Lunex after notification constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 12 — Contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              For any questions about these terms contact us at support@lunexweb.com or visit lunexweb.com.
            </p>
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          {" · "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
