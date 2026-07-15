import { useState, useEffect, useRef } from 'react'
import { Zap, Shield, Settings, Play, Square, Crosshair, Activity, Server, Clock, Layers, Cpu, X, Save, Terminal, RotateCcw } from 'lucide-react'
import { MMBClient, StatsMessage } from './lib/mmb-client'

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
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [proxies, setProxies] = useState('')
  const [uas, setUas] = useState('')
  const [attackLogs, setAttackLogs] = useState<string[]>([])
  const [settingsSaved, setSettingsSaved] = useState(false)

  const clientRef = useRef<MMBClient | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const client = new MMBClient()
    clientRef.current = client

    client.onConnect(() => setConnected(true))
    client.onDisconnect(() => setConnected(false))
    client.onStats((data) => {
      setStats(data)
      if (data.log && !data.log.includes('Connected')) {
        setAttackLogs(prev => [...prev.slice(-100), data.log])
      }
    })
    client.onAttackEnd(() => {
      setIsAttacking(false)
      setAttackLogs(prev => [...prev, 'Attack completed.'])
    })

    return () => client.disconnect()
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [attackLogs])

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
      const resp = await fetch('/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: btoa(proxies), uas: btoa(uas) }),
      })
      if (resp.ok) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to save config:', err)
    }
  }

  const openSettings = async () => {
    await loadConfiguration()
    setSettingsSaved(false)
    setShowSettings(true)
  }

  const startAttack = () => {
    if (!target || !clientRef.current) return
    setAttackLogs(['Initializing attack...'])
    clientRef.current.startAttack({ target, attackMethod, packetSize, duration, packetDelay, threads })
    setIsAttacking(true)
  }

  const stopAttack = () => {
    if (!clientRef.current) return
    clientRef.current.stopAttack()
    setIsAttacking(false)
    setAttackLogs(prev => [...prev, 'Attack aborted by user.'])
  }

  const resetStats = () => {
    setStats({ pps: 0, totalPackets: 0, proxies: 0, log: '', timestamp: 0 })
    setAttackLogs([])
  }

  const selectedMethod = ATTACK_METHODS.find(m => m.value === attackMethod)!

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, ${selectedMethod.color}, transparent)`, transition: 'background 1s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-[0.03]"
          style={{ background: `radial-gradient(circle, #8b5cf6, transparent)` }} />
      </div>

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Attack particles */}
      {isAttacking && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${5 + Math.random() * 90}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              background: `linear-gradient(to top, transparent, ${selectedMethod.color})`,
            }} />
          ))}
        </div>
      )}

      {/* Main layout */}
      <div className={`relative z-10 min-h-screen flex flex-col ${isAttacking ? 'animate-shake' : ''}`}>

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-black/70" style={{ backdropFilter: 'blur(16px)' }}>
          <div className="flex items-center gap-3">
            <img src="/gun.png" alt="" className="w-6 h-6 object-contain" style={{ filter: 'brightness(1.5)' }} />
            <span className="text-xs font-mono font-bold text-green-400/80 tracking-[0.15em]">GALATICBLAST</span>
            <span className="text-[9px] font-mono text-gray-600 border border-white/10 px-1.5 py-0.5 rounded">v1.0</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/[0.06]">
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
              <span className={`text-[10px] font-mono ${connected ? 'text-green-400/80' : 'text-red-500/80'}`}>
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <button onClick={openSettings}
              className="p-2 rounded border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03] transition-all duration-200 active:scale-95"
              title="Settings">
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-2xl space-y-4">

            {/* Hero image + title */}
            <div className="relative flex flex-col items-center mb-2">
              <div className="relative mb-3">
                <img src="/gun.png" alt="GalaticBlast" className="w-32 h-32 object-contain relative z-10"
                  style={{
                    filter: `drop-shadow(0 0 40px ${selectedMethod.color}30) drop-shadow(0 0 80px ${selectedMethod.color}15)`,
                    transition: 'filter 0.5s ease',
                  }} />
                {isAttacking && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="w-40 h-40 rounded-full border opacity-20 animate-ping"
                      style={{ borderColor: selectedMethod.color }} />
                  </div>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em] bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                GALATICBLAST
              </h1>
              <p className="text-[10px] font-mono text-gray-600 tracking-[0.3em] mt-1">NETWORK STRESS TESTING TOOL</p>
            </div>

            {/* Target input */}
            <div className="relative group">
              <div className="flex items-stretch bg-[#08080f] rounded-lg border border-white/[0.08] overflow-hidden transition-all duration-200 focus-within:border-green-400/30">
                <div className="flex items-center px-3 border-r border-white/[0.06] bg-white/[0.02]">
                  <Crosshair className="w-4 h-4 text-green-400/60" />
                </div>
                <input type="text" value={target} onChange={(e) => setTarget(e.target.value)}
                  placeholder="http://target.com or ip:port"
                  className="flex-1 px-3 py-3 bg-transparent text-green-400 font-mono text-sm placeholder-gray-700 focus:outline-none" />
                <div className="flex items-center px-3 border-l border-white/[0.06] bg-white/[0.02]">
                  <span className="text-[9px] font-mono text-gray-700">{attackMethod.startsWith('http') ? 'L7' : 'L4'}</span>
                </div>
              </div>
            </div>

            {/* Attack method buttons */}
            <div className="grid grid-cols-5 gap-1.5">
              {ATTACK_METHODS.map((method) => {
                const Icon = method.icon
                const isActive = attackMethod === method.value
                return (
                  <button key={method.value} onClick={() => setAttackMethod(method.value)}
                    className="relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-lg border transition-all duration-200 active:scale-95"
                    style={{
                      background: isActive ? `${method.color}15` : 'rgba(8,8,15,0.8)',
                      borderColor: isActive ? `${method.color}40` : 'rgba(255,255,255,0.06)',
                      boxShadow: isActive ? `0 0 20px ${method.color}10, inset 0 0 20px ${method.color}05` : 'none',
                    }}>
                    <Icon className="w-4 h-4" style={{ color: isActive ? method.color : '#4a4a5a' }} />
                    <span className="text-[9px] font-mono font-bold tracking-wider"
                      style={{ color: isActive ? method.color : '#6a6a7a' }}>
                      {method.label}
                    </span>
                    {isActive && (
                      <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                        style={{ background: method.color, boxShadow: `0 0 8px ${method.color}60` }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'SIZE', value: packetSize, set: setPacketSize, icon: Layers, unit: 'B' },
                { label: 'DURATION', value: duration, set: setDuration, icon: Clock, unit: 's' },
                { label: 'DELAY', value: packetDelay, set: setPacketDelay, icon: Activity, unit: 'ms' },
                { label: 'THREADS', value: threads, set: setThreads, icon: Cpu, unit: '' },
              ].map(({ label, value, set, icon: Icon, unit }) => (
                <div key={label} className="bg-[#08080f] rounded-lg border border-white/[0.06] p-2.5 group focus-within:border-white/20 transition-all">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Icon className="w-3 h-3 text-gray-700" />
                    <span className="text-[8px] font-mono text-gray-700 tracking-wider">{label}</span>
                  </div>
                  <div className="flex items-baseline">
                    <input type="number" value={value} onChange={(e) => set(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-mono font-bold text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    {unit && <span className="text-[9px] font-mono text-gray-600 ml-0.5">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Action button */}
            <button onClick={isAttacking ? stopAttack : startAttack}
              disabled={!isAttacking && (!target || !connected)}
              className="w-full relative overflow-hidden rounded-lg py-3.5 font-mono font-bold text-xs tracking-[0.25em] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.99] border"
              style={isAttacking ? {
                background: `${selectedMethod.color}15`,
                borderColor: `${selectedMethod.color}50`,
                color: selectedMethod.color,
                boxShadow: `0 0 40px ${selectedMethod.color}15`,
              } : {
                background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(6,182,212,0.08))',
                borderColor: 'rgba(34,197,94,0.25)',
                color: '#4ade80',
              }}>
              <div className="flex items-center justify-center gap-2.5">
                {isAttacking ? (
                  <>
                    <Square className="w-4 h-4" fill="currentColor" />
                    <span>ABORT</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    <span>EXECUTE</span>
                  </>
                )}
              </div>
              {isAttacking && <div className="absolute inset-0 bg-white/[0.03] animate-pulse pointer-events-none" />}
            </button>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'PPS', value: stats.pps.toLocaleString(), color: '#06b6d4', bar: Math.min((stats.pps / 5000) * 100, 100) },
                { label: 'TOTAL', value: stats.totalPackets.toLocaleString(), color: '#a855f7', bar: null },
                { label: 'PROXIES', value: stats.proxies.toString(), color: '#ec4899', bar: null },
              ].map(({ label, value, color, bar }) => (
                <div key={label} className="bg-[#08080f] rounded-lg border border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono text-gray-700 tracking-wider">{label}</span>
                    <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
                  </div>
                  {bar !== null && (
                    <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${bar}%`, background: color, opacity: 0.6 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Terminal log */}
            <div className="bg-[#06060c] rounded-lg border border-white/[0.06] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/40" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                    <div className="w-2 h-2 rounded-full bg-green-500/40" />
                  </div>
                  <span className="text-[9px] font-mono text-gray-600">galaticblast@terminal</span>
                </div>
                <div className="flex items-center gap-1">
                  {isAttacking && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  <button onClick={resetStats} className="p-1 hover:bg-white/5 rounded transition-all" title="Clear logs">
                    <RotateCcw className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              </div>
              <div className="p-3 h-32 overflow-y-auto font-mono text-[11px] leading-relaxed">
                {attackLogs.length === 0 ? (
                  <div className="text-green-400/20">
                    <span className="text-green-400/30">$</span> awaiting commands...
                  </div>
                ) : (
                  <>
                    {attackLogs.map((log, i) => (
                      <div key={i} className="text-green-400/60">
                        <span className="text-green-400/25 mr-1">$</span>
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-2 border-t border-white/[0.04] text-center">
          <span className="text-[9px] font-mono text-gray-700">GALATICBLAST v1.0.0 // Educational Network Stress Testing</span>
        </footer>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          style={{ backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}>
          <div className="bg-[#0a0a10] rounded-xl border border-white/[0.08] w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400/70" />
                <h2 className="text-xs font-mono font-bold text-green-400/80 tracking-[0.15em]">CONFIGURATION</h2>
              </div>
              <button onClick={() => setShowSettings(false)}
                className="p-1.5 rounded hover:bg-white/5 transition-all active:scale-90">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-mono text-gray-600 tracking-[0.2em]">PROXIES</label>
                  <span className="text-[9px] font-mono text-gray-700">{proxies.split('\n').filter(l => l.trim() && !l.startsWith('#')).length} loaded</span>
                </div>
                <textarea value={proxies} onChange={(e) => setProxies(e.target.value)} rows={5}
                  className="w-full px-3 py-2.5 bg-[#06060c] border border-white/[0.06] rounded-lg text-green-400/70 font-mono text-[11px] focus:outline-none focus:border-green-400/20 resize-none placeholder-gray-800 transition-all"
                  placeholder={"http://proxy1:8080\nsocks5://proxy2:1080\n# one proxy per line"} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-mono text-gray-600 tracking-[0.2em]">USER AGENTS</label>
                  <span className="text-[9px] font-mono text-gray-700">{uas.split('\n').filter(l => l.trim() && !l.startsWith('#')).length} loaded</span>
                </div>
                <textarea value={uas} onChange={(e) => setUas(e.target.value)} rows={5}
                  className="w-full px-3 py-2.5 bg-[#06060c] border border-white/[0.06] rounded-lg text-green-400/70 font-mono text-[11px] focus:outline-none focus:border-green-400/20 resize-none placeholder-gray-800 transition-all"
                  placeholder={"Mozilla/5.0 (Windows NT 10.0; Win64; x64)...\n# one user agent per line"} />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button onClick={saveConfiguration}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono font-bold text-[11px] tracking-wider transition-all duration-200 active:scale-[0.98] border"
                style={settingsSaved ? {
                  background: 'rgba(34,197,94,0.15)',
                  borderColor: 'rgba(34,197,94,0.4)',
                  color: '#4ade80',
                } : {
                  background: 'rgba(34,197,94,0.08)',
                  borderColor: 'rgba(34,197,94,0.2)',
                  color: '#4ade80',
                }}>
                <Save className="w-3.5 h-3.5" />
                {settingsSaved ? 'SAVED!' : 'SAVE'}
              </button>
              <button onClick={() => setShowSettings(false)}
                className="px-4 py-2.5 rounded-lg border border-white/[0.08] text-gray-500 font-mono text-[11px] hover:bg-white/[0.03] transition-all active:scale-[0.98]">
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
