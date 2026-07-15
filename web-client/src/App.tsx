import { useState, useEffect, useRef } from 'react'
import { Zap, Shield, Settings, Play, Square, Crosshair, Activity, Server, Clock, Layers, Cpu, X, Save, ArrowRight } from 'lucide-react'
import { MMBClient, StatsMessage } from './lib/mmb-client'

type AnimState = 0 | 1 | 2 | 3

const ATTACK_METHODS = [
  { value: 'http_flood', label: 'HTTP Flood', desc: 'Rapid HTTP requests', color: 'from-red-500 to-orange-500', icon: Zap },
  { value: 'http_bypass', label: 'HTTP Bypass', desc: 'Browser-mimicking traffic', color: 'from-purple-500 to-pink-500', icon: Shield },
  { value: 'http_slowloris', label: 'Slowloris', desc: 'Slow persistent connections', color: 'from-blue-500 to-cyan-500', icon: Activity },
  { value: 'tcp_flood', label: 'TCP Flood', desc: 'Raw TCP packet burst', color: 'from-green-500 to-emerald-500', icon: Server },
  { value: 'minecraft_ping', label: 'MC Ping', desc: 'Minecraft protocol flood', color: 'from-yellow-500 to-amber-500', icon: Cpu },
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
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    client.onAttackEnd(() => {
      setIsAttacking(false)
      setAnimState(0)
    })

    return () => client.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number }[] = []
    const colors = ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']

    const createParticle = () => {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 3 - 1,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
      })
    }

    let animFrame: number
    const animate = () => {
      ctx.fillStyle = 'rgba(5, 5, 15, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (isAttacking) {
        for (let i = 0; i < 3; i++) createParticle()
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.alpha -= 0.005

        if (p.alpha <= 0 || p.y < -10) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1
      }

      animFrame = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animFrame)
  }, [isAttacking])

  const loadConfiguration = async () => {
    try {
      const resp = await fetch('/configuration')
      const data = await resp.json()
      setProxies(atob(data.proxies || ''))
      setUas(atob(data.uas || ''))
    } catch (err) {
      console.error('Failed to load config:', err)
    }
  }

  const saveConfiguration = async () => {
    try {
      await fetch('/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: btoa(proxies), uas: btoa(uas) }),
      })
      setShowSettings(false)
    } catch (err) {
      console.error('Failed to save config:', err)
    }
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

  const getBgGradient = () => {
    switch (animState) {
      case 0: return 'radial-gradient(ellipse at 50% 0%, rgba(88,28,135,0.15) 0%, transparent 50%)'
      case 1: return 'radial-gradient(ellipse at 50% 0%, rgba(30,64,175,0.25) 0%, transparent 50%)'
      case 2: return 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.3) 0%, transparent 50%)'
      case 3: return 'radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.35) 0%, transparent 50%)'
      default: return 'radial-gradient(ellipse at 50% 0%, rgba(88,28,135,0.15) 0%, transparent 50%)'
    }
  }

  return (
    <div className="min-h-screen bg-[#050510] text-white overflow-hidden relative">
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: getBgGradient(), transition: 'background 1s ease' }} />

      <div className={`relative z-10 min-h-screen ${animState === 3 ? 'animate-shake' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <header className="text-center mb-8 relative">
            <div className="inline-block mb-4">
              <div className={`relative ${isAttacking ? 'animate-pulse' : ''}`}>
                <img
                  src="/gun.png"
                  alt="GalaticBlast"
                  className="w-28 h-28 mx-auto object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                />
                {isAttacking && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-2 border-galactic-cyan animate-ping opacity-30" />
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-5xl font-black tracking-tight mb-1">
              <span className="bg-gradient-to-r from-galactic-cyan via-galactic-purple to-galactic-pink bg-clip-text text-transparent">
                GALATICBLAST
              </span>
            </h1>
            <p className="text-gray-500 text-sm tracking-widest uppercase">Network Stress Testing Tool</p>

            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'} ${connected ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-medium ${connected ? 'text-green-400' : 'text-red-400'}`}>
                  {connected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Crosshair className="w-3 h-3 text-galactic-purple" />
                <span className="text-xs text-gray-500">v1.0.0</span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column - Config */}
            <div className="lg:col-span-2 space-y-5">
              {/* Target Input */}
              <div className="bg-[#0a0a1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl">
                <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-wider uppercase">Target</label>
                <div className="relative">
                  <Crosshair className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-galactic-purple" />
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="http://example.com or 192.168.1.1:8080"
                    className="w-full pl-12 pr-4 py-4 bg-[#0f0f2a] border border-white/5 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-galactic-purple/50 focus:border-galactic-purple/30 transition-all text-lg"
                  />
                </div>
              </div>

              {/* Attack Methods */}
              <div className="bg-[#0a0a1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl">
                <label className="block text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">Attack Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ATTACK_METHODS.map((method) => {
                    const Icon = method.icon
                    const isSelected = attackMethod === method.value
                    return (
                      <button
                        key={method.value}
                        onClick={() => setAttackMethod(method.value)}
                        className={`relative p-3 rounded-xl border transition-all duration-300 text-left group
                          ${isSelected
                            ? 'bg-gradient-to-br ' + method.color + ' border-transparent shadow-lg scale-[1.02]'
                            : 'bg-[#0f0f2a] border-white/5 hover:border-white/10 hover:bg-[#141430]'
                          }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>{method.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-600'}`}>{method.desc}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full shadow-lg" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Parameters */}
              <div className="bg-[#0a0a1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl">
                <label className="block text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">Parameters</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Packet Size', value: packetSize, set: setPacketSize, icon: Layers, suffix: 'B' },
                    { label: 'Duration', value: duration, set: setDuration, icon: Clock, suffix: 's' },
                    { label: 'Delay', value: packetDelay, set: setPacketDelay, icon: Activity, suffix: 'ms' },
                    { label: 'Threads', value: threads, set: setThreads, icon: Cpu, suffix: '' },
                  ].map(({ label, value, set, icon: Icon, suffix }) => (
                    <div key={label} className="bg-[#0f0f2a] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Icon className="w-3.5 h-3.5 text-galactic-purple" />
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => set(Number(e.target.value))}
                          className="w-full bg-transparent text-xl font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {suffix && <span className="text-xs text-gray-600">{suffix}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Button */}
              <button
                onClick={isAttacking ? stopAttack : startAttack}
                disabled={!isAttacking && (!target || !connected)}
                className={`w-full relative overflow-hidden rounded-2xl py-5 font-bold text-lg tracking-wide transition-all duration-500 disabled:opacity-30 disabled:cursor-not-allowed
                  ${isAttacking
                    ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:via-red-600 hover:to-red-700'
                    : 'bg-gradient-to-r from-galactic-cyan via-galactic-purple to-galactic-pink hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:scale-[1.01]'
                  }`}
              >
                <div className="flex items-center justify-center gap-3">
                  {isAttacking ? (
                    <>
                      <Square className="w-6 h-6" />
                      <span>STOP ATTACK</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6" fill="currentColor" />
                      <span>LAUNCH GALATICBLAST</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </div>
                {isAttacking && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse" />
                )}
              </button>
            </div>

            {/* Right Column - Stats */}
            <div className="space-y-5">
              {/* Live Stats */}
              <div className="bg-[#0a0a1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Live Statistics</h2>
                  <div className={`w-2 h-2 rounded-full ${isAttacking ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                </div>

                <div className="space-y-3">
                  <div className="bg-[#0f0f2a] rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Packets / sec</div>
                    <div className="text-3xl font-black text-galactic-cyan tabular-nums">{stats.pps.toLocaleString()}</div>
                    <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-galactic-cyan to-galactic-purple rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((stats.pps / 10000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#0f0f2a] rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Total Packets</div>
                    <div className="text-3xl font-black text-galactic-purple tabular-nums">{stats.totalPackets.toLocaleString()}</div>
                  </div>

                  <div className="bg-[#0f0f2a] rounded-xl p-4 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Active Proxies</div>
                    <div className="text-3xl font-black text-galactic-pink tabular-nums">{stats.proxies}</div>
                  </div>
                </div>
              </div>

              {/* Attack Log */}
              <div className="bg-[#0a0a1a]/80 backdrop-blur-xl rounded-2xl p-5 border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Attack Log</h2>
                  <button
                    onClick={() => {
                      loadConfiguration()
                      setShowSettings(true)
                    }}
                    className="p-2 bg-[#0f0f2a] rounded-lg border border-white/5 hover:border-galactic-purple/30 transition-all"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="bg-[#080818] rounded-xl p-3 h-48 overflow-y-auto font-mono text-xs border border-white/5">
                  {attackLogs.length === 0 ? (
                    <div className="text-gray-600 text-center mt-16">No activity yet</div>
                  ) : (
                    attackLogs.map((log, i) => (
                      <div key={i} className="text-galactic-cyan/80 py-0.5 leading-relaxed">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a1a] rounded-2xl p-6 border border-white/10 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white">Configuration</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-lg transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-wider uppercase">Proxies</label>
                <textarea
                  value={proxies}
                  onChange={(e) => setProxies(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0f0f2a] border border-white/5 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-galactic-purple/50 resize-none"
                  placeholder="http://proxy1:8080&#10;socks5://proxy2:1080"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-wider uppercase">User Agents</label>
                <textarea
                  value={uas}
                  onChange={(e) => setUas(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 bg-[#0f0f2a] border border-white/5 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-galactic-purple/50 resize-none"
                  placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={saveConfiguration}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-galactic-cyan to-galactic-purple text-white font-bold rounded-xl hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                Save Configuration
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-3 bg-[#0f0f2a] border border-white/5 text-gray-400 rounded-xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
