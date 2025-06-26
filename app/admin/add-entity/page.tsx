'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { TreasuryManager } from '@/lib/services/treasury-manager'

export const dynamic = 'force-dynamic'

export default function AddEntityPage() {
  const [formData, setFormData] = useState({
    ticker: '',
    legalName: '',
    btc: '',
    costBasisUsd: '',
    sourceUrl: '',
    lastDisclosed: new Date().toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const supabase = createClient()
    const manager = new TreasuryManager(supabase)
    
    try {
      await manager.addOrUpdateEntity({
        ticker: formData.ticker,
        legalName: formData.legalName,
        btc: parseFloat(formData.btc),
        costBasisUsd: formData.costBasisUsd ? parseFloat(formData.costBasisUsd) : undefined,
        sourceUrl: formData.sourceUrl,
        lastDisclosed: formData.lastDisclosed
      })
      
      setMessage('Entity added successfully!')
      setFormData({
        ticker: '',
        legalName: '',
        btc: '',
        costBasisUsd: '',
        sourceUrl: '',
        lastDisclosed: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      setMessage('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Add Treasury Entity</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ticker</label>
          <input
            type="text"
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., 1357.HK"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Legal Name</label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Meitu, Inc."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">BTC Holdings</label>
          <input
            type="number"
            step="0.0001"
            value={formData.btc}
            onChange={(e) => setFormData({ ...formData, btc: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Cost Basis (USD)</label>
          <input
            type="number"
            value={formData.costBasisUsd}
            onChange={(e) => setFormData({ ...formData, costBasisUsd: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="Optional"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Source URL</label>
          <input
            type="url"
            value={formData.sourceUrl}
            onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="https://..."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Disclosure Date</label>
          <input
            type="date"
            value={formData.lastDisclosed}
            onChange={(e) => setFormData({ ...formData, lastDisclosed: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-white py-2 rounded hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Entity'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
    </div>
  )
} 