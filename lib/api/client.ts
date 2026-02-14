/**
 * API Client Helper
 * 
 * Централизованный клиент для API запросов с автоматической обработкой auth
 */

import { apiCall } from './authenticated-fetch'

type ApiResponse<T = any> = {
    success: boolean
    data?: T
    error?: string
    details?: any
  }

// Specific response types for different endpoints
type WheelSpinResponse = {
  success: boolean
  reward?: {
    type: string
    value: number
    label: string
  }
  rewardIndex?: number
  pointsChange?: number
  tokensAwarded?: number
  transactionHash?: string
  newTotal?: number
  newAvailable?: number
  freeSpins?: number
  activeMultiplier?: number
  activeBoost?: number
  error?: string
}
  
  class ApiClient {
    private baseUrl: string
  
    constructor(baseUrl: string = '') {
      this.baseUrl = baseUrl
    }
  
    /**
     * Выполняет API запрос с автоматической обработкой auth
     */
    private async request<T = any>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
      console.log("[API] 🚀 Starting request to:", endpoint)
      
      try {
        const response = await apiCall(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })

        console.log("[API] 📨 Response received:", {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })
  
        // Проверяем статус ответа
        if (response.status === 401) {
          console.log("[API] 🔒 Unauthorized response - redirecting to auth")
          // Unauthorized - перенаправляем на главную для auth
          if (typeof window !== 'undefined') {
            window.location.href = '/?reconnect=true'
          }
          return {
            success: false,
            error: 'Unauthorized. Please reconnect wallet.',
          }
        }

        let data: any
        try {
          const responseText = await response.text()
          console.log("[API] 📄 Raw response:", responseText.slice(0, 200) + "...")
          
          if (responseText) {
            data = JSON.parse(responseText)
          } else {
            data = {}
          }
        } catch (jsonError) {
          console.error('[API] ❌ Failed to parse JSON response:', jsonError)
          return {
            success: false,
            error: 'Invalid response format from server',
          }
        }
  
        if (!response.ok) {
          console.error('[API] ❌ Request failed:', {
            endpoint,
            status: response.status,
            error: data?.error || 'Unknown error',
            data: data
          })
          return {
            success: false,
            error: data?.error || `HTTP ${response.status}: ${response.statusText}`,
          }
        }

        console.log("[API] ✅ Request successful:", {
          endpoint,
          success: data?.success,
          hasData: !!data
        })
  
        return data
      } catch (error) {
        console.error('[API] ❌ Request error:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        }
      }
    }
  
    /**
     * GET запрос
     */
    async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'GET',
      })
    }
  
    /**
     * POST запрос
     */
    async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      })
    }
  
    /**
     * PATCH запрос
     */
    async patch<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      })
    }
  
    /**
     * DELETE запрос
     */
    async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
      return this.request<T>(endpoint, {
        method: 'DELETE',
      })
    }
  }
  
  // Экспортируем singleton instance
  export const apiClient = new ApiClient()
  
  // Экспортируем типизированные методы для конкретных API endpoints
  
  /**
   * Wheel Spin API
   */
  export async function spinWheel(useFree: boolean): Promise<WheelSpinResponse> {
    return apiClient.post('/api/points/spin', { useFree })
  }
  
  /**
   * Ritual Verification API
   */
  export async function verifyRitual(tweetUrl: string, predictionMessage: string) {
    return apiClient.post('/api/ritual/verify', { 
      tweetUrl, 
      predictionMessage 
    })
  }
  
  /**
   * Task Completion API
   */
  export async function completeTask(taskId: string, taskType?: string) {
    return apiClient.post('/api/tasks/complete', { 
      taskId, 
      taskType 
    })
  }
  
  /**
   * Sephirot Unlock API
   */
  export async function unlockSephira(sephiraId: number) {
    return apiClient.post('/api/sephirot/unlock', { 
      sephiraId 
    })
  }
  
  /**
   * Get User Profile
   */
  export async function getUserProfile() {
    return apiClient.get('/api/user')
  }
  
  /**
   * Get User Tasks
   */
  export async function getUserTasks() {
    return apiClient.get('/api/user/tasks')
  }
  
  /**
   * Get User Transactions
   */
  export async function getUserTransactions() {
    return apiClient.get('/api/user/transactions')
  }
  
  /**
   * Get Referral Stats
   */
  export async function getReferralStats() {
    return apiClient.get('/api/referrals/stats')
  }
  
  /**
   * Get Sephirot List
   */
  export async function getSephirotList() {
    return apiClient.get('/api/sephirot/list')
  }
  
  /**
   * Get Achievements List
   */
  export async function getAchievementsList() {
    return apiClient.get('/api/achievements/list')
  }