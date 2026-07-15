import { io, Socket } from 'socket.io-client'

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

export class MMBClient {
  private socket: Socket

  constructor() {
    const url = window.location.protocol + '//' + window.location.hostname + ':3000'
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })
  }

  onConnect(callback: () => void) {
    this.socket.on('connect', callback)
  }

  onDisconnect(callback: () => void) {
    this.socket.on('disconnect', callback)
  }

  onStats(callback: (data: StatsMessage) => void) {
    this.socket.on('stats', callback)
  }

  onAttackEnd(callback: () => void) {
    this.socket.on('attackEnd', callback)
  }

  startAttack(payload: StartAttackPayload) {
    this.socket.emit('startAttack', payload)
  }

  stopAttack() {
    this.socket.emit('stopAttack')
  }

  disconnect() {
    this.socket.disconnect()
  }
}
