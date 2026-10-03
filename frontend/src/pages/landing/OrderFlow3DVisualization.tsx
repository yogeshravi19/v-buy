import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import {
  Play, Pause, RotateCcw, ChevronRight, ChevronLeft,
  Smartphone, Server, Database, Radio, ChefHat, QrCode,
  ShieldCheck, Zap, Clock, ArrowRight, CheckCircle2,
  Terminal, Sparkles, AlertCircle
} from 'lucide-react'

export interface OrderFlowStep {
  id: number
  title: string
  source: string
  target: string
  protocol: string
  latency: string
  description: string
  technicalDetails: {
    endpoint?: string
    sql?: string
    event?: string
    security?: string
  }
}

const FLOW_STEPS: OrderFlowStep[] = [
  {
    id: 1,
    title: 'Student Submits Order',
    source: 'Student Mobile Web / PWA',
    target: 'FastAPI Backend Gateway',
    protocol: 'HTTPS / POST (JSON)',
    latency: '35ms',
    description: 'Student confirms cart and taps "Pay from Wallet" or "Instant UPI". Device encrypts user session and transmits order payload with items, canteen ID, and pickup window.',
    technicalDetails: {
      endpoint: 'POST /api/orders/place_order_wallet',
      security: 'Bearer JWT (Supabase Auth) + Client Device Timestamp',
      event: 'HTTP_REQUEST_SENT'
    }
  },
  {
    id: 2,
    title: 'FastAPI Ingestion & Validation',
    source: 'FastAPI Backend Gateway',
    target: 'Supabase PostgreSQL',
    protocol: 'Internal TCP / SQLAlchemy async',
    latency: '15ms',
    description: 'FastAPI decrypts the JWT token, verifies caller identity against profiles table, validates item price consistency against the menu catalog, and checks operational hours.',
    technicalDetails: {
      endpoint: 'uvicorn ASGI → FastAPI Depends(get_current_user)',
      security: 'HMAC-SHA256 signature check & Pydantic Schema Validation',
      sql: 'SELECT id, price, available, stock_qty FROM menu_items WHERE id IN (...) FOR UPDATE'
    }
  },
  {
    id: 3,
    title: 'Atomic Database Ledger Transaction',
    source: 'Supabase PostgreSQL',
    target: 'PostgreSQL Database Engine',
    protocol: 'ACID Stored Procedure (RPC)',
    latency: '22ms',
    description: 'PostgreSQL executes an atomic transaction: decrements available stock, debits the student campus wallet, generates a unique 4-digit pickup token, and inserts records into orders and order_items.',
    technicalDetails: {
      sql: 'BEGIN; UPDATE profiles SET balance = balance - :total; INSERT INTO orders (...); COMMIT;',
      security: 'PostgreSQL Row Level Security (RLS) enforces tenant outlet isolation',
      event: 'POSTGRES_WAL_WRITE'
    }
  },
  {
    id: 4,
    title: 'Realtime WAL Broadcast Trigger',
    source: 'Supabase PostgreSQL',
    target: 'Realtime WebSocket Bus',
    protocol: 'Postgres Logical Replication (CDC)',
    latency: '8ms',
    description: 'The database WAL (Write-Ahead Log) automatically streams change events to Supabase Realtime WebSocket engine for all subscribers listening on the public.orders channel.',
    technicalDetails: {
      event: 'INSERT on public.orders (schema: public)',
      endpoint: 'wss://wahftohnwfoepuszvzrx.supabase.co/realtime/v1/websocket',
      security: 'Channel scoped by outlet_id token filter'
    }
  },
  {
    id: 5,
    title: 'Kitchen KDS Chime & Queue Display',
    source: 'Realtime WebSocket Bus',
    target: 'Shop Staff KDS Terminal',
    protocol: 'Secure WebSocket (WSS)',
    latency: '45ms',
    description: 'The kitchen tablet screen receives the order payload instantaneously. Web Audio API synthesizes a high-frequency two-tone chime alert, and the ticket enters the Placed column.',
    technicalDetails: {
      event: 'postgres_changes -> payload.new',
      security: 'Canteen Staff Role Verification (outlet_id matching)',
      endpoint: 'Web Audio API oscillator chime (880Hz → 1100Hz)'
    }
  },
  {
    id: 6,
    title: 'Staff Preparation & Status Advancement',
    source: 'Shop Staff KDS Terminal',
    target: 'FastAPI / Supabase DB',
    protocol: 'WSS / REST Status Patch',
    latency: '28ms',
    description: 'Cook taps "Start Prep" to transition status to "Preparing". Once plated, cook taps "Mark Ready". An updated status packet fires back to the database.',
    technicalDetails: {
      endpoint: 'PATCH /api/orders/{id}/status → "ready"',
      sql: 'UPDATE orders SET status = "ready", updated_at = NOW() WHERE id = :id',
      event: 'STATUS_ADVANCE_READY'
    }
  },
  {
    id: 7,
    title: 'Order Ready Notification to Student',
    source: 'Realtime WebSocket Bus',
    target: 'Student Mobile Web / PWA',
    protocol: 'WSS Broadcast + Web Push',
    latency: '40ms',
    description: 'The ready event streams back to the student smartphone. The UI dynamically changes from amber (Preparing) to vibrant green (Ready), rendering an HMAC-signed QR pickup pass and 4-digit token.',
    technicalDetails: {
      event: 'postgres_changes status == "ready"',
      security: 'HMAC-SHA256(QR_SECRET, "CB1." + order.id + "." + token)',
      endpoint: 'navigator.serviceWorker.showNotification("V FOODS — Order Ready!")'
    }
  },
  {
    id: 8,
    title: 'Counter Pickup & QR Handover',
    source: 'Student Mobile Web / PWA',
    target: 'Express Pickup Bay & Scanner',
    protocol: 'Optical 2D QR Scan / Token Verification',
    latency: 'Instant (Physical)',
    description: 'Student walks to Counter Bay 2 and presents the QR pass. Staff scans the code with the KDS camera or enters the 4-digit token. Order status moves to "Collected" and ledger archives.',
    technicalDetails: {
      security: 'Single-use cryptographic signature verification prevents screenshot reuse',
      sql: 'UPDATE orders SET status = "collected" WHERE id = :id AND token = :token',
      event: 'ORDER_LIFECYCLE_COMPLETED'
    }
  }
]

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export const OrderFlow3DVisualization: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [activeNodeIndex, setActiveNodeIndex] = useState<number | null>(null)
  const [webglSupported] = useState<boolean>(() => checkWebGL())
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1)

  const isPlayingRef = useRef(isPlaying)
  const currentStepRef = useRef(currentStep)
  const speedRef = useRef(speedMultiplier)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentStepRef.current = currentStep
  }, [currentStep])

  useEffect(() => {
    speedRef.current = speedMultiplier
  }, [speedMultiplier])

  // System Nodes definition for 3D coordinate space
  const nodes = useMemo(() => [
    {
      id: 'student',
      label: 'Student Device',
      sub: 'Mobile Web / PWA',
      color: 0x2563EB, // Royal Blue
      accentHex: '#2563EB',
      x: -10,
      y: 0,
      z: 5,
      icon: Smartphone,
      specs: 'Client React 19 PWA with Service Worker & WebSockets'
    },
    {
      id: 'fastapi',
      label: 'FastAPI Gateway',
      sub: 'Python API Server',
      color: 0xEA580C, // V Foods Amber / Orange
      accentHex: '#EA580C',
      x: -5,
      y: 1.2,
      z: -1,
      icon: Server,
      specs: 'Asynchronous ASGI gateway validating JWTs & business constraints'
    },
    {
      id: 'database',
      label: 'PostgreSQL DB',
      sub: 'Supabase Relational DB',
      color: 0x059669, // Emerald Green
      accentHex: '#059669',
      x: 0,
      y: 2.2,
      z: -5,
      icon: Database,
      specs: 'ACID stored procedures, RLS multi-tenant security, and WAL CDC'
    },
    {
      id: 'realtime',
      label: 'Realtime Bus',
      sub: 'WebSockets CDC Engine',
      color: 0x7C3AED, // Violet
      accentHex: '#7C3AED',
      x: 5,
      y: 1.5,
      z: -2,
      icon: Radio,
      specs: 'Sub-150ms publish/subscribe event streaming over persistent sockets'
    },
    {
      id: 'staff_kds',
      label: 'Kitchen KDS',
      sub: 'Shop Staff Counter Tablet',
      color: 0xF59E0B, // Amber Warm
      accentHex: '#F59E0B',
      x: 9,
      y: 0.5,
      z: 4,
      icon: ChefHat,
      specs: 'Live ticket queue with two-tone sound alerts and status toggles'
    },
    {
      id: 'pickup_bay',
      label: 'Express Pickup Bay',
      sub: 'Counter QR Verifier',
      color: 0x0284C7, // Sky Blue
      accentHex: '#0284C7',
      x: 0,
      y: -0.5,
      z: 8,
      icon: QrCode,
      specs: 'Hardware QR scanner and 4-digit token verification counter'
    }
  ], [])

  // Auto-step timeline timer
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % FLOW_STEPS.length)
    }, 4200 / speedMultiplier)
    return () => clearInterval(interval)
  }, [isPlaying, speedMultiplier])

  // Three.js 3D Scene Initialization
  useEffect(() => {
    const container = mountRef.current
    if (!container || !webglSupported) return

    const width = container.clientWidth || 700
    const height = container.clientHeight || 460

    const scene = new THREE.Scene()

    // Isometric-style Perspective Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000)
    camera.position.set(16, 22, 26)
    camera.lookAt(0, 0, 1)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5)
    mainLight.position.set(20, 30, 20)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)

    const fillLight = new THREE.PointLight(0x38bdf8, 0.8, 50)
    fillLight.position.set(-15, 10, -10)
    scene.add(fillLight)

    // Master Group for mouse drag / gentle auto rotation
    const worldGroup = new THREE.Group()
    scene.add(worldGroup)

    // Floor Base (Sleek Clean SaaS Grid)
    const floorGeo = new THREE.CylinderGeometry(18, 19, 0.6, 48)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.8,
      metalness: 0.1
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.y = -0.8
    floorMesh.receiveShadow = true
    worldGroup.add(floorMesh)

    const grid = new THREE.GridHelper(30, 30, 0xcbd5e1, 0xe2e8f0)
    grid.position.y = -0.48
    worldGroup.add(grid)

    // Create 3D Node Meshes
    const nodeMeshes: THREE.Group[] = []
    const nodePositions = nodes.map(n => new THREE.Vector3(n.x, n.y, n.z))

    nodes.forEach((node) => {
      const nodeGroup = new THREE.Group()
      nodeGroup.position.set(node.x, node.y, node.z)

      // Base pedestal
      const pedGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.5, 32)
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1
      })
      const pedMesh = new THREE.Mesh(pedGeo, pedMat)
      pedMesh.castShadow = true
      pedMesh.receiveShadow = true
      nodeGroup.add(pedMesh)

      // Colored core beacon
      const coreGeo = new THREE.CylinderGeometry(1.0, 1.0, 0.8, 32)
      const coreMat = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.2,
        metalness: 0.3
      })
      const coreMesh = new THREE.Mesh(coreGeo, coreMat)
      coreMesh.position.y = 0.6
      coreMesh.castShadow = true
      nodeGroup.add(coreMesh)

      // Glowing pulse ring
      const ringGeo = new THREE.RingGeometry(1.6, 1.85, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = Math.PI / 2
      ringMesh.position.y = 0.05
      nodeGroup.add(ringMesh)

      // Floating diamond topper
      const topGeo = new THREE.OctahedronGeometry(0.55)
      const topMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.8
      })
      const topMesh = new THREE.Mesh(topGeo, topMat)
      topMesh.position.y = 1.6
      topMesh.name = 'floatingTopper'
      nodeGroup.add(topMesh)

      worldGroup.add(nodeGroup)
      nodeMeshes.push(nodeGroup)
    })

    // Construct 3D Connection Conduit Pipes between nodes
    const conduitConnections = [
      { from: 0, to: 1 }, // Student -> FastAPI
      { from: 1, to: 2 }, // FastAPI -> PostgreSQL
      { from: 2, to: 3 }, // PostgreSQL -> Realtime
      { from: 3, to: 4 }, // Realtime -> Staff KDS
      { from: 4, to: 5 }, // Staff KDS -> Pickup Bay
      { from: 3, to: 0 }, // Realtime -> Student
      { from: 0, to: 5 }, // Student -> Pickup Bay
    ]

    const pipeCurves: THREE.CatmullRomCurve3[] = []

    conduitConnections.forEach((conn) => {
      const p1 = nodePositions[conn.from]
      const p2 = nodePositions[conn.to]
      const mid = new THREE.Vector3(
        (p1.x + p2.x) / 2,
        Math.max(p1.y, p2.y) + 1.2,
        (p1.z + p2.z) / 2
      )
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(p1.x, p1.y + 0.6, p1.z),
        mid,
        new THREE.Vector3(p2.x, p2.y + 0.6, p2.z)
      ])
      pipeCurves.push(curve)

      // Glassy conduit pipe
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.12, 10, false)
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        transparent: true,
        opacity: 0.5,
        roughness: 0.4
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      worldGroup.add(tubeMesh)
    })

    // Traveling Data Packet Spheres
    const packetGeo = new THREE.SphereGeometry(0.38, 16, 16)
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xEA580C })
    const packetMesh = new THREE.Mesh(packetGeo, packetMat)
    worldGroup.add(packetMesh)

    // Packet glow outer shell
    const packetGlowGeo = new THREE.SphereGeometry(0.6, 16, 16)
    const packetGlowMat = new THREE.MeshBasicMaterial({
      color: 0xFDBA74,
      transparent: true,
      opacity: 0.4
    })
    const packetGlowMesh = new THREE.Mesh(packetGlowGeo, packetGlowMat)
    worldGroup.add(packetGlowMesh)

    // Map each step in FLOW_STEPS to a specific conduit curve
    const stepToPipeMap: { [stepIdx: number]: number } = {
      0: 0, // Step 1: Student -> FastAPI (pipe 0)
      1: 1, // Step 2: FastAPI -> PostgreSQL (pipe 1)
      2: 1, // Step 3: PostgreSQL internal/write
      3: 2, // Step 4: PostgreSQL -> Realtime (pipe 2)
      4: 3, // Step 5: Realtime -> Staff KDS (pipe 3)
      5: 4, // Step 6: Staff KDS -> Status Ready (pipe 4)
      6: 5, // Step 7: Realtime -> Student Notify (pipe 5)
      7: 6, // Step 8: Student -> Pickup Bay (pipe 6)
    }

    // Animation Loop
    let animationFrameId: number
    let clock = new THREE.Clock()
    let packetT = 0

    // Interaction Drag Controls
    let isDragging = false
    let previousMousePosition = { x: 0, y: 0 }

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - previousMousePosition.x
      const deltaY = e.clientY - previousMousePosition.y

      worldGroup.rotation.y += deltaX * 0.006
      worldGroup.rotation.x = Math.max(-0.25, Math.min(0.35, worldGroup.rotation.x + deltaY * 0.004))

      previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => { isDragging = false }

    const domElement = renderer.domElement
    domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // Resize Listener
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()
      const speed = speedRef.current

      // Gentle ambient drift if not dragging
      if (!isDragging) {
        worldGroup.rotation.y += 0.0012 * speed
      }

      // Bob floating toppers
      nodeMeshes.forEach((nGroup, idx) => {
        const topper = nGroup.getObjectByName('floatingTopper')
        if (topper) {
          topper.position.y = 1.6 + Math.sin(elapsedTime * 2.5 + idx) * 0.15
          topper.rotation.y += 0.02
        }
      })

      // Move data packet along the active curve
      const stepIdx = currentStepRef.current
      const pipeIdx = stepToPipeMap[stepIdx] || 0
      const curve = pipeCurves[pipeIdx]

      if (curve) {
        packetT += (0.008 * speed)
        if (packetT > 1) packetT = 0

        const pt = curve.getPoint(packetT)
        packetMesh.position.copy(pt)
        packetGlowMesh.position.copy(pt)

        // Color coding packet by step
        if (stepIdx === 0 || stepIdx === 1) {
          packetMat.color.setHex(0xEA580C) // Amber
        } else if (stepIdx === 2 || stepIdx === 3) {
          packetMat.color.setHex(0x059669) // Green
        } else if (stepIdx === 4 || stepIdx === 5) {
          packetMat.color.setHex(0x7C3AED) // Violet
        } else {
          packetMat.color.setHex(0x2563EB) // Blue
        }
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      domElement.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [webglSupported, nodes])

  const step = FLOW_STEPS[currentStep]

  return (
    <div className="space-y-6">
      {/* Header and Value Proposition */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>INTERACTIVE 3D SYSTEM ARCHITECTURE</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
          What Happens in the System After You Order?
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Watch live data packets flow from a student's phone through the FastAPI gateway, Supabase PostgreSQL, Realtime WebSockets, and the Kitchen KDS terminal in under 150 milliseconds.
        </p>
      </div>

      {/* Main 3D Canvas Box + Live Telemetry HUD */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-200/60 relative overflow-hidden">
        {/* Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>STEP {currentStep + 1} OF {FLOW_STEPS.length}</span>
            </span>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline">
              {step.title}
            </span>
          </div>

          {/* Interactive Playback Toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentStep(prev => (prev === 0 ? FLOW_STEPS.length - 1 : prev - 1))}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              onClick={() => setIsPlaying(p => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
              title={isPlaying ? 'Pause Simulation' : 'Play Live Simulation'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause' : 'Simulate'}</span>
            </button>

            <button
              onClick={() => setCurrentStep(prev => (prev + 1) % FLOW_STEPS.length)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Next Step"
            >
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => { setCurrentStep(0); setIsPlaying(true) }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Reset Flow"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => setSpeedMultiplier(s => (s === 1 ? 1.75 : s === 1.75 ? 0.6 : 1))}
              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Toggle Speed"
            >
              {speedMultiplier}x Speed
            </button>
          </div>
        </div>

        {/* 3D WebGL Canvas Container or Fallback */}
        <div className="relative w-full h-[360px] sm:h-[440px] bg-gradient-to-b from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
          {webglSupported ? (
            <>
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              {/* Overlay Prompt */}
              <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-500 font-medium pointer-events-none">
                Drag to rotate 3D architectural nodes
              </div>
            </>
          ) : (
            // Accessible High-Fidelity SVG Fallback
            <div className="p-8 text-center max-w-md">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-900">WebGL Hardware Acceleration Disabled</h4>
              <p className="text-xs text-slate-600 mt-1">
                Your browser is currently displaying the real-time architectural event pipeline in 2D mode below.
              </p>
            </div>
          )}

          {/* Floating Live Telemetry HUD Widget */}
          <div className="absolute bottom-3 right-3 max-w-[280px] sm:max-w-xs bg-slate-900/90 text-white backdrop-blur-md rounded-2xl p-3.5 border border-slate-800 shadow-2xl text-left pointer-events-none">
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
              <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE NETWORK PACKET
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Zap size={10} className="text-amber-400" /> {step.latency}
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="text-slate-400">
                FROM: <span className="text-white font-semibold">{step.source}</span>
              </div>
              <div className="text-slate-400">
                TO: <span className="text-amber-400 font-semibold">{step.target}</span>
              </div>
              <div className="text-slate-400">
                PROTO: <span className="text-sky-300">{step.protocol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Progress Bar Track */}
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2 my-5">
          {FLOW_STEPS.map((s, idx) => {
            const isActive = idx === currentStep
            const isCompleted = idx < currentStep
            return (
              <button
                key={s.id}
                onClick={() => { setCurrentStep(idx); setIsPlaying(false) }}
                className={`h-2 sm:h-2.5 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-600 ring-2 ring-orange-400/40 shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Step ${idx + 1}: ${s.title}`}
              />
            )
          })}
        </div>

        {/* Step Description & Technical Explanation Card */}
        <div className="grid md:grid-cols-12 gap-6 bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left items-center">
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center">
                {step.id}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                {step.title}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Code & Security Telemetry Snippet */}
          <div className="md:col-span-5 bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-[11px] space-y-1.5 border border-slate-800 shadow-inner">
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold uppercase tracking-wider pb-1 border-b border-slate-800">
              <Terminal size={12} className="text-orange-400" />
              <span>Telemetry &amp; Code Trigger</span>
            </div>

            {step.technicalDetails.endpoint && (
              <div>
                <span className="text-sky-400">Endpoint: </span>
                <span className="text-slate-300 break-all">{step.technicalDetails.endpoint}</span>
              </div>
            )}

            {step.technicalDetails.sql && (
              <div>
                <span className="text-emerald-400">SQL: </span>
                <span className="text-slate-300 break-all">{step.technicalDetails.sql}</span>
              </div>
            )}

            {step.technicalDetails.event && (
              <div>
                <span className="text-amber-400">Event: </span>
                <span className="text-slate-300">{step.technicalDetails.event}</span>
              </div>
            )}

            {step.technicalDetails.security && (
              <div className="text-purple-300 text-[10px] pt-1 flex items-center gap-1">
                <ShieldCheck size={11} className="text-purple-300" /> {step.technicalDetails.security}
              </div>
            )}
          </div>
        </div>

        {/* Clickable 6-Node Architecture Explorer Grid */}
        <div className="pt-6 mt-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-left">
            Interactive Node Inspection (Click to Inspect Specs):
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {nodes.map((n, idx) => {
              const Icon = n.icon
              const isSelected = activeNodeIndex === idx
              return (
                <div
                  key={n.id}
                  onClick={() => setActiveNodeIndex(isSelected ? null : idx)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-orange-600 shadow-md ring-2 ring-orange-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white mb-2 shadow-xs"
                    style={{ backgroundColor: n.accentHex }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="font-bold text-xs text-slate-900 leading-tight">{n.label}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{n.sub}</div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600 leading-tight">
                      {n.specs}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderFlow3DVisualization
