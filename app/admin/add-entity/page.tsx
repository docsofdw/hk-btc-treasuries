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
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')
  const [manualUpdateData, setManualUpdateData] = useState({
    ticker: '',
    marketCap: '',
    price: ''
  })
  const [isManualUpdating, setIsManualUpdating] = useState(false)
  
  async function updateMarketData() {
    setIsUpdating(true)
    setUpdateMessage('')
    try {
      const response = await fetch('/api/admin/update-market-data', {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        setUpdateMessage(`✅ Updated ${data.updated} entities successfully! ${data.failed} failed.`)
      } else {
        setUpdateMessage(`❌ Update failed: ${data.error}`)
      }
    } catch (error) {
      setUpdateMessage('❌ Update failed: Network error')
    } finally {
      setIsUpdating(false)
    }
  }
  
  async function updateMarketDataManually() {
    if (!manualUpdateData.ticker || !manualUpdateData.marketCap) {
      setUpdateMessage('❌ Please provide ticker and market cap')
      return
    }
    
    setIsManualUpdating(true)
    setUpdateMessage('')
    
    try {
      const response = await fetch('/api/admin/manual-market-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualUpdateData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setUpdateMessage(`✅ Successfully updated ${manualUpdateData.ticker} with market cap $${Number(manualUpdateData.marketCap).toLocaleString()}`)
        setManualUpdateData({ ticker: '', marketCap: '', price: '' })
      } else {
        setUpdateMessage(`❌ Update failed: ${data.error}`)
      }
    } catch (error) {
      setUpdateMessage('❌ Update failed: Network error')
    } finally {
      setIsManualUpdating(false)
    }
  }
  
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
      
      <div className="mt-8 pt-8 border-t">
        <h2 className="text-xl font-bold mb-4">Admin Actions</h2>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={updateMarketData}
              disabled={isUpdating}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating Market Data...' : 'Update Market Data (Demo)'}
            </button>
            <p className="text-sm text-gray-600 mt-1">
              Note: Yahoo Finance blocks server requests. This uses demo data.
            </p>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Manual Market Data Update</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="Ticker (e.g., 1357.HK)"
                value={manualUpdateData.ticker}
                onChange={(e) => setManualUpdateData({ ...manualUpdateData, ticker: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Market Cap (USD)"
                value={manualUpdateData.marketCap}
                onChange={(e) => setManualUpdateData({ ...manualUpdateData, marketCap: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price (optional)"
                value={manualUpdateData.price}
                onChange={(e) => setManualUpdateData({ ...manualUpdateData, price: e.target.value })}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={updateMarketDataManually}
              disabled={isManualUpdating}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
            >
              {isManualUpdating ? 'Updating...' : 'Update Manually'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Use current market data from Yahoo Finance, Bloomberg, etc.
            </p>
          </div>
          
          {updateMessage && (
            <div className={`p-3 rounded ${updateMessage.startsWith('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {updateMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 