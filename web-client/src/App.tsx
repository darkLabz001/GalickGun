import { useState, useEffect, useRef } from 'react'
import { Zap, Shield, Settings, Play, Square, Crosshair, Activity, Server, Clock, Layers, Cpu, X, Save, ArrowRight, Terminal, Wifi, WifiOff } from 'lucide-react'
import { MMBClient, StatsMessage } from './lib/mmb-client'

type AnimState = 0 | 1 | 2 | 3

const ATTACK_METHODS = [
  { value: 'http_flood', label: 'HTTP FLOOD', icon: Zap, color: '#ef4444' },
  { value: 'http_bypass', label: 'HTTP BYPASS', icon: Shield, color: '#a855f7' },
  { value: 'http_slowloris', label: 'SLOWLORIS', icon: Activity, color: '#06b6d4' },
  { value: 'tcp_flood', label: 'TCP FLOOD', icon: Server, color: '#22c55e' },
  { value: 'minecraft_ping', label: 'MC PING', icon: Cpu, color: '#eab308' },
]

function App() {
  const [target, setTarget] = useState('')
  const [attackMethod, setAttackMethod] = useState('http_flood')
  const [packetSize, setPacketSize] = useState(64)
  const [duration, setDuration] = useState(30)
  const [packetDelay, setPacketDelay] = useState(100)
  const [threads, setThreads] = useState(4)
  const [isAttacking, setIsAttacking] = useState(false)
  const [stats, setStats] = useState<StatsMessage>({ pps: 0, totalPackets: 0, proxies: 0, log: '', timestamp: 0 })
  const [animState, setAnimState] = useState<AnimState>(0)
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [proxies, setProxies] = useState('')
  const [uas, setUas] = useState('')
  const [attackLogs, setAttackLogs] = useState<string[]>([])

  const clientRef = useRef<MMBClient | null>(null)

  useEffect(() => {
    const client = new MMBClient()
    clientRef.current = client
    client.onConnect(() => setConnected(true))
    client.onDisconnect(() => setConnected(false))
    client.onStats((data) => {
      setStats(data)
      if (data.log && !data.log.includes('Connected')) {
        setAttackLogs(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${data.log}`])
      }
    })
    client.onAttackEnd(() => { setIsAttacking(false); setAnimState(0) })
    return () => client.disconnect()
  }, [])

  const loadConfiguration = async () => {
    try {
      const resp = await fetch('/configuration')
      const data = await resp.json()
      setProxies(atob(data.proxies || ''))
      setUas(atob(data.uas || ''))
    } catch (err) { console.error(err) }
  }

  const saveConfiguration = async () => {
    try {
      await fetch('/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: btoa(proxies), uas: btoa(uas) }),
      })
      setShowSettings(false)
    } catch (err) { console.error(err) }
  }

  const startAttack = () => {
    if (!target || !clientRef.current) return
    setAttackLogs([])
    setAnimState(1)
    setTimeout(() => setAnimState(2), 1500)
    setTimeout(() => {
      clientRef.current?.startAttack({ target, attackMethod, packetSize, duration, packetDelay, threads })
      setIsAttacking(true)
      setAnimState(3)
    }, 3000)
  }

  const stopAttack = () => {
    clientRef.current?.stopAttack()
    setIsAttacking(false)
    setAnimState(0)
  }

  const selectedMethod = ATTACK_METHODS.find(m => m.value === attackMethod)!

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated scanline overlay */}
      <div className="scanlines" />

      {/* Floating particles */}
      {isAttacking && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              background: selectedMethod.color,
            }} />
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className={`relative z-10 min-h-screen flex flex-col ${animState === 3 ? 'animate-shake' : ''}`}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/60" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono text-green-400 tracking-wider">GALATICBLAST v1.0.0</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connected ? <Wifi className="w-3.5 h-3.5 text-green-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
              <span className={`text-xs font-mono ${connected ? 'text-green-400' : 'text-red-500'}`}>
                {connected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <button
              onClick={() => { loadConfiguration(); setShowSettings(true) }}
              className="p-1.5 rounded border border-white/10 hover:border-green-400/30 hover:bg-white/5 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Hero section with gun image and controls overlaid */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8">

          {/* Gun image as background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <img
              src="/gun.png"
              alt=""
              className="max-h-[70vh] max-w-[80vw] object-contain opacity-20"
              style={{
                filter: `drop-shadow(0 0 80px ${selectedMethod.color}40) drop-shadow(0 0 160px ${selectedMethod.color}20)`,
                transition: 'filter 0.5s ease',
              }}
            />
          </div>

          {/* Glow ring behind controls when attacking */}
          {isAttacking && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${selectedMethod.color}15 0%, transparent 70%)`,
                animation: 'glowRing 2s ease-in-out infinite',
              }}
            />
          )}

          {/* Controls panel overlaid on image */}
          <div className="relative z-20 w-full max-w-2xl">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent"
                  style={{ textShadow: '0 0 40px rgba(34,197,94,0.3)' }}>
                  GALATICBLAST
                </span>
              </h1>
              <div className="mt-1 h-[1px] bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />
            </div>

            {/* Target input */}
            <div className="mb-4 relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-green-400/20 via-cyan-400/20 to-purple-500/20 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center bg-black/80 rounded-xl border border-white/10 overflow-hidden" style={{ backdropFilter: 'blur(12px)' }}>
                <div className="px-4 py-4 border-r border-white/5">
                  <Crosshair className="w-5 h-5 text-green-400" />
                </div>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="target > http://example.com"
                  className="flex-1 px-4 py-4 bg-transparent text-green-400 font-mono placeholder-green-400/30 focus:outline-none text-sm"
                />
                <div className="px-3">
                  <span className="text-[10px] font-mono text-gray-600">L7</span>
                </div>
              </div>
            </div>

            {/* Attack method selector */}
            <div className="mb-4 flex gap-1.5 p-1 bg-black/80 rounded-xl border border-white/10" style={{ backdropFilter: 'blur(12px)' }}>
              {ATTACK_METHODS.map((method) => {
                const Icon = method.icon
                const isActive = attackMethod === method.value
                return (
                  <button
                    key={method.value}
                    onClick={() => setAttackMethod(method.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg transition-all duration-200 text-[11px] font-mono font-bold tracking-wider
                      ${isActive
                        ? 'text-black'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                    style={isActive ? {
                      background: method.color,
                      boxShadow: `0 0 20px ${method.color}40`,
                    } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{method.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Parameters row */}
            <div className="mb-4 grid grid-cols-4 gap-2">
              {[
                { label: 'SIZE', value: packetSize, set: setPacketSize, icon: Layers },
                { label: 'DUR', value: duration, set: setDuration, icon: Clock },
                { label: 'DELAY', value: packetDelay, set: setPacketDelay, icon: Activity },
                { label: 'THREADS', value: threads, set: setThreads, icon: Cpu },
              ].map(({ label, value, set, icon: Icon }) => (
                <div key={label} className="bg-black/80 rounded-lg border border-white/10 p-2.5" style={{ backdropFilter: 'blur(12px)' }}>
                  <div className="flex items-center gap-1 mb-1">
                    <Icon className="w-3 h-3 text-gray-600" />
                    <span className="text-[9px] font-mono text-gray-600 tracking-wider">{label}</span>
                  </div>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => set(Number(e.target.value))}
                    className="w-full bg-transparent text-white font-mono font-bold text-lg focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))}
            </div>

            {/* Launch button */}
            <button
              onClick={isAttacking ? stopAttack : startAttack}
              disabled={!isAttacking && (!target || !connected)}
              className="w-full relative overflow-hidden rounded-xl py-4 font-mono font-bold text-sm tracking-[0.2em] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed border"
              style={isAttacking ? {
                background: `linear-gradient(135deg, ${selectedMethod.color}20, ${selectedMethod.color}40)`,
                borderColor: selectedMethod.color,
                color: selectedMethod.color,
                boxShadow: `0 0 30px ${selectedMethod.color}30, inset 0 0 30px ${selectedMethod.color}10`,
              } : {
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(6,182,212,0.1))',
                borderColor: 'rgba(34,197,94,0.3)',
                color: '#4ade80',
                boxShadow: '0 0 30px rgba(34,197,94,0.1)',
              }}
            >
              <div className="flex items-center justify-center gap-3">
                {isAttacking ? (
                  <>
                    <Square className="w-4 h-4" fill="currentColor" />
                    <span>[ ABORT ]</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    <span>[ EXECUTE ]</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </div>
              {isAttacking && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />}
            </button>

            {/* Stats bar */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'PPS', value: stats.pps.toLocaleString(), color: '#06b6d4' },
                { label: 'TOTAL', value: stats.totalPackets.toLocaleString(), color: '#a855f7' },
                { label: 'PROXIES', value: stats.proxies.toString(), color: '#ec4899' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-black/80 rounded-lg border border-white/10 px-3 py-2.5 flex items-center justify-between" style={{ backdropFilter: 'blur(12px)' }}>
                  <span className="text-[9px] font-mono text-gray-600 tracking-wider">{label}</span>
                  <span className="text-sm font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Log terminal */}
            <div className="mt-4 bg-black/90 rounded-xl border border-white/10 overflow-hidden" style={{ backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <span className="text-[9px] font-mono text-gray-600">galaticblast@terminal</span>
              </div>
              <div className="p-3 h-28 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {attackLogs.length === 0 ? (
                  <div className="text-green-400/30">
                    <span className="text-green-400/50">$</span> waiting for commands...
                  </div>
                ) : (
                  attackLogs.map((log, i) => (
                    <div key={i} className="text-green-400/70">
                      <span className="text-green-400/40">$</span> {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(8px)' }}>
          <div className="bg-[#0a0a0a] rounded-xl border border-green-400/20 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <h2 className="text-sm font-mono font-bold text-green-400 tracking-wider">CONFIGURATION</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-wider">PROXIES</label>
                <textarea
                  value={proxies}
                  onChange={(e) => setProxies(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-green-400 font-mono text-xs focus:outline-none focus:border-green-400/30 resize-none"
                  placeholder={"http://proxy1:8080\nsocks5://proxy2:1080"}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 mb-2 tracking-wider">USER AGENTS</label>
                <textarea
                  value={uas}
                  onChange={(e) => setUas(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-green-400 font-mono text-xs focus:outline-none focus:border-green-400/30 resize-none"
                  placeholder="Mozilla/5.0 ..."
                />
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={saveConfiguration}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-400/10 border border-green-400/30 text-green-400 font-mono font-bold text-xs tracking-wider rounded-lg hover:bg-green-400/20 transition-all">
                <Save className="w-3.5 h-3.5" />
                SAVE
              </button>
              <button onClick={() => setShowSettings(false)}
                className="px-4 py-3 bg-white/5 border border-white/10 text-gray-400 font-mono text-xs rounded-lg hover:bg-white/10 transition-all">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
