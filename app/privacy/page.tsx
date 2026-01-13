import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | DormUp Discounts',
  description: 'Privacy Policy for DormUp Discounts',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="prose prose-slate max-w-none">
        <h1 className="mb-4 text-3xl font-bold text-slate-900">Privacy Policy</h1>
        
        <p className="text-sm text-slate-600 mb-8">
          Last updated: 13 January 2026
        </p>

        <div className="space-y-6 text-slate-700">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p>
              DormUp Discounts ("we", "our", or "us") is committed to protecting your privacy.
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">2. Information We Collect</h2>
            <p>We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email address and university affiliation</li>
              <li>Name and profile information</li>
              <li>Discount usage and venue interaction data</li>
              <li>Device and usage information when you access our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and manage discount codes</li>
              <li>Send you service-related communications</li>
              <li>Analyze platform usage and improve user experience</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">4. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our platform
              and store certain information. You can instruct your browser to refuse all cookies
              or to indicate when a cookie is being sent. However, if you do not accept cookies,
              you may not be able to use some portions of our platform.
            </p>
            <p className="mt-2">
              We use the following types of cookies:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Necessary cookies:</strong> Required for the platform to function</li>
              <li><strong>Analytics cookies:</strong> Help us understand how you use the platform</li>
              <li><strong>Preference cookies:</strong> Remember your settings</li>
              <li><strong>Marketing cookies:</strong> Used for advertising purposes (if applicable)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">5. Data Sharing and Disclosure</h2>
            <p>We do not sell your personal information. We may share your information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>With partner venues when you use a discount code</li>
              <li>With service providers who assist us in operating our platform</li>
              <li>When required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">6. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your
              personal information. However, no method of transmission over the Internet or
              electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">7. Your Rights</h2>
            <p>Under GDPR and applicable data protection laws, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to fulfill the
              purposes outlined in this Privacy Policy, unless a longer retention period is
              required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">9. Children's Privacy</h2>
            <p>
              Our platform is intended for university students. We do not knowingly collect
              personal information from children under 16. If you believe we have collected
              information from a child under 16, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">10. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any
              changes by posting the new Privacy Policy on this page and updating the "Last
              updated" date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-slate-900">11. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through
              the platform or via the contact information provided in your account settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
