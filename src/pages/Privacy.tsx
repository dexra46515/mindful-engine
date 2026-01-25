/**
 * Privacy Policy Page
 * Required for App Store and Apple entitlement review
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Eye, Lock, Users, Trash2, Mail } from 'lucide-react';

export default function Privacy() {
  const lastUpdated = "January 25, 2025";
  const effectiveDate = "January 25, 2025";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          
          {/* Introduction */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Introduction</h2>
            </div>
            <p className="text-muted-foreground">
              Mindful Balance Engine ("we," "our," or "us") is committed to protecting your privacy 
              and the privacy of your family. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our parental control application.
            </p>
            <p className="text-muted-foreground">
              <strong>Effective Date:</strong> {effectiveDate}
            </p>
          </section>

          {/* Data We Collect */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Information We Collect</h2>
            </div>

            <h3 className="text-lg font-semibold mt-6">Account Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Email address (for account creation and notifications)</li>
              <li>Password (encrypted, never stored in plain text)</li>
              <li>User role (parent, youth, or adult)</li>
              <li>Display name (optional)</li>
              <li>Timezone preferences</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">Device Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Device identifier (anonymized)</li>
              <li>Device type and operating system version</li>
              <li>App version</li>
              <li>Last active timestamp</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">Usage Data (Aggregated Only)</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Session duration (total time app categories are used)</li>
              <li>App open/close timestamps</li>
              <li>Number of app reopens per day</li>
              <li>Intervention responses (acknowledged, dismissed)</li>
            </ul>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-green-700 dark:text-green-300 m-0">What We Do NOT Collect</h4>
              <ul className="list-disc pl-6 mt-2 text-green-600 dark:text-green-400 mb-0">
                <li>Specific content viewed within apps</li>
                <li>Messages, emails, or communications</li>
                <li>Photos, videos, or media files</li>
                <li>Browsing history or URLs visited</li>
                <li>Location data or GPS coordinates</li>
                <li>Contacts or address book</li>
                <li>Keystrokes or typed content</li>
                <li>Microphone or camera data</li>
              </ul>
            </div>
          </section>

          {/* How We Use Data */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">How We Use Your Information</h2>
            </div>

            <h3 className="text-lg font-semibold mt-6">For Parents</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Display aggregated usage statistics for linked children</li>
              <li>Send alerts when usage patterns indicate concern</li>
              <li>Enforce screen time policies you configure</li>
              <li>Provide insights into family digital wellness</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">For Youth (Children)</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Show personal usage statistics</li>
              <li>Display time remaining before limits are reached</li>
              <li>Deliver interventions when limits are exceeded</li>
              <li>Enable time extension requests to parents</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">For Service Improvement</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Analyze anonymized usage patterns to improve interventions</li>
              <li>Identify and fix technical issues</li>
              <li>Develop new features based on aggregated feedback</li>
            </ul>
          </section>

          {/* Parental Consent */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Parental Consent & COPPA Compliance</h2>
            </div>
            <p className="text-muted-foreground">
              We comply with the Children's Online Privacy Protection Act (COPPA) and similar 
              international regulations. Our parental control features require:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Verifiable Parental Consent:</strong> Parents must create an account and 
                generate an invite code before any child's device can be linked</li>
              <li><strong>iOS FamilyControls Authorization:</strong> Apple's system-level permission 
                prompt must be approved on the child's device</li>
              <li><strong>Transparent Monitoring:</strong> Children are always informed that 
                monitoring is active and can see their own usage data</li>
              <li><strong>Parent Control:</strong> Only linked parents can view child data or 
                modify policies</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Data Security</h2>
            </div>
            <p className="text-muted-foreground">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Encryption in Transit:</strong> All data transmitted using TLS 1.3</li>
              <li><strong>Encryption at Rest:</strong> Database encrypted with AES-256</li>
              <li><strong>Row-Level Security:</strong> Database policies ensure users can only 
                access their own data or linked family members' data</li>
              <li><strong>Secure Authentication:</strong> Passwords hashed using bcrypt</li>
              <li><strong>Regular Audits:</strong> Periodic security reviews and penetration testing</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Data Sharing & Third Parties</h2>
            <p className="text-muted-foreground">
              We do <strong>not</strong> sell, rent, or trade your personal information. 
              We may share data only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Service Providers:</strong> Cloud infrastructure (Supabase/AWS) for 
                hosting and data storage, bound by data processing agreements</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or 
                court order</li>
              <li><strong>Safety:</strong> To protect the safety of a child when there is 
                imminent risk of harm</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Data Retention</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Account Data:</strong> Retained while account is active</li>
              <li><strong>Usage Data:</strong> Aggregated daily, raw events deleted after 30 days</li>
              <li><strong>Intervention History:</strong> Retained for 90 days for effectiveness analysis</li>
              <li><strong>Deleted Accounts:</strong> All personal data permanently deleted within 30 days</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Trash2 className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Your Rights</h2>
            </div>
            <p className="text-muted-foreground">
              Under GDPR, CCPA, and similar regulations, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of all data we hold about you</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Opt out of certain data processing activities</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent at any time</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              To exercise these rights, contact us at privacy@mindfulbalance.app
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">International Data Transfers</h2>
            <p className="text-muted-foreground">
              Your data may be processed in countries outside your residence. We ensure 
              appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
              <li>Data Processing Agreements with all service providers</li>
              <li>Compliance with UAE Child Digital Safety (CDS) Law requirements</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our app is designed for family use with parental oversight. For users under 18:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Account creation requires parental invite code</li>
              <li>Data collection is limited to usage aggregates only</li>
              <li>No targeted advertising or marketing to children</li>
              <li>Parents can access, modify, or delete child data at any time</li>
              <li>Parents can unlink a child's device and stop monitoring</li>
            </ul>
          </section>

          {/* Changes */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy periodically. We will notify you of material 
              changes by:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Posting the updated policy in the app</li>
              <li>Sending an email notification to account holders</li>
              <li>Displaying an in-app notification</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Continued use of the app after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Contact Us</h2>
            </div>
            <p className="text-muted-foreground">
              For privacy-related inquiries, data requests, or concerns:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <p className="mb-2"><strong>Email:</strong> privacy@mindfulbalance.app</p>
              <p className="mb-2"><strong>Data Protection Officer:</strong> dpo@mindfulbalance.app</p>
              <p className="mb-0"><strong>Address:</strong> [Your Company Address]</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Mindful Balance Engine. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link to="/demo" className="hover:text-primary">Apple Review Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
