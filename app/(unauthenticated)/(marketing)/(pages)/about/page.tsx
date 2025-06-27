'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">About Bitcoin Treasuries</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Tracking Corporate Bitcoin Adoption
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            Bitcoin Treasuries is dedicated to tracking publicly disclosed Bitcoin holdings by 
            Hong Kong-listed and China-headquartered companies. We aggregate data from official 
            filings, press releases, and regulatory disclosures to provide the most accurate 
            and up-to-date information on corporate Bitcoin adoption in the Asian markets.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our mission is to provide transparency and insights into how traditional corporations 
            are embracing Bitcoin as a treasury reserve asset, particularly focusing on the 
            rapidly evolving Hong Kong and Chinese markets.
          </p>
        </section>

        {/* Methodology */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Methodology</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Sources</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Hong Kong Exchange (HKEX) official filings and announcements</li>
                <li>SEC filings for Chinese ADRs listed on NASDAQ/NYSE</li>
                <li>Company investor relations pages and press releases</li>
                <li>Verified third-party financial data providers</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inclusion Criteria</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Companies must be publicly traded on HKEX, NASDAQ, or NYSE</li>
                <li>Bitcoin holdings must be officially disclosed by the company</li>
                <li>For Chinese companies, primary listing must be on a major exchange</li>
                <li>Holdings must be directly owned by the company (not subsidiaries)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Process</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>All data is cross-referenced with official filings</li>
                <li>Verified entries are marked with a green checkmark</li>
                <li>Unverified entries are clearly labeled and pending confirmation</li>
                <li>Data is updated within 24 hours of new disclosures</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How often is the data updated?
              </h3>
              <p className="text-gray-700">
                Our data is updated daily, with automatic checks for new filings every hour. 
                Major announcements are typically reflected within 1-2 hours of disclosure.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What constitutes &quot;verified&quot; data?
              </h3>
              <p className="text-gray-700">
                Verified data comes directly from official company filings, regulatory documents, 
                or confirmed press releases. Unverified data may come from reliable third-party 
                sources but hasn&apos;t been confirmed in official documentation yet.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Why focus on Hong Kong and China?
              </h3>
              <p className="text-gray-700">
                Hong Kong and China represent one of the fastest-growing markets for corporate 
                Bitcoin adoption. With Hong Kong&apos;s crypto-friendly regulations and China&apos;s 
                large technology sector, tracking these markets provides unique insights into 
                Asian corporate treasury strategies.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I use this data for investment decisions?
              </h3>
              <p className="text-gray-700">
                This website provides information for educational and research purposes only. 
                It should not be considered investment advice. Always conduct your own research 
                and consult with financial professionals before making investment decisions.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                How can I contribute or report errors?
              </h3>
              <p className="text-gray-700">
                We welcome contributions and corrections! Please submit issues or pull requests 
                on our <a href="https://github.com/duke/hk-btc-treasuries" className="text-orange-600 hover:text-orange-700">GitHub repository</a> or 
                contact us via Twitter.
              </p>
            </div>
          </div>
        </section>

        {/* API Access */}
        <section className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">API Access</h2>
          <p className="text-gray-700 mb-4">
            We provide free API access to our Bitcoin treasury data. The API is rate-limited 
            to ensure fair usage and availability for all users.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <p className="text-gray-600 mb-2"># Get all treasury holdings</p>
            <p className="text-gray-900">GET https://hk-btc-treasuries.com/api/v1/holdings</p>
            
            <p className="text-gray-600 mb-2 mt-4"># Get specific company holdings</p>
            <p className="text-gray-900">GET https://hk-btc-treasuries.com/api/v1/holdings?ticker=0700.HK</p>
          </div>
          
          <p className="text-gray-700 mt-4">
            For detailed API documentation, please visit our 
            <a href="https://github.com/duke/hk-btc-treasuries/wiki/API-Documentation" className="text-orange-600 hover:text-orange-700 ml-1">
              API documentation
            </a>.
          </p>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
          <p className="text-gray-700 mb-4">
            Have questions, suggestions, or found an error? We&apos;d love to hear from you!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://github.com/duke/hk-btc-treasuries"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            
            <a
              href="https://twitter.com/YOUR_HANDLE"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Twitter
            </a>
            
            <a
              href="mailto:contact@hk-btc-treasuries.com"
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
