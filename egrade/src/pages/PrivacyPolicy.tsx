import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img src={logoImg} alt="eGrade" className="w-7 h-7 object-contain" />
            </div>
            <span className="font-black text-foreground text-sm">eGrade M|S</span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-black text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 3, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              eGrade Management Systems Limited ("eGrade", "we", "us", or "our") is committed to protecting the privacy and security of personal data processed through the eGrade M|S platform ("Service"). This Privacy Policy explains how we collect, use, store, share, and protect your personal data in compliance with the <strong>Kenya Data Protection Act, 2019 (No. 24 of 2019)</strong> ("DPA"), regulations issued by the <strong>Office of the Data Protection Commissioner (ODPC)</strong>, and other applicable data protection laws.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This policy applies to all users of the Service, including School Administrators, teachers, parents, guardians, and students.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">2. Data Controller and Data Processor</h2>
            <p className="text-muted-foreground leading-relaxed">
              2.1. Under the DPA, the <strong>School</strong> is the "Data Controller" — it determines the purposes and means of processing personal data of its students, staff, and parents.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              2.2. <strong>eGrade</strong> acts as the "Data Processor" — we process personal data on behalf of and under the instructions of the School, in accordance with Section 2 and Section 39 of the DPA.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              2.3. For data related to our own operations (e.g., School Admin registration, billing, platform accounts), eGrade acts as a Data Controller.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">3. Categories of Personal Data We Process</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We process the following categories of personal data:</p>

            <h3 className="text-base font-bold text-foreground mt-4 mb-2">3.1. Student Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Full name, date of birth, gender</li>
              <li>Admission number, class/stream allocation</li>
              <li>Passport-size photograph</li>
              <li>CBC assessment results (EE/ME/AE/BE performance levels)</li>
              <li>Attendance records</li>
              <li>Discipline records</li>
              <li>Fee payment records</li>
              <li>Parent/guardian contact information</li>
              <li>Birth certificate number and UPI (for NEMIS compliance)</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mt-4 mb-2">3.2. Teacher/Staff Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Full name, phone number, email address</li>
              <li>TSC number (where applicable)</li>
              <li>Subject and stream allocations</li>
              <li>Assessment and grading records</li>
              <li>Attendance marking records</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mt-4 mb-2">3.3. Parent/Guardian Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Full name, phone number, email address</li>
              <li>National ID number</li>
              <li>Occupation, relationship to student</li>
              <li>Fee payment and receipt records</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mt-4 mb-2">3.4. School Administrative Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>School name, registration details, location, contact information</li>
              <li>Subscription and billing information</li>
              <li>Class structures, streams, and department configurations</li>
            </ul>

            <h3 className="text-base font-bold text-foreground mt-4 mb-2">3.5. Technical Data</h3>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>IP addresses, browser type, device information</li>
              <li>Usage logs, error logs, session data</li>
              <li>Authentication tokens and session identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">4. Legal Basis for Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              In accordance with Section 30 of the DPA, we process personal data on the following lawful bases:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong>Consent (Section 32):</strong> Parents/guardians provide consent through the School for the processing of their children's data.</li>
              <li><strong>Contractual Necessity (Section 30(1)(b)):</strong> Processing is necessary for the performance of the School's subscription agreement with eGrade.</li>
              <li><strong>Legal Obligation (Section 30(1)(c)):</strong> Processing required for compliance with the Basic Education Act, 2013, NEMIS requirements, and MoE regulations.</li>
              <li><strong>Legitimate Interest (Section 30(1)(f)):</strong> Processing for system security, fraud prevention, service improvement, and error logging.</li>
              <li><strong>Public Interest (Section 30(1)(e)):</strong> Processing of student enrollment data for national education planning as required by the Ministry of Education.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">5. Processing of Children's Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              5.1. In accordance with Section 33 of the DPA, the processing of personal data relating to a child (any person under the age of 18 years as defined by the Children Act, 2022) requires the consent of the child's parent or guardian.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.2. Schools are responsible for obtaining and maintaining records of parental consent for each student registered on the platform. eGrade provides tools within the Service to facilitate this process.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.3. We process children's data solely for the purposes of educational administration and do not use it for marketing, profiling, or any purpose unrelated to the child's education.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.4. The best interests of the child, as enshrined in Article 53 of the Constitution of Kenya, 2010, are a primary consideration in all data processing activities involving children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">6. Purpose of Processing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We process personal data for the following specific purposes:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Student enrollment, admission, and academic record management</li>
              <li>CBC assessment recording and report generation (EE/ME/AE/BE levels)</li>
              <li>Daily attendance tracking and absence notification</li>
              <li>Fee billing, M-Pesa payment tracking, and receipt generation</li>
              <li>Teacher-subject-stream allocation management</li>
              <li>KICD curriculum design and lesson planning</li>
              <li>Parent-school communication via noticeboard and notifications</li>
              <li>NEMIS data preparation and export</li>
              <li>Discipline incident recording and tracking</li>
              <li>Library resource management and book lending</li>
              <li>System administration, error logging, and troubleshooting</li>
              <li>Subscription management and billing</li>
              <li>Service improvement and analytics (aggregated, anonymized data only)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">7. Data Security Measures</h2>
            <p className="text-muted-foreground leading-relaxed">
              In compliance with Section 41 of the DPA, we implement the following technical and organizational security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256).</li>
              <li><strong>Multi-Tenant Isolation:</strong> Each School's data is logically isolated using Row-Level Security (RLS) policies, ensuring no School can access another School's data.</li>
              <li><strong>Authentication:</strong> Secure password hashing, JWT-based session management, and role-based access control (RBAC) with five distinct roles.</li>
              <li><strong>Access Control:</strong> Principle of least privilege applied — users can only access data relevant to their role and School.</li>
              <li><strong>Audit Logging:</strong> System logs are maintained for security monitoring and incident response.</li>
              <li><strong>Regular Security Reviews:</strong> Periodic vulnerability assessments and security audits.</li>
              <li><strong>Data Backup:</strong> Automated daily backups with point-in-time recovery capability.</li>
              <li><strong>Incident Response:</strong> Documented incident response procedures in compliance with Section 43 of the DPA.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">8. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed">
              8.1. <strong>Within the School:</strong> Data is shared with authorized School members based on their role (e.g., teachers can access student data for their assigned streams).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.2. <strong>Service Providers:</strong> We may engage sub-processors for hosting, infrastructure, email delivery, and payment processing. All sub-processors are bound by data processing agreements that comply with the DPA.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.3. <strong>Legal Requirements:</strong> We may disclose data when required by law, court order, or government request, including requests from the Ministry of Education, ODPC, or law enforcement agencies.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.4. <strong>NEMIS and MoE:</strong> Schools may export student data for submission to the National Education Management Information System (NEMIS) as required by the Ministry of Education.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.5. We do <strong>not</strong> sell, rent, or trade personal data to third parties for marketing or commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">9. Cross-Border Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              9.1. In accordance with Section 48 of the DPA, personal data may be transferred outside Kenya only to countries or organizations that provide adequate data protection safeguards as determined by the ODPC.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              9.2. Our primary data storage and processing infrastructure is located in secure data centers. Where data is processed outside Kenya, we ensure appropriate safeguards are in place, including standard contractual clauses approved by the ODPC.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              9.3. We do not transfer data to jurisdictions that do not meet the adequacy requirements of the DPA without implementing additional protective measures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">10. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              10.1. We retain personal data only for as long as necessary to fulfill the purposes for which it was collected, or as required by applicable law.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.2. <strong>Active Accounts:</strong> Data is retained for the duration of the School's active subscription.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.3. <strong>Post-Termination:</strong> Upon termination of a School's subscription, data is retained for 30 days to allow for data export. Thereafter, data is securely deleted unless retention is required by law (e.g., financial records under the Income Tax Act require 7 years retention).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.4. <strong>Student Academic Records:</strong> In accordance with MoE guidelines, student academic records may be retained for a period of up to 10 years after the student's departure from the School.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.5. <strong>Error and Audit Logs:</strong> Technical logs are retained for 12 months for security and troubleshooting purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">11. Your Rights Under the DPA</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Under the Kenya Data Protection Act, you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Right to be Informed (Section 26):</strong> You have the right to be informed about the collection and use of your personal data.</li>
              <li><strong>Right of Access (Section 26(b)):</strong> You have the right to request a copy of the personal data we hold about you.</li>
              <li><strong>Right to Rectification (Section 26(c)):</strong> You have the right to request correction of inaccurate or incomplete personal data.</li>
              <li><strong>Right to Deletion (Section 26(d)):</strong> You have the right to request deletion of your personal data, subject to legal retention requirements.</li>
              <li><strong>Right to Object (Section 26(e)):</strong> You have the right to object to the processing of your personal data on grounds relating to your particular situation.</li>
              <li><strong>Right to Data Portability (Section 26(g)):</strong> You have the right to receive your personal data in a structured, commonly used, and machine-readable format.</li>
              <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you have the right to withdraw consent at any time without affecting the lawfulness of prior processing.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, parents and guardians should contact their School Admin. School Admins may contact eGrade at <strong>privacy@egrade.co.ke</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">12. Data Breach Notification</h2>
            <p className="text-muted-foreground leading-relaxed">
              12.1. In accordance with Section 43 of the DPA, in the event of a personal data breach, eGrade shall notify the affected School and the Office of the Data Protection Commissioner within 72 hours of becoming aware of the breach.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              12.2. The notification shall include: the nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed to address the breach.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              12.3. Schools are responsible for notifying affected parents, guardians, and staff members as required under the DPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">13. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              13.1. The Service uses essential cookies for authentication and session management. These cookies are strictly necessary for the operation of the Service and cannot be disabled.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              13.2. We do <strong>not</strong> use advertising cookies, social media tracking pixels, or third-party analytics that track individual users across websites.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              13.3. Any aggregated usage analytics are collected in anonymized form and cannot be used to identify individual users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">14. AI-Powered Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              14.1. The Service includes AI-powered features (e.g., curriculum content analysis). These features process educational content to extract structured data (strands, sub-strands, learning outcomes) and do not involve profiling or automated decision-making about individuals.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              14.2. AI-processed content is not used to train external models or shared with third-party AI providers beyond the scope of the immediate processing request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">15. Complaints</h2>
            <p className="text-muted-foreground leading-relaxed">
              15.1. If you believe your data protection rights have been violated, you may lodge a complaint with:
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mt-3 text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Office of the Data Protection Commissioner (ODPC)</strong></p>
              <p>Immaculate Building, 5th Floor</p>
              <p>P.O. Box 93476-10101, Nairobi</p>
              <p>Email: complaints@odpc.go.ke</p>
              <p>Website: www.odpc.go.ke</p>
            </div>
            <p className="text-muted-foreground leading-relaxed mt-3">
              15.2. We encourage you to contact us first at <strong>privacy@egrade.co.ke</strong> so we can address your concern promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">16. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. Material changes will be communicated to Schools via the Platform at least 30 days before they take effect. The "Last updated" date at the top of this policy indicates when it was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">17. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, requests, or complaints regarding this Privacy Policy or our data processing practices:
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mt-3 text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Data Protection Officer</strong></p>
              <p>eGrade Management Systems Limited</p>
              <p>Email: privacy@egrade.co.ke</p>
              <p>Phone: +254 700 000 000</p>
              <p>Address: Nairobi, Kenya</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
