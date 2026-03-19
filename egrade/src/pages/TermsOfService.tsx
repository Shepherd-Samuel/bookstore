import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";

export default function TermsOfService() {
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
        <h1 className="text-3xl font-black text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 3, 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">1. Introduction and Acceptance</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and eGrade Management Systems Limited ("eGrade", "we", "us", or "our"), a company incorporated under the laws of the Republic of Kenya, with respect to your use of the eGrade M|S platform ("Service"). By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The Service is designed for use by educational institutions in Kenya, including but not limited to Junior Secondary Schools (JSS) and Senior Secondary Schools (SSS), their administrators, teachers, parents, and students, in compliance with Kenya's Competency-Based Curriculum (CBC) as prescribed by the Kenya Institute of Curriculum Development (KICD) and the Ministry of Education (MoE).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>"Platform"</strong> means the eGrade M|S web application, APIs, and all associated services.</li>
              <li><strong>"School"</strong> means any educational institution that registers for and uses the Service.</li>
              <li><strong>"School Admin"</strong> means the individual authorized by the School to administer the School's account.</li>
              <li><strong>"Member"</strong> means any teacher, parent, or student registered under a School account.</li>
              <li><strong>"Personal Data"</strong> has the meaning ascribed to it under the Kenya Data Protection Act, 2019.</li>
              <li><strong>"CBC"</strong> means the Competency-Based Curriculum as defined by KICD.</li>
              <li><strong>"Subscription"</strong> means the paid plan selected by the School to access the Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">3. Eligibility and Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              3.1. The Service is available to registered educational institutions operating in Kenya. Schools must be registered with the Ministry of Education and comply with all applicable education laws and regulations.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              3.2. The School Admin must be an authorized representative of the School, at least 18 years of age, and legally competent to enter into binding agreements on behalf of the School.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              3.3. Student accounts are created and managed by the School Admin. Students under 18 access the platform through parental or guardian consent facilitated by the School.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              3.4. You agree to provide accurate, current, and complete registration information and to maintain the accuracy of such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">4. Use of the Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              4.1. <strong>Permitted Use:</strong> The Service may be used solely for the management of school administrative functions, CBC assessments, student enrollment, fee management, attendance tracking, curriculum design, and related educational purposes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              4.2. <strong>Prohibited Conduct:</strong> You shall not: (a) use the Service for any unlawful purpose or in violation of any applicable Kenyan law; (b) share login credentials with unauthorized persons; (c) attempt to gain unauthorized access to other Schools' data; (d) upload malicious code, viruses, or harmful content; (e) reverse engineer, decompile, or disassemble any part of the Service; (f) use the Service to store or process data unrelated to educational administration; (g) use automated means to access the Service without prior written consent.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              4.3. <strong>Data Isolation:</strong> Each School's data is logically isolated within the platform. School Admins are responsible for managing access within their School and ensuring only authorized personnel access sensitive data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">5. Subscriptions and Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              5.1. Access to the Service requires an active Subscription. Subscription plans, pricing, and features are as described on the Platform and may be updated from time to time.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.2. All fees are quoted in Kenya Shillings (KES) and are inclusive of applicable taxes unless stated otherwise.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.3. Payment may be made via M-Pesa, bank transfer, or other payment methods as made available on the Platform.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.4. Subscriptions are billed monthly or annually as selected by the School. Failure to pay by the due date may result in suspension of the School's account after a grace period as specified in the system settings.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              5.5. Refunds are not available for partially used subscription periods unless required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              6.1. The Service, including its design, code, features, documentation, branding, and AI-powered tools, is the exclusive property of eGrade and is protected by Kenyan intellectual property laws and international treaties.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              6.2. The KICD curriculum content, national subject catalogues, and CBC frameworks integrated into the Service are the intellectual property of the Kenya Institute of Curriculum Development and are used in accordance with applicable licenses and guidelines.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              6.3. Schools retain ownership of all data they input into the Service, including student records, assessment results, and financial records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">7. Data Protection and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              7.1. eGrade processes Personal Data in accordance with the Kenya Data Protection Act, 2019, and our Privacy Policy, which forms an integral part of these Terms.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              7.2. For the purposes of the Data Protection Act, the School is the "Data Controller" and eGrade is the "Data Processor" with respect to student, teacher, and parent data.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              7.3. eGrade shall implement appropriate technical and organizational measures to protect Personal Data against unauthorized access, loss, destruction, or alteration, as required under Section 41 of the Data Protection Act.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              7.4. Schools are responsible for obtaining necessary consents from parents and guardians for the processing of children's Personal Data in accordance with Section 33 of the Data Protection Act.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">8. Service Availability and Support</h2>
            <p className="text-muted-foreground leading-relaxed">
              8.1. eGrade shall use commercially reasonable efforts to maintain 99.9% uptime availability for the Service, excluding scheduled maintenance windows.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.2. Scheduled maintenance shall be communicated to Schools at least 24 hours in advance via the Platform's noticeboard or email.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              8.3. Technical support is available during business hours (8:00 AM – 6:00 PM EAT, Monday to Friday) and via email for urgent matters outside these hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">9. Account Suspension and Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              9.1. eGrade may suspend or terminate a School's account for: (a) non-payment of Subscription fees after the grace period; (b) violation of these Terms; (c) fraudulent, abusive, or illegal activity; (d) upon written request by the School.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              9.2. Upon termination, the School may request an export of their data within 30 days. After this period, eGrade may delete the School's data in accordance with our data retention policy.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              9.3. Provisions relating to intellectual property, limitation of liability, and dispute resolution shall survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              10.1. TO THE MAXIMUM EXTENT PERMITTED BY KENYAN LAW, eGrade SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.2. eGrade's total aggregate liability under these Terms shall not exceed the total Subscription fees paid by the School in the twelve (12) months preceding the event giving rise to the claim.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              10.3. eGrade does not warrant that the Service will meet all of the School's requirements, that the Service will be uninterrupted or error-free, or that defects will be corrected within a specific timeframe.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless eGrade, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Service; (b) your breach of these Terms; (c) your violation of any applicable law; (d) any data you submit through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">12. Compliance with Kenyan Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              12.1. The Service is designed to comply with: (a) the Basic Education Act, 2013; (b) the Kenya Data Protection Act, 2019; (c) the Computer Misuse and Cybercrimes Act, 2018; (d) the Consumer Protection Act, 2012; (e) regulations and guidelines issued by the Ministry of Education, KICD, and TSC.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              12.2. Schools are responsible for ensuring their use of the Service complies with all applicable laws, including but not limited to the Children Act, 2022, regarding the processing of children's data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">13. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              13.1. These Terms shall be governed by and construed in accordance with the laws of Kenya.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              13.2. Any dispute arising out of or in connection with these Terms shall first be submitted to mediation in accordance with the Nairobi Centre for International Arbitration (NCIA) Mediation Rules. If mediation fails within 30 days, the dispute shall be referred to and finally resolved by arbitration under the Arbitration Act, 1995 (Cap 49, Laws of Kenya).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              13.3. The seat of arbitration shall be Nairobi, Kenya. The language of arbitration shall be English.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">14. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              14.1. eGrade reserves the right to modify these Terms at any time. Material changes shall be communicated to Schools via the Platform or email at least 30 days before the changes take effect.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              14.2. Continued use of the Service after the effective date of any modifications constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">15. General Provisions</h2>
            <p className="text-muted-foreground leading-relaxed">
              15.1. <strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and any applicable Subscription agreement, constitute the entire agreement between the parties.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              15.2. <strong>Severability:</strong> If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              15.3. <strong>Waiver:</strong> No waiver of any provision shall be deemed a further or continuing waiver of such provision or any other provision.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              15.4. <strong>Assignment:</strong> You may not assign these Terms without prior written consent from eGrade. eGrade may assign these Terms to any successor entity.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              15.5. <strong>Force Majeure:</strong> eGrade shall not be liable for any failure or delay in performance resulting from causes beyond its reasonable control, including but not limited to acts of God, government actions, pandemics, internet service failures, or power outages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-3">16. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions or concerns regarding these Terms, please contact us at:
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mt-3 text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">eGrade Management Systems Limited</strong></p>
              <p>Email: legal@egrade.co.ke</p>
              <p>Phone: +254 700 000 000</p>
              <p>Address: Nairobi, Kenya</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
