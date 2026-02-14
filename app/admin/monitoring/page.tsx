'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ReserveStatus {
  address: string
  name: string
  balance: string
  percentRemaining: number
  daysLeft: number | null
  status: 'healthy' | 'info' | 'warning' | 'critical'
  alerts: string[]
}

interface MonitoringData {
  timestamp: string
  reserves: {
    community: ReserveStatus
    liquidity: ReserveStatus
    treasury: ReserveStatus
    team: ReserveStatus
  }
  totalDistributed: string
  totalRemaining: string
  overallStatus: 'healthy' | 'warning' | 'critical'
  alerts: string[]
}

export default function MonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/reserve-status')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to load data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // Обновлять каждую минуту
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'info': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100'
      case 'info': return 'bg-blue-100'
      case 'warning': return 'bg-yellow-100'
      case 'critical': return 'bg-red-100'
      default: return 'bg-gray-100'
    }
  }

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading reserve data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <button 
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reserve Monitoring</h1>
          <p className="text-gray-600">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Overall Status */}
      <Card className={getStatusBg(data.overallStatus)}>
        <CardHeader>
          <CardTitle className={getStatusColor(data.overallStatus)}>
            Overall Status: {data.overallStatus.toUpperCase()}
          </CardTitle>
        </CardHeader>
        {data.alerts.length > 0 && (
          <CardContent>
            <div className="space-y-2">
              {data.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xl">⚠️</span>
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Distributed</CardTitle>
            <CardDescription>KCODE tokens distributed to users</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Number(data.totalDistributed).toLocaleString()} KCODE
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Remaining</CardTitle>
            <CardDescription>KCODE tokens in reserves</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Number(data.totalRemaining).toLocaleString()} KCODE
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reserve Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data.reserves).map(([key, reserve]) => (
          <Card key={key} className={getStatusBg(reserve.status)}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{reserve.name} Reserve</span>
                <span className={`text-sm ${getStatusColor(reserve.status)}`}>
                  {reserve.status.toUpperCase()}
                </span>
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {reserve.address.slice(0, 10)}...{reserve.address.slice(-8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">
                  {Number(reserve.balance).toLocaleString()} KCODE
                </p>
                <p className="text-sm text-gray-600">Current Balance</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Remaining</span>
                  <span className="font-semibold">
                    {reserve.percentRemaining.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      reserve.percentRemaining > 50 ? 'bg-green-600' :
                      reserve.percentRemaining > 25 ? 'bg-yellow-600' :
                      reserve.percentRemaining > 10 ? 'bg-orange-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${reserve.percentRemaining}%` }}
                  ></div>
                </div>
              </div>

              {reserve.daysLeft !== null && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Estimated days left: <span className="font-semibold">{reserve.daysLeft}</span>
                  </p>
                </div>
              )}

              {reserve.alerts.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  {reserve.alerts.map((alert, i) => (
                    <p key={i} className="text-sm text-red-600">⚠️ {alert}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.reserves.community.percentRemaining < 10 && (
              <li className="text-red-600">
                🔴 URGENT: Community reserve critically low! Consider reducing reward rates immediately.
              </li>
            )}
            {data.reserves.community.percentRemaining < 25 && data.reserves.community.percentRemaining >= 10 && (
              <li className="text-yellow-600">
                🟡 Community reserve running low. Monitor daily distribution rate closely.
              </li>
            )}
            {data.reserves.community.percentRemaining >= 50 && (
              <li className="text-green-600">
                ✅ All reserves at healthy levels. Continue normal operations.
              </li>
            )}
            <li className="text-gray-600">
              📅 Next check recommended: In 24 hours
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
