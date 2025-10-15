'use client';

import Link from 'next/link';
import { FileText, Search, CheckCircle2, AlertCircle, Clock, Shield, Database, TrendingUp } from 'lucide-react';

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
              ← Back to Home
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Our Methodology</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Introduction */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            How We Track Bitcoin Holdings
          </h2>
          <p className="text-gray-700 mb-4 leading-relaxed">
            We maintain the most accurate database of corporate Bitcoin holdings in Asia by combining 
            automated filing monitoring, AI-powered text extraction, and manual admin verification. 
            Every data point is source-linked and timestamped.
          </p>
          <p className="text-gray-700 leading-relaxed">
            <strong>Our focus:</strong> Currently tracking HKEX-listed companies with plans to expand 
            across Asia-Pacific markets.
          </p>
        </section>

        {/* Discovery Process */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Search className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">How Filings Are Discovered</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Automated Scanning</h3>
                <p className="text-gray-700">
                  Our system scans HKEX announcements every hour, looking for filings that mention 
                  Bitcoin, crypto, digital assets, or related keywords in multiple languages (English, 
                  Traditional Chinese, Simplified Chinese).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Parsing</h3>
                <p className="text-gray-700">
                  When a relevant filing is found, we download and parse the PDF document to extract 
                  text content. Currently using text-based extraction (OCR support coming soon for 
                  scanned documents).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Discovery</h3>
                <p className="text-gray-700">
                  We also monitor news sources, company announcements, and industry reports using 
                  AI-powered discovery to catch early signals of Bitcoin adoption before official 
                  filings are published.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Extraction Process */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">How Bitcoin Amounts Are Extracted</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-700">
              We use pattern matching to identify Bitcoin quantities in filings:
            </p>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-mono text-sm text-gray-600 mb-2">Pattern Examples:</h4>
              <ul className="space-y-2 text-sm font-mono">
                <li className="text-gray-800">• "holds <strong className="text-orange-600">500 BTC</strong>"</li>
                <li className="text-gray-800">• "acquired <strong className="text-orange-600">1,234.56 bitcoins</strong>"</li>
                <li className="text-gray-800">• "treasury holdings: <strong className="text-orange-600">₿2,000</strong>"</li>
                <li className="text-gray-800">• "purchased <strong className="text-orange-600">250 Bitcoin</strong>"</li>
              </ul>
            </div>

            <p className="text-gray-700">
              Our regex patterns capture:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Numeric amounts with commas and decimals</li>
              <li>Various Bitcoin notation: BTC, ₿, Bitcoin, bitcoins</li>
              <li>Context words: holds, acquired, purchased, treasury, etc.</li>
              <li>Multiple languages (English and Chinese)</li>
            </ul>
          </div>
        </section>

        {/* Verification Process */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">Manual Verification Process</h2>
          </div>
          
          <div className="space-y-6">
            <p className="text-gray-700">
              Every automated finding goes through admin review before being marked as verified:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-semibold text-gray-900">Pending Review</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Automatically extracted holdings awaiting manual verification. Shown in admin 
                  dashboard only.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Verified</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Admin has reviewed the source document and confirmed the Bitcoin amount. 
                  Displayed publicly with verification badge.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Admin Review Checklist:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>✓ Source document accessible and legitimate</li>
                <li>✓ Bitcoin amount clearly stated and unambiguous</li>
                <li>✓ Company name and ticker verified</li>
                <li>✓ Date of disclosure confirmed</li>
                <li>✓ No contradictory information in recent filings</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-900">Known Limitations</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-700">
              We believe in transparency about what we can and cannot track:
            </p>

            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-red-500 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">No OCR Yet:</strong>
                  <span className="text-gray-700"> Cannot extract from scanned/image-based PDFs. 
                  OCR support planned for Q1 2025.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Disclosure Lag:</strong>
                  <span className="text-gray-700"> Data reflects official disclosures, which may 
                  lag real-time holdings by days or weeks.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Intraday Updates:</strong>
                  <span className="text-gray-700"> May miss intraday changes. Our scan runs hourly, 
                  but companies don't always announce immediately.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Private Companies:</strong>
                  <span className="text-gray-700"> Only tracks publicly listed companies with 
                  disclosure requirements.</span>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 font-bold">•</span>
                <div>
                  <strong className="text-gray-900">Language Coverage:</strong>
                  <span className="text-gray-700"> Best accuracy with English and Traditional 
                  Chinese. Simplified Chinese support improving.</span>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Update Frequency */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Update Frequency</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-2">Filing Scans</h4>
              <p className="text-2xl font-bold text-purple-600 mb-1">Hourly</p>
              <p className="text-sm text-gray-600">Automated checks for new HKEX announcements</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-2">Market Data</h4>
              <p className="text-2xl font-bold text-green-600 mb-1">Daily</p>
              <p className="text-sm text-gray-600">BTC prices, market caps, stock prices</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-gray-900 mb-2">AI Discovery</h4>
              <p className="text-2xl font-bold text-blue-600 mb-1">Weekly</p>
              <p className="text-sm text-gray-600">News and early signals analysis</p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-yellow-50 rounded-xl border-2 border-yellow-300 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            Important Disclaimer
          </h2>
          
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Not Investment Advice:</strong> This website provides data for informational 
              and educational purposes only. It should not be considered investment, financial, legal, 
              or tax advice.
            </p>
            <p>
              <strong>No Warranties:</strong> While we strive for accuracy, we cannot guarantee that 
              all data is error-free or complete. Holdings may change between disclosure dates.
            </p>
            <p>
              <strong>Do Your Own Research:</strong> Always verify information with official sources 
              and consult qualified professionals before making any financial decisions.
            </p>
            <p className="text-sm italic border-t border-yellow-200 pt-3 mt-4">
              By using this website, you acknowledge that you have read and understood this disclaimer 
              and agree to use the data at your own risk.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions or Feedback?</h2>
          <p className="text-gray-700 mb-4">
            Found an error? Have suggestions for improving our methodology? We'd love to hear from you.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <a
              href="https://x.com/docsofduke"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              Contact on X (Twitter)
            </a>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Holdings Data
              <TrendingUp className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

