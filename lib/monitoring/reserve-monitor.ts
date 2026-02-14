/**
 * Reserve Monitor - Мониторинг резервов KCODE
 * Отслеживает состояние токеномики и предупреждает о низких балансах
 */

import { ethers } from 'ethers'

// Адреса резервов из .env
const COMMUNITY_RESERVE = process.env.NEXT_PUBLIC_COMMUNITY_RESERVE_ADDRESS!
const LIQUIDITY_RESERVE = process.env.NEXT_PUBLIC_LIQUIDITY_RESERVE_ADDRESS!
const TREASURY_RESERVE = process.env.NEXT_PUBLIC_TREASURY_RESERVE_ADDRESS!
const TEAM_RESERVE = process.env.NEXT_PUBLIC_TEAM_RESERVE_ADDRESS!

// Начальные балансы (из токеномики)
const INITIAL_BALANCES = {
  COMMUNITY: ethers.parseEther('400000000'), // 400M KCODE
  LIQUIDITY: ethers.parseEther('200000000'), // 200M KCODE
  TREASURY: ethers.parseEther('150000000'),  // 150M KCODE
  TEAM: ethers.parseEther('250000000')       // 250M KCODE (vesting)
}

// Пороги для алертов
const ALERT_THRESHOLDS = {
  CRITICAL: 10, // < 10% - критично
  WARNING: 25,  // < 25% - предупреждение
  INFO: 50      // < 50% - информация
}

export interface ReserveStatus {
  address: string
  name: string
  balance: string
  balanceWei: bigint
  initialBalance: bigint
  percentRemaining: number
  daysLeft: number | null
  status: 'healthy' | 'info' | 'warning' | 'critical'
  alerts: string[]
}

export interface MonitoringReport {
  timestamp: Date
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

export class ReserveMonitor {
  private provider: ethers.Provider
  private tokenContract: ethers.Contract

  constructor() {
    // Подключение к Polygon Amoy
    this.provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc-amoy.polygon.technology'
    )

    // ABI для balanceOf
    const tokenAbi = [
      'function balanceOf(address account) view returns (uint256)',
      'function totalSupply() view returns (uint256)'
    ]

    this.tokenContract = new ethers.Contract(
      process.env.NEXT_PUBLIC_KCODE_TOKEN_ADDRESS!,
      tokenAbi,
      this.provider
    )
  }

  /**
   * Получить статус резерва
   */
  async getReserveStatus(
    address: string,
    name: string,
    initialBalance: bigint
  ): Promise<ReserveStatus> {
    try {
      const balanceWei = await this.tokenContract.balanceOf(address)
      const balance = ethers.formatEther(balanceWei)
      
      // Процент оставшихся токенов
      const percentRemaining = Number(
        (balanceWei * 100n) / initialBalance
      )

      // Определить статус
      let status: ReserveStatus['status'] = 'healthy'
      const alerts: string[] = []

      if (percentRemaining < ALERT_THRESHOLDS.CRITICAL) {
        status = 'critical'
        alerts.push(`CRITICAL: ${name} reserve < ${ALERT_THRESHOLDS.CRITICAL}%`)
      } else if (percentRemaining < ALERT_THRESHOLDS.WARNING) {
        status = 'warning'
        alerts.push(`WARNING: ${name} reserve < ${ALERT_THRESHOLDS.WARNING}%`)
      } else if (percentRemaining < ALERT_THRESHOLDS.INFO) {
        status = 'info'
        alerts.push(`INFO: ${name} reserve < ${ALERT_THRESHOLDS.INFO}%`)
      }

      // Оценка дней до исчерпания (только для Community Reserve)
      let daysLeft: number | null = null
      if (name === 'Community' && percentRemaining < 100) {
        daysLeft = await this.estimateDaysLeft(balanceWei, initialBalance)
      }

      return {
        address,
        name,
        balance,
        balanceWei,
        initialBalance,
        percentRemaining,
        daysLeft,
        status,
        alerts
      }
    } catch (error) {
      console.error(`[ReserveMonitor] Error checking ${name}:`, error)
      throw error
    }
  }

  /**
   * Оценить сколько дней осталось до исчерпания резерва
   */
  private async estimateDaysLeft(
    currentBalance: bigint,
    initialBalance: bigint
  ): Promise<number | null> {
    try {
      // Получить историю распределения за последние 7 дней
      // Это упрощенная оценка - в реальности нужно брать данные из БД
      const distributed = initialBalance - currentBalance
      const daysElapsed = 30 // Примерно месяц с запуска
      
      if (daysElapsed === 0) return null

      const dailyRate = Number(distributed) / daysElapsed
      if (dailyRate === 0) return null

      const daysLeft = Number(currentBalance) / dailyRate
      return Math.floor(daysLeft)
    } catch (error) {
      console.error('[ReserveMonitor] Error estimating days:', error)
      return null
    }
  }

