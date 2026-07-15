export type StartAttackPayload = {
  target: string
  attackMethod: string
  packetSize: number
  duration: number
  packetDelay: number
  threads?: number
}

export type StatsMessage = {
  pps: number
  proxies: number
  totalPackets: number
  log: string
  timestamp: number
}

export type AttackAcceptedMessage = {
  ok: boolean
  proxies: number
  message?: string
}

type ControlEvent =
  | { type: 'ready' }
  | { type: 'stats'; data: StatsMessage }
  | { type: 'attackEnd' }

function createClientID() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export class MMBClient {
  private readonly clientID = createClientID()
  private readonly events: EventSource
  private connectCallbacks: Array<() => void> = []
  private disconnectCallbacks: Array<() => void> = []
  private statsCallbacks: Array<(data: StatsMessage) => void> = []
  private attackEndCallbacks: Array<() => void> = []
  private attackAcceptedCallbacks: Array<(data: AttackAcceptedMessage) => void> = []

  constructor() {
    this.events = new EventSource(`/api/events?clientId=${encodeURIComponent(this.clientID)}`)
    this.events.onopen = () => this.connectCallbacks.forEach((callback) => callback())
    this.events.onerror = () => this.disconnectCallbacks.forEach((callback) => callback())
    this.events.onmessage = (message) => {
      const event = JSON.parse(message.data) as ControlEvent
      if (event.type === 'stats') this.statsCallbacks.forEach((callback) => callback(event.data))
      if (event.type === 'attackEnd') this.attackEndCallbacks.forEach((callback) => callback())
    }
  }

  onConnect(callback: () => void) {
    this.connectCallbacks.push(callback)
  }

  onDisconnect(callback: () => void) {
    this.disconnectCallbacks.push(callback)
  }

  onStats(callback: (data: StatsMessage) => void) {
    this.statsCallbacks.push(callback)
  }

  onAttackEnd(callback: () => void) {
    this.attackEndCallbacks.push(callback)
  }

  onAttackAccepted(callback: (data: AttackAcceptedMessage) => void) {
    this.attackAcceptedCallbacks.push(callback)
  }

  async startAttack(payload: StartAttackPayload) {
    try {
      const response = await fetch('/api/attacks/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, clientId: this.clientID }),
      })
      const result = await response.json() as AttackAcceptedMessage
      this.attackAcceptedCallbacks.forEach((callback) => callback(result))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'control request failed'
      this.attackAcceptedCallbacks.forEach((callback) => callback({ ok: false, proxies: 0, message }))
    }
  }

  async stopAttack() {
    try {
      await fetch('/api/attacks/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.clientID }),
      })
    } catch (error) {
      console.error('Failed to stop test:', error)
    }
  }

  disconnect() {
    this.events.close()
  }
}
