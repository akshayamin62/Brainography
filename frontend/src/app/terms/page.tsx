import Link from "next/link";
import PublicBackHomeLink from "@/components/PublicBackHomeLink";

export const metadata = { title: "Terms & Conditions – IMPACT Brainography" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12 text-gray-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <PublicBackHomeLink />

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-gray-900">Terms &amp; Conditions</h1>
          <p className="mb-10 text-base text-gray-500">Effective Date: 15.04.2026</p>

          <div className="prose prose-lg prose-gray max-w-none space-y-8 leading-8 text-gray-700 prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:text-gray-900 prose-h2:text-2xl prose-h3:text-xl prose-p:text-[17px] prose-li:text-[17px] prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
          <p>These Terms &amp; Conditions (&quot;Terms&quot;) govern the use of the IMPACT Brainography – assessment and related services offered by KAREER Studio, ADMITra, and associated entities (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).</p>
          <p>By accessing or using IMPACT Brainography, you (student, parent/guardian, or institution) agree to be bound by these Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. Nature and Purpose of the Assessment</h2>
          <p>IMPACT Brainography is a self-awareness and communication assessment designed to help students better understand:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>their thinking patterns</li>
            <li>their expression style</li>
            <li>their response to feedback</li>
            <li>their interaction with others</li>
          </ul>
          <p>The assessment is intended only for educational, developmental, and self-improvement purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. No Guarantee of Outcomes</h2>
          <p>The results and recommendations provided:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>reflect responses at a specific point in time</li>
            <li>indicate current behavioral patterns and tendencies</li>
          </ul>
          <p>They do not guarantee:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>academic improvement</li>
            <li>increased confidence</li>
            <li>specific behavioral outcomes</li>
          </ul>
          <p>Progress depends on individual effort, consistency, environment, and support from parents and educators.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Non-Diagnostic Nature</h2>
          <p>IMPACT Brainography is not:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>a psychological test</li>
            <li>a clinical assessment</li>
          </ul>
          <p>It does not identify or evaluate:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>learning disabilities</li>
            <li>mental health conditions</li>
            <li>cognitive or developmental disorders</li>
          </ul>
          <p>For such concerns, users must consult qualified professionals.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. User Responsibility</h2>
          <h3 className="text-lg font-medium text-gray-800 mt-3">Students</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Must provide honest and accurate responses</li>
            <li>Acknowledge that results depend on their inputs</li>
            <li>Use insights for self-improvement</li>
          </ul>
          <h3 className="text-lg font-medium text-gray-800 mt-3">Parents / Guardians</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Must provide consent for minors, if required</li>
            <li>Use results as a guide, not a final judgment</li>
            <li>Support the student&apos;s development process</li>
          </ul>
          <h3 className="text-lg font-medium text-gray-800 mt-3">Schools / Institutions</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the assessment as a developmental tool</li>
            <li>Avoid using results for labelling or limiting students</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Use of Results</h2>
          <p>Assessment reports:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>are intended only for reflection and growth</li>
            <li>should not be used for labelling, ranking, or making final decisions about a student&apos;s ability or future</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Limitation of Liability</h2>
          <p>KAREER Studio, ADMITra, and associated entities shall not be held responsible for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>decisions made based on assessment results</li>
            <li>academic or personal outcomes</li>
            <li>interpretation or misuse of reports</li>
          </ul>
          <p>All actions taken based on the assessment are the responsibility of the student, parents/guardians, and educators.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">8. Evolving Framework</h2>
          <p>IMPACT Brainography is part of an evolving learning system. We reserve the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>update assessment questions</li>
            <li>modify interpretation models</li>
            <li>improve recommendations</li>
          </ul>
          <p>Results are based on the version of the assessment at the time of completion.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">9. Intellectual Property</h2>
          <p>All content related to IMPACT Brainography, including assessment design, reports, frameworks, and tools are the intellectual property of KAREER Studio / ADMITra.</p>
          <p>Users may not copy, reproduce, distribute, or modify without prior permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">10. Data and Privacy</h2>
          <p>Use of IMPACT Brainography is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, which explains how user data is collected, used, and protected.</p>
          <p>By using IMPACT Brainography, you agree to the terms outlined in the Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">11. Termination of Access</h2>
          <p>We reserve the right to restrict or terminate access in cases of misuse, false data submission, or violation of these Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">12. Changes to Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the platform after changes implies acceptance of the updated Terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">13. Governing Law</h2>
          <p>These Terms shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of Vadodara.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">14. Acceptance of Terms</h2>
          <p>By taking the IMPACT Brainography assessment, users (students, parents, or institutions) confirm that they:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>understand the purpose and limitations of the assessment</li>
            <li>agree to use it responsibly</li>
            <li>accept these Terms &amp; Conditions</li>
          </ul>
        </section>
          </div>
        </div>
      </div>
    </div>
  );
}