  /**
   * Получить полный отчет по всем резервам
   */
  async getMonitoringReport(): Promise<MonitoringReport> {
    try {
      // Получить статус каждого резерва
      const [community, liquidity, treasury, team] = await Promise.all([
        this.getReserveStatus(COMMUNITY_RESERVE, 'Community', INITIAL_BALANCES.COMMUNITY),
        this.getReserveStatus(LIQUIDITY_RESERVE, 'Liquidity', INITIAL_BALANCES.LIQUIDITY),
        this.getReserveStatus(TREASURY_RESERVE, 'Treasury', INITIAL_BALANCES.TREASURY),
        this.getReserveStatus(TEAM_RESERVE, 'Team', INITIAL_BALANCES.TEAM)
      ])

      // Подсчитать общие показатели
      const totalRemaining = 
        community.balanceWei + 
        liquidity.balanceWei + 
        treasury.balanceWei + 
        team.balanceWei

      const totalInitial = 
        INITIAL_BALANCES.COMMUNITY +
        INITIAL_BALANCES.LIQUIDITY +
        INITIAL_BALANCES.TREASURY +
        INITIAL_BALANCES.TEAM

      const totalDistributed = totalInitial - totalRemaining

      // Собрать все алерты
      const allAlerts = [
        ...community.alerts,
        ...liquidity.alerts,
        ...treasury.alerts,
        ...team.alerts
      ]

      // Определить общий статус
      let overallStatus: MonitoringReport['overallStatus'] = 'healthy'
      if (
        community.status === 'critical' ||
        liquidity.status === 'critical' ||
        treasury.status === 'critical'
      ) {
        overallStatus = 'critical'
      } else if (
        community.status === 'warning' ||
        liquidity.status === 'warning' ||
        treasury.status === 'warning'
      ) {
        overallStatus = 'warning'
      }

      return {
        timestamp: new Date(),
        reserves: {
          community,
          liquidity,
          treasury,
          team
        },
        totalDistributed: ethers.formatEther(totalDistributed),
        totalRemaining: ethers.formatEther(totalRemaining),
        overallStatus,
        alerts: allAlerts
      }
    } catch (error) {
      console.error('[ReserveMonitor] Error generating report:', error)
      throw error
    }
  }

  /**
   * Проверить нужно ли отправлять алерты
   */
  shouldSendAlert(report: MonitoringReport): boolean {
    return report.alerts.length > 0
  }

  /**
   * Форматировать отчет для логов
   */
  formatReport(report: MonitoringReport): string {
    const lines = [
      '='.repeat(60),
      '📊 RESERVE MONITORING REPORT',
      '='.repeat(60),
      `Timestamp: ${report.timestamp.toISOString()}`,
      `Overall Status: ${report.overallStatus.toUpperCase()}`,
      '',
      '💰 RESERVES:',
      '',
      `Community Reserve:`,
      `  Balance: ${report.reserves.community.balance} KCODE`,
      `  Remaining: ${report.reserves.community.percentRemaining.toFixed(2)}%`,
      `  Days Left: ${report.reserves.community.daysLeft || 'N/A'}`,
      `  Status: ${report.reserves.community.status}`,
      '',
      `Liquidity Reserve:`,
      `  Balance: ${report.reserves.liquidity.balance} KCODE`,
      `  Remaining: ${report.reserves.liquidity.percentRemaining.toFixed(2)}%`,
      `  Status: ${report.reserves.liquidity.status}`,
      '',
      `Treasury Reserve:`,
      `  Balance: ${report.reserves.treasury.balance} KCODE`,
      `  Remaining: ${report.reserves.treasury.percentRemaining.toFixed(2)}%`,
      `  Status: ${report.reserves.treasury.status}`,
      '',
      `Team Reserve (Vesting):`,
      `  Balance: ${report.reserves.team.balance} KCODE`,
      `  Remaining: ${report.reserves.team.percentRemaining.toFixed(2)}%`,
      `  Status: ${report.reserves.team.status}`,
      '',
      '📈 TOTALS:',
      `  Distributed: ${report.totalDistributed} KCODE`,
      `  Remaining: ${report.totalRemaining} KCODE`,
      ''
    ]

    if (report.alerts.length > 0) {
      lines.push('⚠️  ALERTS:')
      report.alerts.forEach(alert => lines.push(`  ${alert}`))
      lines.push('')
    }

    lines.push('='.repeat(60))

    return lines.join('\n')
  }
}

// Singleton instance
let monitorInstance: ReserveMonitor | null = null

export function getReserveMonitor(): ReserveMonitor {
  if (!monitorInstance) {
    monitorInstance = new ReserveMonitor()
  }
  return monitorInstance
}
