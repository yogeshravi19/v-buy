import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface CampusCanvas3DProps {
  className?: string
  onSelectCanteen?: (name: string) => void
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export const CampusCanvas3D: React.FC<CampusCanvas3DProps> = ({ className = '', onSelectCanteen }) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [activeNode, setActiveNode] = useState<{ name: string; status: string; wait: string; x: number; y: number } | null>(null)
  const activeNodeRef = useRef(activeNode)
  const [webglSupported] = useState(() => checkWebGL())

  useEffect(() => {
    activeNodeRef.current = activeNode
  }, [activeNode])

  useEffect(() => {
    const container = mountRef.current
    if (!container || !webglSupported) return

    const width = container.clientWidth || 640
    const height = container.clientHeight || 420

    // Scene, Camera, Renderer
    const scene = new THREE.Scene()
    scene.background = null // transparent to blend with dark navy background

    const aspect = width / height
    const d = 16
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000)
    camera.position.set(24, 28, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    // Lighting - Natural crisp daylight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4)
    dirLight.position.set(24, 36, 18)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 80
    dirLight.shadow.camera.left = -20
    dirLight.shadow.camera.right = 20
    dirLight.shadow.camera.top = 20
    dirLight.shadow.camera.bottom = -20
    scene.add(dirLight)

    // Soft sky fill light
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0xe2e8f0, 0.6)
    scene.add(hemiLight)

    // Group for mouse rotation
    const campusGroup = new THREE.Group()
    scene.add(campusGroup)

    // Ground platform (architectural concrete model base)
    const floorGeo = new THREE.CylinderGeometry(15, 16, 0.8, 36)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.9,
      metalness: 0.05,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.y = -0.4
    floorMesh.receiveShadow = true
    campusGroup.add(floorMesh)

    // Grid lines on floor
    const gridHelper = new THREE.GridHelper(26, 26, 0xcbd5e1, 0xe2e8f0)
    gridHelper.position.y = 0.02
    campusGroup.add(gridHelper)

    // Building definitions - Crisp modern university architectural blocks
    const buildings = [
      { x: -7, z: -5, w: 4.5, h: 6.5, d: 3.5, color: 0xffffff, label: 'Main Academic Block' },
      { x: -5, z: 4, w: 3.5, h: 8.5, d: 3.5, color: 0xf8fafc, label: 'Tech Tower' },
      { x: 3, z: -6, w: 5.5, h: 4.2, d: 4.2, color: 0xffffff, label: 'Central Library' },
      { x: 7, z: 2, w: 4, h: 5.2, d: 3, color: 0xf1f5f9, label: 'Hostel Block' },
    ]

    buildings.forEach(b => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d)
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: 0.3,
        metalness: 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(b.x, b.h / 2, b.z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      campusGroup.add(mesh)

      // Add architectural windows
      const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
      const rows = Math.floor(b.h / 1.5)
      const cols = Math.floor(b.w / 1.2)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const winGeo = new THREE.PlaneGeometry(0.35, 0.45)
          const win = new THREE.Mesh(winGeo, windowMat)
          win.position.set(
            b.x - b.w / 2 + 0.6 + c * 0.9,
            1.2 + r * 1.3,
            b.z + b.d / 2 + 0.01
          )
          campusGroup.add(win)
        }
      }
    })

    // Interactive Canteen pavilions (Gazebo C1, North Square, Food Street)
    const canteens = [
      { name: 'Gazebo C1', status: 'Active • 2 min avg wait', wait: '2m', x: -1, z: 0, color: 0xe04d2d, label: 'Gazebo C1' },
      { name: 'North Square Canteen', status: 'Live KDS • 18 in queue', wait: '4m', x: 2, z: 5, color: 0xe04d2d, label: 'North Square' },
      { name: 'Food Street / Riviera Stalls', status: 'Pre-order active', wait: '1m', x: 6, z: -3, color: 0xe04d2d, label: 'Riviera Stalls' },
    ]

    const canteenMeshes: THREE.Mesh[] = []

    canteens.forEach(c => {
      // Pavilion base
      const baseGeo = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 18)
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
      const baseMesh = new THREE.Mesh(baseGeo, baseMat)
      baseMesh.position.set(c.x, 0.6, c.z)
      baseMesh.castShadow = true
      baseMesh.receiveShadow = true
      campusGroup.add(baseMesh)

      // Terracotta Coral Roof
      const roofGeo = new THREE.ConeGeometry(2.1, 1.3, 18)
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        roughness: 0.3,
      })
      const roofMesh = new THREE.Mesh(roofGeo, roofMat)
      roofMesh.position.set(c.x, 1.85, c.z)
      roofMesh.castShadow = true
      campusGroup.add(roofMesh)

      // Clean ring
      const ringGeo = new THREE.RingGeometry(1.7, 1.9, 24)
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = -Math.PI / 2
      ringMesh.position.set(c.x, 0.05, c.z)
      campusGroup.add(ringMesh)

      // Interactive beacon pin
      const pinGeo = new THREE.SphereGeometry(0.38, 16, 16)
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        roughness: 0.2,
      })
      const pinMesh = new THREE.Mesh(pinGeo, pinMat)
      pinMesh.position.set(c.x, 3.2, c.z)
      pinMesh.userData = { canteen: c }
      campusGroup.add(pinMesh)
      canteenMeshes.push(pinMesh)
    })

    // Order Route Spline Curve
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7, 0.3, -5),
      new THREE.Vector3(-4, 0.3, -2),
      new THREE.Vector3(-1, 0.3, 0),
      new THREE.Vector3(2, 0.3, 2),
      new THREE.Vector3(2, 0.3, 5),
    ])

    const curvePoints = curve.getPoints(60)
    const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf97316, linewidth: 2 })
    const lineMesh = new THREE.Line(lineGeo, lineMat)
    campusGroup.add(lineMesh)

    // Animated packet / token moving on curve
    const tokenGeo = new THREE.SphereGeometry(0.24, 16, 16)
    const tokenMat = new THREE.MeshBasicMaterial({ color: 0xea580c })
    const tokenMesh = new THREE.Mesh(tokenGeo, tokenMat)
    campusGroup.add(tokenMesh)

    // Mouse Interaction
    let targetRotX = 0
    let targetRotY = 0
    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1)

      targetRotY = mouseX * 0.35
      targetRotX = -mouseY * 0.15

      // Raycast for hover detection
      const raycaster = new THREE.Raycaster()
      const mouseVec = new THREE.Vector2(mouseX, mouseY)
      raycaster.setFromCamera(mouseVec, camera)
      const intersects = raycaster.intersectObjects(canteenMeshes)

      if (intersects.length > 0) {
        const hit = intersects[0].object.userData.canteen
        if (hit) {
          container.style.cursor = 'pointer'
          setActiveNode({
            name: hit.name,
            status: hit.status,
            wait: hit.wait,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top - 20,
          })
        }
      } else {
        container.style.cursor = 'default'
        setActiveNode(null)
      }
    }

    const handleClick = () => {
      if (activeNodeRef.current && onSelectCanteen) {
        onSelectCanteen(activeNodeRef.current.name)
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('click', handleClick)

    // Resize Handler
    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      const newAspect = w / h
      camera.left = -d * newAspect
      camera.right = d * newAspect
      camera.top = d
      camera.bottom = -d
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    // Animation Loop
    let animId = 0
    let clock = new THREE.Clock()

    const animate = () => {
      animId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Smooth camera group rotation
      campusGroup.rotation.y += (targetRotY - campusGroup.rotation.y) * 0.05
      campusGroup.rotation.x += (targetRotX - campusGroup.rotation.x) * 0.05

      // Floating canteen beacon pins
      canteenMeshes.forEach((mesh, idx) => {
        mesh.position.y = 3.2 + Math.sin(elapsed * 2.5 + idx * 1.5) * 0.22
      })

      // Token progressing along order curve
      const t = (elapsed * 0.25) % 1
      const pointOnCurve = curve.getPointAt(t)
      tokenMesh.position.copy(pointOnCurve)
      tokenMesh.position.y += 0.2

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('click', handleClick)
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [onSelectCanteen, webglSupported])

  if (!webglSupported) {
    return (
      <div className={`relative flex items-center justify-center rounded-2xl bg-[#0F1E36] p-8 border border-slate-700/60 ${className}`}>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">Interactive Campus Map</p>
          <p className="text-xs text-slate-400 mt-1">13 Campus Canteens & Riviera Food Stalls Connected</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-[380px] sm:h-[460px] select-none rounded-2xl overflow-hidden ${className}`}>
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating HUD Badges */}
      <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          13 Canteens Live
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md border border-slate-200 text-orange-600 shadow-sm">
          2 min Quick Pickup
        </span>
      </div>

      <div className="absolute bottom-3 right-4 text-[11px] text-slate-500 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200 pointer-events-none shadow-xs">
        Drag/move to explore campus
      </div>

      {/* Interactive Tooltip Card on Hover */}
      {activeNode && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max(activeNode.x - 70, 10), 300)}px`,
            top: `${Math.max(activeNode.y - 45, 10)}px`,
            pointerEvents: 'none',
          }}
          className="z-20 bg-white/95 backdrop-blur-md border border-orange-300 rounded-xl px-3.5 py-2 shadow-xl text-left min-w-[150px] transition-transform animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-900 tracking-tight">{activeNode.name}</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200">
              {activeNode.wait}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5">{activeNode.status}</p>
        </div>
      )}
    </div>
  )
}
