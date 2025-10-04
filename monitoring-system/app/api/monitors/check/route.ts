import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MonitorChecker } from '@/lib/monitoring/monitor-checker'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the monitor ID from the request
    const { monitorId } = await request.json()

    if (!monitorId) {
      return NextResponse.json({ error: 'Monitor ID is required' }, { status: 400 })
    }

    // Fetch the monitor details
    const { data: monitor, error: monitorError } = await supabase
      .from('monitors')
      .select('*')
      .eq('id', monitorId)
      .single()

    if (monitorError || !monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // Perform the check based on monitor type
    let checkResult
    switch (monitor.type) {
      case 'database':
        checkResult = await MonitorChecker.checkDatabaseConnection(monitor)
        break
      case 'redis':
        checkResult = await MonitorChecker.checkRedisConnection(monitor)
        break
      case 'webhook':
        checkResult = await MonitorChecker.checkWebhook(monitor)
        break
      default:
        checkResult = await MonitorChecker.checkMonitor(monitor)
    }

    // Store the check result
    const { error: insertError } = await supabase.from('monitor_checks').insert([checkResult])

    if (insertError) {
      console.error('Error storing check result:', insertError)
      return NextResponse.json({ error: 'Failed to store check result' }, { status: 500 })
    }

    // Check if we need to create or update an incident
    if (checkResult.status === 'down') {
      await handleDownStatus(supabase, monitor, checkResult)
    } else {
      await handleUpStatus(supabase, monitor)
    }

    return NextResponse.json({
      success: true,
      result: checkResult,
    })
  } catch (error: any) {
    console.error('Monitor check error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

async function handleDownStatus(supabase: any, monitor: any, checkResult: any) {
  // Check if there's already an open incident
  const { data: existingIncident } = await supabase
    .from('incidents')
    .select('*')
    .eq('monitor_id', monitor.id)
    .eq('status', 'open')
    .single()

  if (!existingIncident) {
    // Create a new incident
    const { data: newIncident, error: incidentError } = await supabase
      .from('incidents')
      .insert([
        {
          monitor_id: monitor.id,
          title: `${monitor.name} is down`,
          description: checkResult.error_message || 'Monitor check failed',
          status: 'open',
          severity: 'high',
          started_at: checkResult.checked_at,
        },
      ])
      .select()
      .single()

    if (!incidentError && newIncident) {
      try {
        await fetch(
          `${
            process.env.NEXT_PUBLIC_APP_URL || 'https://monitor-hub-kappa.vercel.app'
          }/api/alerts/trigger`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              monitorId: monitor.id,
              incidentId: newIncident.id,
              condition: 'down',
              message: checkResult.error_message || 'Monitor check failed',
            }),
          }
        )
      } catch (alertError) {
        console.error('Error triggering alerts:', alertError)
      }
    }
  }
}

async function handleUpStatus(supabase: any, monitor: any) {
  // Check if there's an open incident to resolve
  const { data: openIncident } = await supabase
    .from('incidents')
    .select('*')
    .eq('monitor_id', monitor.id)
    .eq('status', 'open')
    .single()

  if (openIncident) {
    // Resolve the incident
    await supabase
      .from('incidents')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', openIncident.id)
  }
}
