import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-3 mb-10">
          <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            L
          </div>
          <span className="text-2xl font-bold text-foreground">Lunex</span>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-1">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-2">Last updated: February 2026</p>
        <p className="text-muted-foreground text-sm mb-10">Effective date: February 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">Section 1 — Who we are</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lunex is a digital client management system for South African professionals. We are operated by Lunex and accessible at lunexweb.com. For any privacy queries contact us at support@lunexweb.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 2 — What we collect</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We collect your name, email address, and business information provided during signup. We collect the client files, projects, fields, documents, images, and notes you create within Lunex. We collect basic usage data to improve our service. We do not collect any information beyond what is necessary to provide the Lunex service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 3 — Why we collect it</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We collect this information solely to provide you with the Lunex client management service. We do not use your data for advertising purposes. We do not sell your data to any third party under any circumstances. We do not share your data with third parties without your explicit consent except where required by South African law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 4 — How we protect your information</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your data is stored securely using encrypted cloud infrastructure. Access to your data is protected by Row Level Security meaning no other Lunex user can ever access your files or client records. All data is transmitted over encrypted HTTPS connections.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 5 — Your rights under POPIA</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              In terms of the Protection of Personal Information Act No 4 of 2013 you have the following rights. The right to access your personal information held by us at any time. The right to request correction of inaccurate or incomplete information. The right to request deletion of your personal information and your account. The right to object to the processing of your personal information. The right to lodge a complaint with the Information Regulator of South Africa. To exercise any of these rights contact us at support@lunexweb.com. We will respond to all requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 6 — Data retention</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We retain your data for as long as your account remains active. When you delete your account all your personal information and client records are permanently removed from our systems within 30 days. Anonymised usage statistics may be retained for service improvement purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 7 — Cookies</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Lunex uses only essential cookies required for authentication and session management. We do not use tracking cookies or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 8 — Changes to this policy</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We will notify you by email at support@lunexweb.com if we make material changes to this privacy policy. Continued use of Lunex after notification constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Section 9 — Contact and complaints</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              For any privacy related queries or complaints contact us at support@lunexweb.com. You may also contact the Information Regulator of South Africa at inforegulator.org.za.
            </p>
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">Back to login</Link>
          {" · "}
          <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
        </p>
      </div>
    </div>
  );
}
