/**
 * Terms of Service Page
 * Required for App Store submission
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Users, Shield, AlertTriangle, Scale, Ban } from 'lucide-react';

export default function Terms() {
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
            <h1 className="font-semibold">Terms of Service</h1>
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
              <FileText className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Agreement to Terms</h2>
            </div>
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your use of Mindful Balance Engine 
              ("the App," "we," "our," or "us"). By downloading, installing, or using the App, 
              you agree to be bound by these Terms.
            </p>
            <p className="text-muted-foreground">
              <strong>Effective Date:</strong> {effectiveDate}
            </p>
            <p className="text-muted-foreground">
              If you do not agree to these Terms, do not use the App. If you are a parent or 
              guardian agreeing on behalf of a minor, you represent that you have the authority 
              to bind them to these Terms.
            </p>
          </section>

          {/* Description of Service */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Description of Service</h2>
            </div>
            <p className="text-muted-foreground">
              Mindful Balance Engine is a parental control and digital wellness application that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Monitors aggregated screen time usage on linked devices</li>
              <li>Allows parents to set screen time limits and schedules</li>
              <li>Delivers interventions when usage limits are exceeded</li>
              <li>Provides insights into family digital wellness patterns</li>
              <li>Enables communication between parents and children about device usage</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              The App is intended for use by families to promote healthy digital habits. 
              It is not intended for surveillance, stalking, or monitoring adults without consent.
            </p>
          </section>

          {/* User Roles */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">User Accounts & Roles</h2>
            </div>

            <h3 className="text-lg font-semibold mt-6">Account Types</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li><strong>Parent/Guardian:</strong> Adults who manage policies for linked children</li>
              <li><strong>Youth:</strong> Users under 18 whose devices are monitored with parental consent</li>
              <li><strong>Adult:</strong> Users 18+ who use the App for personal self-tracking only</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">Account Responsibilities</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>You must provide accurate information during registration</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>Parents are responsible for obtaining consent from their children</li>
              <li>You may not share your account credentials with others</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">Family Linking</h3>
            <p className="text-muted-foreground">
              To link a child's device, parents must:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground">
              <li>Create a parent account and generate an invite code</li>
              <li>Share the invite code with their child</li>
              <li>Ensure the child understands monitoring will be enabled</li>
              <li>Approve the iOS FamilyControls authorization on the child's device</li>
            </ol>
          </section>

          {/* Parental Consent */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Parental Consent Requirements</h2>
            <p className="text-muted-foreground">
              By using the App to monitor a child's device, you represent and warrant that:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>You are the parent or legal guardian of the child</li>
              <li>You have the legal authority to consent on behalf of the child</li>
              <li>You have informed the child that their device usage will be monitored</li>
              <li>You will use the App only for legitimate parental control purposes</li>
              <li>You will not use the App to monitor individuals who are not your children</li>
            </ul>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
              <p className="text-amber-700 dark:text-amber-300 mb-0">
                <strong>⚠️ Warning:</strong> Using this App to monitor adults without their 
                explicit consent may violate local laws and is strictly prohibited.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Acceptable Use Policy</h2>
            </div>
            <p className="text-muted-foreground">
              You agree NOT to use the App to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Monitor adults without their knowledge and consent</li>
              <li>Stalk, harass, or intimidate any person</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Circumvent or disable any security features</li>
              <li>Reverse engineer, decompile, or disassemble the App</li>
              <li>Transmit malware, viruses, or harmful code</li>
              <li>Impersonate another person or entity</li>
              <li>Use the App for any commercial purpose without authorization</li>
              <li>Collect data for purposes other than parental control</li>
            </ul>
          </section>

          {/* Screen Time API */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Apple Screen Time API Usage</h2>
            <p className="text-muted-foreground">
              The App uses Apple's Screen Time APIs (FamilyControls, DeviceActivity, 
              ManagedSettings) subject to Apple's terms:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Screen Time features require iOS 16.0 or later</li>
              <li>FamilyControls authorization must be granted by the device user</li>
              <li>We do not have access to specific content or communications</li>
              <li>Apple may modify or discontinue Screen Time APIs at any time</li>
              <li>Certain features may not be available in all regions</li>
            </ul>
          </section>

          {/* Limitations */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Limitations & Disclaimers</h2>
            </div>

            <h3 className="text-lg font-semibold mt-6">Service Limitations</h3>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>The App may not detect all types of harmful content or behavior</li>
              <li>Screen time limits can be circumvented by tech-savvy users</li>
              <li>The App is not a substitute for active parental supervision</li>
              <li>Features may vary based on device type and OS version</li>
              <li>Internet connectivity is required for real-time monitoring</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6">Disclaimer of Warranties</h3>
            <p className="text-muted-foreground">
              THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, 
              FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-lg font-semibold mt-6">Limitation of Liability</h3>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE 
              OF THE APP, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Harm to a child that the App failed to prevent</li>
              <li>Loss of data or service interruptions</li>
              <li>Unauthorized access to your account</li>
              <li>Actions taken by Apple affecting Screen Time APIs</li>
            </ul>
          </section>

          {/* Indemnification */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless Mindful Balance Engine, its officers, 
              directors, employees, and agents from any claims, damages, losses, or expenses 
              (including legal fees) arising from:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Your use or misuse of the App</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Claims by children or third parties related to your monitoring activities</li>
            </ul>
          </section>

          {/* Subscription & Payments */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Subscription & Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Some features may require a paid subscription</li>
              <li>Subscriptions are billed through your Apple ID account</li>
              <li>Subscriptions auto-renew unless cancelled 24 hours before renewal</li>
              <li>Refunds are subject to Apple's refund policies</li>
              <li>We reserve the right to change pricing with 30 days notice</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your account if:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>You violate these Terms</li>
              <li>We suspect fraudulent or illegal activity</li>
              <li>Required by law or court order</li>
              <li>We discontinue the service (with reasonable notice)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You may terminate your account at any time through the App settings. Upon 
              termination, your data will be deleted in accordance with our Privacy Policy.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold m-0">Governing Law & Disputes</h2>
            </div>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of [Your Jurisdiction], without regard to 
              conflict of law principles.
            </p>
            <p className="text-muted-foreground mt-4">
              Any disputes arising from these Terms shall be resolved through:
            </p>
            <ol className="list-decimal pl-6 text-muted-foreground">
              <li>Good faith negotiation between the parties</li>
              <li>Mediation by a mutually agreed mediator</li>
              <li>Binding arbitration if mediation fails</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              Class action lawsuits and class-wide arbitration are not permitted.
            </p>
          </section>

          {/* Changes */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these Terms periodically. Material changes will be communicated via:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>In-app notification</li>
              <li>Email to registered account holders</li>
              <li>Updated "Last Modified" date on this page</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Continued use of the App after changes constitutes acceptance. If you disagree 
              with changes, you must stop using the App and delete your account.
            </p>
          </section>

          {/* Severability */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Severability</h2>
            <p className="text-muted-foreground">
              If any provision of these Terms is found unenforceable, the remaining provisions 
              will continue in effect. The unenforceable provision will be modified to the 
              minimum extent necessary to make it enforceable.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold">Contact Information</h2>
            <p className="text-muted-foreground">
              For questions about these Terms:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mt-4">
              <p className="mb-2"><strong>Email:</strong> legal@mindfulbalance.app</p>
              <p className="mb-2"><strong>Support:</strong> support@mindfulbalance.app</p>
              <p className="mb-0"><strong>Address:</strong> [Your Company Address]</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="mb-12">
            <div className="bg-primary/10 rounded-lg p-6">
              <h2 className="text-xl font-bold m-0 mb-4">Acknowledgment</h2>
              <p className="text-muted-foreground mb-0">
                By using Mindful Balance Engine, you acknowledge that you have read, understood, 
                and agree to be bound by these Terms of Service. If you are a parent or guardian 
                using the App to monitor a child, you also confirm that you have the legal 
                authority to consent on behalf of that child.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Mindful Balance Engine. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link to="/demo" className="hover:text-primary">Apple Review Demo</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
