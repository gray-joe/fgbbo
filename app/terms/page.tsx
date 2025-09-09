import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions - GBBO Fantasy League',
  description: 'Terms and conditions for the Great British Bake Off Fantasy League application'
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms & Conditions</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using this Great British Bake Off Fantasy League application ("Service"), 
                you accept and agree to be bound by the terms and provision of this agreement. If you do 
                not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                This application provides a fantasy league platform where users can create and join leagues, 
                make predictions about baking competition outcomes, and compete with other users based on 
                scoring systems. This service is for entertainment purposes only.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Important:</strong> This application is not officially affiliated with, endorsed by, 
                or connected to the BBC, Love Productions, or the Great British Bake Off television program. 
                All references to the show are used for entertainment purposes only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts & Registration</h2>
              <p className="text-gray-700 mb-4">
                To use this service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Providing accurate and complete information</li>
                <li>Maintaining the security of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs 
                your use of the service, to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Intellectual Property Rights</h2>
              <p className="text-gray-700 mb-4">
                The service and its original content, features, and functionality are and will remain 
                the exclusive property of the application owner and its licensors. The service is 
                protected by copyright, trademark, and other laws.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Third-party Content:</strong> All references to "Great British Bake Off," 
                "GBBO," and related content are the property of the BBC and Love Productions. 
                We claim no ownership of this content and use it under fair use principles for 
                entertainment purposes only.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. User Conduct & Prohibited Activities</h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Use the service for any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>Violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>Submit false or misleading information</li>
                <li>Upload or transmit viruses or any other type of malicious code</li>
                <li>Attempt to gain unauthorized access to any portion of the service</li>
                <li>Use automated systems to access the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. League Rules & Scoring</h2>
              <p className="text-gray-700 mb-4">
                League creation and management are subject to the following rules:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Leagues are created and managed by users at their own discretion</li>
                <li>League owners have the right to manage their leagues as they see fit</li>
                <li>Scoring is based on predictions and may be updated as the competition progresses</li>
                <li>We reserve the right to modify scoring systems with reasonable notice</li>
                <li>No real money prizes are awarded through this service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Disclaimers & Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                The information on this service is provided on an "as is" basis. To the fullest extent 
                permitted by law, this Company:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                <li>Excludes all representations and warranties relating to this service and its contents</li>
                <li>Excludes all liability for damages arising out of or in connection with your use of this service</li>
                <li>Does not guarantee the accuracy, completeness, or timeliness of information</li>
                <li>Reserves the right to modify or discontinue the service at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and bar access to the service immediately, 
                without prior notice or liability, under our sole discretion, for any reason whatsoever 
                and without limitation, including but not limited to a breach of the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Governing Law & Jurisdiction</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of England and Wales, 
                without regard to its conflict of law provisions. Our failure to enforce any right 
                or provision of these Terms will not be considered a waiver of those rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at 
                any time. If a revision is material, we will provide at least 30 days notice prior 
                to any new terms taking effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms & Conditions, please contact us at:
              </p>
              <p className="text-gray-700">
                Email: joegray122@gmail.com<br />
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
