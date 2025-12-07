export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-yellow-400">
              Liberia League
            </h3>
            <p className="text-gray-400 text-sm">
              The official platform for managing and tracking Liberia's football leagues,
              divisions, teams, and players.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-yellow-400">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="/fixtures" className="hover:text-yellow-400 transition">
                  Fixtures
                </a>
              </li>
              <li>
                <a href="/standings" className="hover:text-yellow-400 transition">
                  Standings
                </a>
              </li>
              <li>
                <a href="/teams" className="hover:text-yellow-400 transition">
                  Teams
                </a>
              </li>
              <li>
                <a href="/players" className="hover:text-yellow-400 transition">
                  Players
                </a>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h4 className="font-semibold mb-4 text-yellow-400">Information</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="/about" className="hover:text-yellow-400 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="/rules" className="hover:text-yellow-400 transition">
                  League Rules
                </a>
              </li>
              <li>
                <a href="https://wa.me/231776428126" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
                  Contact
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-yellow-400 transition">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-yellow-400">Contact Us</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="mailto:sumomarky@gmail.com" className="hover:text-yellow-400 transition">
                  Email: sumomarky@gmail.com
                </a>
              </li>
              <li>
                <a href="https://wa.me/231776428126" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
                  Phone: +231 776 428 126
                </a>
              </li>
              <li>Location: Monrovia, Liberia</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {currentYear} Liberia Division League. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
