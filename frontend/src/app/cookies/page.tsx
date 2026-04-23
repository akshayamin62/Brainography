import Link from "next/link";
import PublicBackHomeLink from "@/components/PublicBackHomeLink";

export const metadata = { title: "Cookie Policy – IMPACT Brainography" };

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 text-gray-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <PublicBackHomeLink />

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">Cookie Policy</h1>
          <p className="mb-10 text-base text-gray-500">Effective Date: 15.04.2026</p>

          <div className="prose prose-lg prose-gray max-w-none space-y-8 leading-8 text-gray-700 prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:text-2xl prose-h3:text-xl prose-p:text-[17px] prose-li:text-[17px] prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. What Are Cookies?</h2>
          <p>Cookies are small text files stored on your device when you visit a website or use an online platform. They help the system:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>remember your actions</li>
            <li>improve your experience</li>
            <li>understand how the platform is being used</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. How IMPACT Brainography Uses Cookies</h2>
          <p>IMPACT Brainography (operated by KAREER Studio / ADMITra) uses cookies to make the platform work smoothly and to improve user experience. We use cookies for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Keeping you logged in (if applicable)</li>
            <li>Saving your progress during the assessment</li>
            <li>Understanding how users interact with the platform</li>
            <li>Improving performance and usability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Types of Cookies We Use</h2>

          <h3 className="text-lg font-medium text-gray-800 mt-3">a. Essential Cookies</h3>
          <p>These are required for the platform to function properly. They help with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>login and session management</li>
            <li>saving assessment progress</li>
            <li>basic platform operations</li>
          </ul>
          <p className="text-sm text-gray-500">Without these, the system may not work correctly.</p>

          <h3 className="text-lg font-medium text-gray-800 mt-3">b. Performance Cookies</h3>
          <p>These help us understand how users navigate the platform and which sections are used most. This allows us to improve the platform over time.</p>

          <h3 className="text-lg font-medium text-gray-800 mt-3">c. Functional Cookies</h3>
          <p>These remember your preferences, such as language and basic settings. They make your experience smoother.</p>

          <h3 className="text-lg font-medium text-gray-800 mt-3">d. Analytics Cookies</h3>
          <p>These help us analyze usage patterns to improve content, features, and user experience.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. What We Do NOT Do</h2>
          <p>We do not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>sell your data through cookies</li>
            <li>use cookies for intrusive tracking</li>
            <li>collect unnecessary personal information through cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. Third-Party Cookies</h2>
          <p>Some cookies may be placed by trusted third-party services (such as analytics or hosting providers). These are used only to improve performance and maintain system functionality.</p>
          <p>We do not control third-party cookie policies, and users are encouraged to review them separately if needed.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Managing Your Cookie Preferences</h2>
          <p>You can control or disable cookies through your browser settings. You can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>block cookies</li>
            <li>delete existing cookies</li>
            <li>receive alerts before cookies are stored</li>
          </ul>
          <p className="text-sm text-gray-500">Note: Disabling certain cookies may affect how the platform works.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Consent to Use Cookies</h2>
          <p>By using IMPACT Brainography, you agree to the use of cookies as described in this policy. If required, a cookie consent banner will be shown when you first visit the platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">8. Updates to This Policy</h2>
          <p>We may update this Cookie Policy from time to time. Any changes will be reflected with an updated &quot;Effective Date.&quot;</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">9. Contact Us</h2>
          <p>If you have questions about this Cookie Policy, contact:</p>
          <p>KAREER Studio / ADMITra<br />Email: <a href="mailto:hello@admitra.io" className="text-blue-600 hover:underline">hello@admitra.io</a><br />Website: <a href="https://admitra.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">admitra.io</a></p>
        </section>
          </div>
        </div>
      </div>
    </div>
  );
}
