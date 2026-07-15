import { io, Socket } from 'socket.io-client'

type StartAttackPayload = {
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
    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
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
