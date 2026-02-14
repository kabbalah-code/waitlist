import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Простая проверка здоровья системы
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        database: "connected", // TODO: проверить Supabase
        blockchain: "connected", // TODO: проверить RPC
        server: "running"
      }
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}