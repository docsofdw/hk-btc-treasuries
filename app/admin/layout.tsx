import Link from 'next/link';
import { 
  Database, 
  Search, 
  Plus, 
  Monitor, 
  FileText,
  Bot,
  CheckCircle2,
  Settings
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminPages = [
    {
      name: 'Dynamic Scanner',
      href: '/admin/dynamic-updates',
      icon: Bot,
      description: 'AI-powered discovery of new Bitcoin holdings'
    },
    {
      name: 'Manual Add',
      href: '/admin/add-entity',
      icon: Plus,
      description: 'Add companies manually'
    },
    {
      name: 'Filing Scanner',
      href: '/admin/scan-filings',
      icon: FileText,
      description: 'Scan regulatory filings'
    },
    {
      name: 'Monitor',
      href: '/admin/monitor',
      icon: Monitor,
      description: 'View system status'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                ← Back to Site
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">Asia Bitcoin Treasuries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <h3 className="font-medium text-gray-900">{page.name}</h3>
                </div>
                <p className="text-sm text-gray-600">{page.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Status Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">Admin Tools Active</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Use the Dynamic Scanner to discover new Bitcoin holdings, then approve findings to update your database.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {children}
        </div>
      </div>
    </div>
  );
} 