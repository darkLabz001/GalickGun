import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Activity,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  Cpu,
  Gauge,
  Layers3,
  Play,
  Radio,
  RotateCcw,
  Save,
  Server,
  Settings,
  Shield,
  Square,
  Terminal,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react'
import { MMBClient, StatsMessage } from './lib/mmb-client'

const ATTACK_METHODS = [
  { value: 'http_flood', label: 'HTTP Flood', short: 'L7', detail: 'Galick pressure wave', icon: Zap, color: '#b56cff' },
  { value: 'http_bypass', label: 'HTTP Bypass', short: 'L7', detail: 'Royal guard rotation', icon: Shield, color: '#7c5cff' },
  { value: 'http_slowloris', label: 'Slowloris', short: 'L7', detail: 'Sustained ki channel', icon: Activity, color: '#d946ef' },
  { value: 'tcp_flood', label: 'TCP Flood', short: 'L4', detail: 'Saiyan burst output', icon: Server, color: '#3b82f6' },
  { value: 'minecraft_ping', label: 'MC Ping', short: 'GAME', detail: 'Scouter handshake', icon: Cpu, color: '#f6c453' },
]

const initialStats: StatsMessage = { pps: 0, totalPackets: 0, proxies: 0, log: '', timestamp: 0 }

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function App() {
  const [target, setTarget] = useState('')
  const [attackMethod, setAttackMethod] = useState('http_flood')
  const [packetSize, setPacketSize] = useState(64)
  const [duration, setDuration] = useState(30)
  const [packetDelay, setPacketDelay] = useState(100)
  const [threads, setThreads] = useState(4)
  const [isAttacking, setIsAttacking] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [stats, setStats] = useState<StatsMessage>(initialStats)
  const [connected, setConnected] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [proxies, setProxies] = useState('')
  const [uas, setUas] = useState('')
  const [attackLogs, setAttackLogs] = useState<string[]>([])
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const clientRef = useRef<MMBClient | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const launchAudioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const client = new MMBClient()
    clientRef.current = client

    client.onConnect(() => setConnected(true))
    client.onDisconnect(() => setConnected(false))
    client.onStats((data) => {
      setStats(data)
      if (data.log && !data.log.includes('Connected')) {
        setAttackLogs((previous) => [...previous.slice(-99), data.log])
      }
    })
    client.onAttackEnd(() => {
      setIsAttacking(false)
      setIsLaunching(false)
      setAttackLogs((previous) => [...previous, 'Session completed.'])
    })
    client.onAttackAccepted((response) => {
      setIsLaunching(false)
      if (response.ok) {
        setIsAttacking(true)
        setAttackLogs((previous) => [...previous, `Core accepted session with ${response.proxies} compatible proxies.`])
        return
      }
      setIsAttacking(false)
      setAttackLogs((previous) => [...previous, `Session rejected: ${response.message || 'request was not accepted'}`])
    })

    return () => client.disconnect()
  }, [])

  useEffect(() => {
    if (!isAttacking) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isAttacking])

  useEffect(() => {
    if (!isLaunching) return
    const timeout = window.setTimeout(() => {
      setIsLaunching(false)
      setAttackLogs((previous) => [...previous, 'Galick core did not acknowledge the launch. Check the server connection and try again.'])
    }, 6000)
    return () => window.clearTimeout(timeout)
  }, [isLaunching])

  useEffect(() => {
    if (attackLogs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [attackLogs])

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/configuration')
      if (!response.ok) throw new Error(`Configuration request failed (${response.status})`)
      const data = await response.json()
      setProxies(atob(data.proxies || ''))
      setUas(atob(data.uas || ''))
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const saveConfiguration = async () => {
    try {
      const response = await fetch('/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: btoa(proxies), uas: btoa(uas) }),
      })
      if (!response.ok) throw new Error(`Configuration save failed (${response.status})`)
      setSettingsSaved(true)
      window.setTimeout(() => setSettingsSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save config:', error)
    }
  }

  const openSettings = async () => {
    await loadConfiguration()
    setSettingsSaved(false)
    setShowSettings(true)
  }

  const startAttack = () => {
    const normalizedTarget = target.trim()
    if (!normalizedTarget || !clientRef.current || !connected) return
    setTarget(normalizedTarget)
    setElapsed(0)
    setStats((previous) => ({ ...previous, pps: 0, totalPackets: 0, log: '' }))
    setAttackLogs([`Target acquired: ${normalizedTarget}`, `Charging ${selectedMethod.label} profile...`, 'Galick core initialized.'])
    if (soundEnabled && launchAudioRef.current) {
      launchAudioRef.current.currentTime = 0
      void launchAudioRef.current.play().catch(() => undefined)
    }
    clientRef.current.startAttack({ target: normalizedTarget, attackMethod, packetSize, duration, packetDelay, threads })
    setIsLaunching(true)
  }

  const stopAttack = () => {
    if (!clientRef.current) return
    clientRef.current.stopAttack()
    setIsAttacking(false)
    setIsLaunching(false)
    setAttackLogs((previous) => [...previous, 'Session aborted by operator.'])
  }

  const resetStats = () => {
    setStats(initialStats)
    setAttackLogs([])
    setElapsed(0)
  }

  const selectedMethod = ATTACK_METHODS.find((method) => method.value === attackMethod)!
  const progress = isAttacking ? Math.min((elapsed / Math.max(duration, 1)) * 100, 100) : 0
  const proxyCount = proxies.split('\n').filter((line) => line.trim() && !line.startsWith('#')).length
  const userAgentCount = uas.split('\n').filter((line) => line.trim() && !line.startsWith('#')).length
  const appStyle = { '--accent': selectedMethod.color } as CSSProperties

  return (
    <div className={`app-shell ${isLaunching ? 'is-charging' : ''} ${isAttacking ? 'is-firing' : ''}`} style={appStyle}>
      <div className="noise-layer" aria-hidden="true" />
      <audio ref={launchAudioRef} src="/galick-gun.mp3" preload="auto" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Zap size={17} /></div>
          <div>
            <strong>GALICK<span>GUN</span></strong>
            <small>SAIYAN LOAD CONSOLE</small>
          </div>
        </div>
        <div className="topbar-right">
          <div className={`connection-chip ${connected ? 'is-online' : 'is-offline'}`}>
            <i />
            <span>{connected ? 'CORE ONLINE' : 'CORE OFFLINE'}</span>
          </div>
          <span className="version-tag">BUILD 1.0.0</span>
          <button className="icon-button" onClick={() => setSoundEnabled((enabled) => !enabled)} title={`${soundEnabled ? 'Disable' : 'Enable'} Galick Gun launch sound`} aria-label={`${soundEnabled ? 'Disable' : 'Enable'} launch sound`}>
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="icon-button" onClick={openSettings} title="Open configuration" aria-label="Open configuration">
            <Settings size={17} />
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-panel">
          <img src="/gun.png" alt="Vegeta charging a violet Galick Gun beside a cosmic energy cannon" />
          <div className="hero-vignette" />
          <div className="hero-copy">
            <div className="eyebrow"><span /> AUTHORIZED SAIYAN TEST ENVIRONMENT</div>
            <h1>CHARGE THE<br /><em>GALICK GUN.</em></h1>
            <p>Prince-level load orchestration for infrastructure you own or have explicit permission to test.</p>
          </div>
          <div className="hero-readout">
            <span>GALICK CORE</span>
            <strong>{isLaunching ? 'SYNCING' : isAttacking ? 'ARMED' : 'STANDBY'}</strong>
            <div className="signal-bars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((bar) => <i key={bar} />)}
            </div>
          </div>
          <div className="hero-index">GG // ELITE</div>
        </section>

        <section className="method-strip" aria-label="Test method">
          {ATTACK_METHODS.map((method, index) => {
            const Icon = method.icon
            const active = attackMethod === method.value
            return (
              <button
                key={method.value}
                className={`method-card ${active ? 'is-active' : ''}`}
                onClick={() => !isAttacking && !isLaunching && setAttackMethod(method.value)}
                disabled={isAttacking || isLaunching}
                style={{ '--method-color': method.color } as CSSProperties}
              >
                <span className="method-number">0{index + 1}</span>
                <span className="method-icon"><Icon size={18} /></span>
                <span className="method-copy"><strong>{method.label}</strong><small>{method.detail}</small></span>
                <span className="method-layer">{method.short}</span>
              </button>
            )
          })}
        </section>

        <div className="workspace-grid">
          <section className="panel control-panel">
            <div className="panel-heading">
              <div><span className="section-index">01</span><h2>GALICK CONTROL</h2></div>
              <span className="panel-meta">PROFILE / {selectedMethod.label.toUpperCase()}</span>
            </div>

            <label className="field-label" htmlFor="target">TARGET ENDPOINT</label>
            <div className="target-field">
              <Crosshair size={18} />
              <input
                id="target"
                type="text"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') startAttack() }}
                placeholder="https://authorized-target.test or host:port"
                disabled={isAttacking || isLaunching}
                autoComplete="off"
              />
              <span>{selectedMethod.short}</span>
            </div>

            <div className="parameter-grid">
              {[
                { label: 'PACKET SIZE', value: packetSize, setValue: setPacketSize, icon: Layers3, unit: 'BYTES', min: 1 },
                { label: 'DURATION', value: duration, setValue: setDuration, icon: Clock3, unit: 'SECONDS', min: 1 },
                { label: 'PACKET DELAY', value: packetDelay, setValue: setPacketDelay, icon: Gauge, unit: 'MS', min: 1 },
                { label: 'WORKERS', value: threads, setValue: setThreads, icon: Cpu, unit: 'THREADS', min: 1 },
              ].map(({ label, value, setValue, icon: Icon, unit, min }) => (
                <label className="parameter-card" key={label}>
                  <span><Icon size={14} /> {label}</span>
                  <div><input type="number" min={min} value={value} onChange={(event) => setValue(Math.max(min, Number(event.target.value)))} disabled={isAttacking || isLaunching} /><small>{unit}</small></div>
                </label>
              ))}
            </div>

            <div className="authorization-note">
              <Shield size={15} />
              <span>Run tests only against systems you own or are explicitly authorized to assess.</span>
            </div>

            <button className={`launch-button ${isAttacking ? 'is-running' : ''}`} onClick={isAttacking ? stopAttack : startAttack} disabled={isLaunching || (!isAttacking && (!target.trim() || !connected))}>
              <span className="launch-icon">{isAttacking ? <Square size={16} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</span>
              <span><small>{isLaunching ? 'CHARGING KI' : isAttacking ? 'SESSION ACTIVE' : 'POWER LEVEL READY'}</small><strong>{isLaunching ? 'GALICK GUN...' : isAttacking ? 'ABORT TEST' : 'FIRE GALICK GUN'}</strong></span>
              <ChevronRight size={19} />
            </button>
          </section>

          <aside className="panel telemetry-panel">
            <div className="panel-heading">
              <div><span className="section-index">02</span><h2>LIVE TELEMETRY</h2></div>
              <span className={`live-indicator ${isAttacking ? 'is-live' : ''}`}><i /> {isAttacking ? 'LIVE' : 'IDLE'}</span>
            </div>

            <div className="primary-metric">
              <span>OUTPUT RATE</span>
              <strong>{stats.pps.toLocaleString()}</strong>
              <small>PACKETS / SECOND</small>
              <div className="metric-graph" aria-hidden="true">
                {[24, 38, 30, 56, 44, 68, 53, 79, 62, 91, 72, 100].map((height, index) => (
                  <i key={index} style={{ height: `${isAttacking ? height : 8}%` }} />
                ))}
              </div>
            </div>

            <div className="metric-row">
              <div><Radio size={15} /><span>TOTAL SENT<small>PACKETS</small></span><strong>{stats.totalPackets.toLocaleString()}</strong></div>
              <div><Wifi size={15} /><span>PROXY POOL<small>AVAILABLE</small></span><strong>{stats.proxies}</strong></div>
              <div><Clock3 size={15} /><span>ELAPSED<small>MM:SS</small></span><strong>{formatElapsed(elapsed)}</strong></div>
            </div>

            <div className="session-progress">
              <div><span>SESSION PROGRESS</span><strong>{Math.round(progress)}%</strong></div>
              <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
              <small>{isAttacking ? `${Math.max(duration - elapsed, 0)} seconds remaining` : 'Awaiting mission start'}</small>
            </div>
          </aside>
        </div>

        <section className="panel terminal-panel">
          <div className="terminal-bar">
            <div><Terminal size={15} /><strong>SCOUTER LOG</strong><span>galickgun@vegeta:~</span></div>
            <button onClick={resetStats} title="Clear telemetry and logs"><RotateCcw size={14} /> CLEAR</button>
          </div>
          <div className="terminal-output" role="log" aria-live="polite">
            {attackLogs.length === 0 ? (
              <p className="terminal-empty"><span>›</span> Galick core ready. Configure a target to begin an authorized test.<i /></p>
            ) : attackLogs.map((log, index) => (
              <p key={`${index}-${log}`}><time>{new Date().toLocaleTimeString([], { hour12: false })}</time><span>›</span>{log}</p>
            ))}
            <div ref={logEndRef} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>GALICKGUN // DARKSECLABS</span>
        <span>AUTHORIZED SAIYAN NETWORK TESTING CONSOLE</span>
        <span>CORE STATUS: <b className={connected ? 'online' : ''}>{connected ? 'NOMINAL' : 'DISCONNECTED'}</b></span>
      </footer>

      {showSettings && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false) }}>
          <div className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-header">
              <div><span><Settings size={18} /></span><div><small>SYSTEM</small><h2 id="settings-title">CONFIGURATION</h2></div></div>
              <button onClick={() => setShowSettings(false)} aria-label="Close configuration"><X size={18} /></button>
            </div>
            <div className="modal-body">
              <label className="config-field">
                <span><strong>PROXY POOL</strong><small>{proxyCount} VALID ENTRIES</small></span>
                <textarea value={proxies} onChange={(event) => setProxies(event.target.value)} rows={7} placeholder={'http://proxy1:8080\nsocks5://proxy2:1080\n# one proxy per line'} />
              </label>
              <label className="config-field">
                <span><strong>USER AGENT ROTATION</strong><small>{userAgentCount} VALID ENTRIES</small></span>
                <textarea value={uas} onChange={(event) => setUas(event.target.value)} rows={7} placeholder={'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...\n# one user agent per line'} />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowSettings(false)}>CANCEL</button>
              <button className={`save-button ${settingsSaved ? 'is-saved' : ''}`} onClick={saveConfiguration}>
                {settingsSaved ? <Check size={16} /> : <Save size={16} />}{settingsSaved ? 'CONFIGURATION SAVED' : 'SAVE CONFIGURATION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App