import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* App Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">GBBO Fantasy League</h3>
            <p className="text-gray-600 text-sm">
              The ultimate Great British Bake Off fantasy league experience. 
              Create leagues, make predictions, and compete with friends!
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/leagues" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Leagues
                </Link>
              </li>
              <li>
                <Link href="/predictions" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Predictions
                </Link>
              </li>
              <li>
                <Link href="/results" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Results
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} GBBO Fantasy League. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm mt-2 sm:mt-0">
              Not affiliated with BBC or Love Productions
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
