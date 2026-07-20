'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useTexture, OrbitControls } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

type CityZone = {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
};

/* ----------------------------- City Zones ---------------------------- */
const CITY_ZONES: CityZone[] = [
  {
    id: 'psyopura',
    name: 'Psyopura Complex',
    // moved further left
    position: [-5.6, 2.3, 0.6],
    color: '#ff7ce6',
  },
  {
    id: 'ciphons',
    name: 'The Ciphon Fortress',
    position: [-5.2, -2, 0.6],
    color: '#ff7ce6',
  },
  {
    id: 'nemanyo',
    name: 'Nemanyo Kingdom',
    // also moved further left
    position: [-3.45, 2.4, 0.21],
    color: '#4ef4ff',
  },
  {
    id: 'chezidakian',
    name: 'Chezidakian Empire',
    position: [0.6, 2.3, 0.21],
    color: '#ffd166',
  },
  {
    id: 'pamlovian-islands',
    name: 'Pamlovian Islands',
    position: [2.9, 2, 0.21],
    color: '#a6ff7c',
  },
  {
    id: 'pamlovia',
    name: 'Pamlovia City Center',
    position: [0.3, -0.5, 0.21],
    color: '#ff5f5f',
  },
 {
    id: 'catatonia',
    name: 'The Caves of Catatonia',
    position: [5.2, -0.5, 0.21],
    color: '#a6ff7c',
  },
];

/* ----------------------------- Map “card” mesh ---------------------------- */

function MapCard() {
  const texture = useTexture('/world/melodius-map.webp');

  const width = 14;
  const height = 8;

  return (
    <Float
      speed={1.2}
      rotationIntensity={0.12}
      floatIntensity={0.35}
      floatingRange={[-0.18, 0.18]}
    >
      {/* Thick “slab” instead of a paper-thin plane */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-0.18, 0.22, 0]} // tilt down & rotate for 3D perspective
      >
        <boxGeometry args={[width, height, 0.3]} />
        {/* Unlit material = full, non-washed-out color */}
        <meshBasicMaterial map={texture} />
      </mesh>
    </Float>
  );
}

/* ------------------------- Floating bubbles component --------------------- */

type Bubble = {
  x: number;
  y: number;
  z: number;
  speed: number;
  radius: number;
};

function BubbleField() {
  const groupRef = useRef<THREE.Group>(null);

  const bubbles = useMemo<Bubble[]>(() => {
    const count = 160;
    const arr: Bubble[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 10,
        y: -5 - Math.random() * 3,
        z: (Math.random() - 0.5) * 3,
        speed: 0.35 + Math.random() * 0.7,
        radius: 0.015 + Math.random() * 0.03,
      });
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const t = state.clock.getElapsedTime();
    const minY = -5 - 3;
    const maxY = 4.5;
    const spanY = maxY - minY;

    bubbles.forEach((b, i) => {
      b.y += b.speed * delta;

      if (b.y > maxY) {
        b.y = minY;
        b.x = (Math.random() - 0.5) * 10;
        b.z = (Math.random() - 0.5) * 3;
      }

      const child = group.children[i] as THREE.Mesh | undefined;
      if (!child) return;

      const wobble = Math.sin(t * 0.9 + i * 0.7) * 0.15;
      child.position.set(b.x + wobble, b.y, b.z);
      child.rotation.y += delta * 0.6;

      const mat = child.material as THREE.MeshStandardMaterial;
      const norm = (b.y - minY) / spanY;
      const fadeIn = THREE.MathUtils.smoothstep(norm, 0.0, 0.2);
      const fadeOut = 1 - THREE.MathUtils.smoothstep(norm, 0.75, 1.0);
      const opacity = fadeIn * fadeOut * 0.8;
      mat.opacity = opacity;
    });
  });

  return (
    <group ref={groupRef}>
      {bubbles.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <sphereGeometry args={[b.radius, 12, 12]} />
          <meshStandardMaterial
            color="#a5f3fc"
            emissive="#22d3ee"
            emissiveIntensity={0.6}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ----------------------------- Plankton specks ---------------------------- */

function PlanktonField() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 400;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 18;
      const y = (Math.random() - 0.5) * 12;
      const z = -4 + Math.random() * 8;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const t = state.clock.getElapsedTime();
    points.rotation.z += delta * 0.02;
    points.position.y = Math.sin(t * 0.05) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        sizeAttenuation
        color="#e0f2fe"
        transparent
        opacity={0.7}
      />
    </points>
  );
}

/* -------------------------- Soft light ray “beams” ------------------------ */

function LightRays() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const group = groupRef.current;
    if (!group) return;

    group.children.forEach((child, i) => {
      child.rotation.z = Math.sin(t * 0.15 + i) * 0.15;
      child.position.y = 2 + Math.sin(t * 0.08 + i * 0.6) * 0.8;
    });
  });

  const beams = [
    { x: -4, z: -2, width: 3.5, height: 10, opacity: 0.18 },
    { x: 0, z: -3, width: 4.5, height: 12, opacity: 0.12 },
    { x: 4, z: -2.5, width: 3.0, height: 9, opacity: 0.16 },
  ];

  return (
    <group ref={groupRef}>
      {beams.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, 2, b.z]}
          rotation={[Math.PI / 2.2, 0, 0.25]}
        >
          <planeGeometry args={[b.width, b.height]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={b.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------- Soft volumetric “bands” ------------------------ */

function DepthBands() {
  return (
    <group>
      <mesh position={[0, 0, -6]}>
        <planeGeometry args={[30, 18]} />
        <meshBasicMaterial
          color="#022c44"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[40, 24]} />
        <meshBasicMaterial
          color="#02091a"
          transparent
          opacity={0.65}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------- City “hotspots” ------------------------ */

function CityHotspot({
  zone,
  onClick,
}: {
  zone: CityZone;
  onClick?: (zone: CityZone) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const sparkleRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);

  if (!zone) return null;
  const { position, color } = zone;

  // Slightly different phase per zone for unique pulse feel
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  // ⭐ Make Ciphon sit even more forward so it never gets buried
  const zOffset = zone.id === 'ciphons' ? 1.4 : 0.9;

  // Wider, mist-like stardust cloud
  const starPositions = useMemo(() => {
    const count = 40;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.8;  // horizontal spread
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.5; // vertical spread
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, []);

  // Twinkle + gentle pulse (only while hovered)
  useFrame((state) => {
    if (!hovered || !sparkleRef.current || !materialRef.current) return;
    const t = state.clock.getElapsedTime();

    // soft swirl
    sparkleRef.current.rotation.z = Math.sin(t * 1.6 + phase) * 0.18;

    // breathing pulse
    const pulse = 1.0 + 0.12 * Math.sin(t * 3.2 + phase);
    sparkleRef.current.scale.setScalar(pulse);

    // shimmer in opacity
    const baseOpacity = 0.32;
    const shimmer = 0.18 * (0.5 + 0.5 * Math.sin(t * 4.1 + phase));
    materialRef.current.opacity = baseOpacity + shimmer;
  });

  return (
    <group position={position}>
      {/* Invisible hit area – slightly larger for easier targeting */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(zone);
        }}
      >
        {/* bigger disc for rays; still fully invisible */}
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Misty stardust cloud – ONLY on hover */}
      {hovered && (
        <points
          ref={sparkleRef}
          position={[0, 0, zOffset]}  // pushed well in front of the map
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={starPositions.length / 3}
              array={starPositions}
              itemSize={3}
            />
          </bufferGeometry>

          <pointsMaterial
            ref={materialRef}
            size={0.085}               // tiny specks
            sizeAttenuation
            color={color}
            transparent
            opacity={0.4}
            depthWrite={false}
            depthTest={false}          // ⬅️ always render on top of depth
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
}




/* ---------------------- Distant bird / sky-creature flock ----------------- */

type BirdProps = {
  startX: number;
  endX: number;
  baseY: number;
  z: number;
  speed: number;
  phase: number;
  scale: number;
};

function BirdInstance({ startX, endX, baseY, z, speed, phase, scale }: BirdProps) {
  const bodyRef = useRef<THREE.Mesh>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const progress = ((t * speed + phase) % 1 + 1) % 1;
    const x = THREE.MathUtils.lerp(startX, endX, progress);
    const y = baseY + Math.sin(t * 0.9 + phase * 5) * 0.1;
    const wingAngle = Math.sin(t * 7 + phase * 10) * 0.5;

    if (bodyRef.current) {
      bodyRef.current.position.set(x, y, z);
      bodyRef.current.scale.setScalar(scale);
    }
    if (leftWingRef.current) {
      leftWingRef.current.position.set(x - 0.12 * scale, y, z);
      leftWingRef.current.scale.setScalar(scale);
      leftWingRef.current.rotation.z = wingAngle;
    }
    if (rightWingRef.current) {
      rightWingRef.current.position.set(x + 0.12 * scale, y, z);
      rightWingRef.current.scale.setScalar(scale);
      rightWingRef.current.rotation.z = -wingAngle;
    }
  });

  const color = '#0f172a';

  return (
    <>
      <mesh ref={bodyRef}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh ref={leftWingRef}>
        <planeGeometry args={[0.12, 0.03]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      <mesh ref={rightWingRef}>
        <planeGeometry args={[0.12, 0.03]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function BirdsFlock() {
  const baseY = 2.7;
  const leftX = -7;
  const rightX = 7;

  const birds = useMemo<BirdProps[]>(() => {
    const arr: BirdProps[] = [];

    for (let i = 0; i < 4; i++) {
      arr.push({
        startX: leftX,
        endX: rightX,
        baseY: baseY + (Math.random() - 0.5) * 0.25,
        z: 0.3 + (Math.random() - 0.5) * 0.15,
        speed: 0.025 + Math.random() * 0.02,
        phase: Math.random(),
        scale: 0.35 + Math.random() * 0.25,
      });
    }

    for (let i = 0; i < 3; i++) {
      arr.push({
        startX: rightX,
        endX: leftX,
        baseY: baseY + 0.25 + (Math.random() - 0.5) * 0.2,
        z: 0.0 + (Math.random() - 0.5) * 0.15,
        speed: 0.02 + Math.random() * 0.02,
        phase: Math.random(),
        scale: 0.3 + Math.random() * 0.2,
      });
    }

    for (let i = 0; i < 3; i++) {
      arr.push({
        startX: leftX - 1,
        endX: rightX + 1,
        baseY: baseY + 0.5 + (Math.random() - 0.5) * 0.2,
        z: -0.3 + (Math.random() - 0.5) * 0.2,
        speed: 0.015 + Math.random() * 0.015,
        phase: Math.random(),
        scale: 0.28 + Math.random() * 0.18,
      });
    }

    return arr;
  }, []);

  return (
    <group>
      {birds.map((b, i) => (
        <BirdInstance key={i} {...b} />
      ))}
    </group>
  );
}

/* -------------------------- Sky manta “creatures” ------------------------- */

type SkyMantaProps = {
  startX: number;
  endX: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  scale: number;
};

function SkyMantaInstance({ startX, endX, y, z, speed, phase, scale }: SkyMantaProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    const progress = ((t * speed + phase) % 1 + 1) % 1;
    const x = THREE.MathUtils.lerp(startX, endX, progress);

    const bobY = y + Math.sin(t * 0.5 + phase * 4) * 0.25;
    const roll = Math.sin(t * 0.4 + phase * 6) * 0.2;

    if (groupRef.current) {
      groupRef.current.position.set(x, bobY, z);
      groupRef.current.scale.setScalar(scale);
      groupRef.current.rotation.z = roll;
    }
  });

  const color = '#0b1220';

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.45, 0.09, 0.12]} />
        <meshBasicMaterial color={color} />
      </mesh>

      <mesh>
        <planeGeometry args={[1.1, 0.22]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.18, 0]}>
        <planeGeometry args={[0.18, 0.18]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function SkyMantaFlock() {
  const leftX = -8;
  const rightX = 8;
  const baseY = 3.2;

  const mantas = useMemo<SkyMantaProps[]>(() => {
    const arr: SkyMantaProps[] = [];

    arr.push(
      {
        startX: leftX,
        endX: rightX,
        y: baseY,
        z: 0.2,
        speed: 0.006,
        phase: Math.random(),
        scale: 0.9,
      },
      {
        startX: rightX + 1,
        endX: leftX - 1,
        y: baseY + 0.3,
        z: -0.1,
        speed: 0.005,
        phase: Math.random(),
        scale: 0.7,
      }
    );

    return arr;
  }, []);

  return (
    <group>
      {mantas.map((m, i) => (
        <SkyMantaInstance key={i} {...m} />
      ))}
    </group>
  );
}

/* -------------------------- Scene with lights, etc. ----------------------- */
function Scene({ onCityClick }: { onCityClick: (zone: CityZone) => void }) {
  const mapGroupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);

  // Keyboard controls for map rotation (Q/E)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'q' || e.key === 'Q') {
        rotationRef.current += 0.08; // CCW
      }
      if (e.key === 'e' || e.key === 'E') {
        rotationRef.current -= 0.08; // CW
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Apply rotation to the map + hotspots group
  useFrame(() => {
    if (mapGroupRef.current) {
      mapGroupRef.current.rotation.z = rotationRef.current;
    }
  });

  return (
    <>
      {/* Background only (no fog on the map) */}
      <color attach="background" args={['#020617']} />

      {/* Lights affect bubbles & plankton; map uses unlit material */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[6, 8, 10]}
        intensity={1.3}
        color="#e0f2fe"
      />
      <directionalLight
        position={[-4, -6, -4]}
        intensity={0.6}
        color="#0ea5e9"
      />

      <DepthBands />
      <LightRays />
      <PlanktonField />
      <BubbleField />
      <BirdsFlock />

      {/* Map + interactive city zones all rotate together */}
      <group ref={mapGroupRef}>
        <MapCard />
        {CITY_ZONES.map((zone) => (
          <CityHotspot
            key={zone.id}
            zone={zone}
            onClick={onCityClick}
          />
        ))}
      </group>

      <OrbitControls
        enablePan={false}
        enableRotate={true}
        enableZoom={true}
        minDistance={8}
        maxDistance={20}
        zoomSpeed={0.6}
        rotateSpeed={0.7}
        target={[0, 0, 0]}
      />
    </>
  );
}



/* -------------------------- Clean Ambient Audio ------------------------ */
function UnderwaterAmbience() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.35; // your preferred volume
    }
  }, []);

  return (
    <audio
      ref={audioRef}
      src="/audio/underwater_ambience.mp3"
      autoPlay
      loop
      playsInline
      preload="auto"
    />
  );
}

/* -------------------------- Exported world wrapper ------------------------ */

export function WorldScene() {
  const [activeCity, setActiveCity] = useState<CityZone | null>(null);

  const closeModal = () => setActiveCity(null);

  return (
    <div className="relative w-screen h-screen bg-[#020617]">
      <UnderwaterAmbience />

      <Canvas
        shadows
        camera={{ position: [0, 0, 11], fov: 45 }}
      >
        <Suspense fallback={null}>
          <Scene onCityClick={setActiveCity} />
        </Suspense>
      </Canvas>

      {activeCity?.id === 'pamlovia' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black">
              <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=Pamlovian_wlqnve&profile=cld-default"
                  width="640"
                  height="360"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
              <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-pink-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                Pamlovia & The Rise of Pamadeus
              </h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed">
                Among the PaMs of Melodius, there exists a rare sisterhood whose bodies gleam with circuitry and coral-metal alloys. Their transformation was never destiny — it was the result of a cruel deception orchestrated by the Ciphons, shape-shifting tricksters long known for haunting the PaMs with mischief, mimicry, and malice.
              </p>
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                Disguised as allies, the Ciphons convinced the <a href="/pams" className="text-pink-300 hover:text-pink-200 underline underline-offset-2 transition-colors font-semibold">QUTIE PaMs</a> to grant them entry into their sacred Pineapple Gardens of Pamlovia — fields said to be kissed by ancient currents and tended by generations of PaMs priestesses. Once inside, the Ciphons seeded the soil with a spectral toxin, undetectable to sight, scent, or spirit.</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                When the pineapples ripened, they were harvested and joyfully shared during feasts, hookah ceremonies, and moonlit gatherings. Within days, countless PaMs fell gravely ill. Some journeyed on to the Book of Eternity, their names etched in shimmering script as legends, protectors, and dearly cherished kin.</p>
              <div className="py-4">
              {/* Album: QUTIE PaMs */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                <div className="flex h-[200px] overflow-hidden">
                  {/* Col 1 — Album cover */}
                  <div className="relative w-[200px] flex-shrink-0 overflow-hidden">
                    <img src="/images/qutie-pam.png" alt="QUTIE PaMs" className="w-full h-full object-cover" />
                  </div>
                  {/* Col 2 — Video */}
                  <div className="relative flex-1 overflow-hidden" style={{ background: "#000" }}>
                    <iframe
                      src="https://player.vimeo.com/video/1124124805?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                  {/* Col 3 — Streaming links */}
                  <div className="flex flex-col justify-center gap-2 w-[130px] flex-shrink-0 px-3 bg-[#0a0a0a] border-l border-white/10">
                    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 mb-1">Stream</p>
                    <a
                      href="https://open.spotify.com/track/7u4RaRQQy3OXZsw1KjlsJc"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/30 px-2.5 py-2 text-[11px] font-semibold text-[#1DB954] transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Spotify
                    </a>
                    <a
                      href="https://music.apple.com/ng/album/qutie-pam-feat-monlee-mane-single/1753976310"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-2 text-[11px] font-semibold text-white/80 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      Apple Music
                    </a>
                    <a
                      href="https://youtu.be/f_iJU4UxYuA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#FF0000]/15 hover:bg-[#FF0000]/30 px-2.5 py-2 text-[11px] font-semibold text-red-400 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                      YouTube
                    </a>
                  </div>
                </div>
              </div>
              </div>
<h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300 bg-clip-text text-transparent">
                Princess Niobe of Pamlovia
              </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                But their story could have been far darker, were it not for the decisive bravery of <b>Princess Niobe of Pamlovia</b>. Realizing the affliction was beyond PaMs herbalism, she sought counsel from the enigmatic Psyopuras, an order of techno-matriarchs whose mastery over biomechanical life bordered on the divine.</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                The Psyopuras agreed to intervene, but their solution was drastic: to preserve the failing bodies of the poisoned PaMs, they would have to reshape them — fusing living essence with intricate Psyopuran cybernetics. It was the only path between life and oblivion.</p>
              <div className="py-4">
              {/* Album: Pamela */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                <div className="flex h-[200px] overflow-hidden">
                  {/* Col 1 — Album cover */}
                  <div className="relative w-[200px] flex-shrink-0 overflow-hidden">
                    <img src="/images/pamela-cover.png" alt="Pamela" className="w-full h-full object-cover" />
                  </div>
                  {/* Col 2 — Video */}
                  <div className="relative flex-1 overflow-hidden" style={{ background: "#000" }}>
                    <iframe
                      src="https://player.vimeo.com/video/856465601?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                  {/* Col 3 — Streaming links */}
                  <div className="flex flex-col justify-center gap-2 w-[130px] flex-shrink-0 px-3 bg-[#0a0a0a] border-l border-white/10">
                    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 mb-1">Stream</p>
                    <a
                      href="https://open.spotify.com/track/0luy50fIFBccycyHk3tIGd"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/30 px-2.5 py-2 text-[11px] font-semibold text-[#1DB954] transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Spotify
                    </a>
                    <a
                      href="https://music.apple.com/us/album/pamela-feat-monlee-mane-single/1714431585"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-2 text-[11px] font-semibold text-white/80 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      Apple Music
                    </a>
                    <a
                      href="https://youtu.be/W2MNErJ8JnQ"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#FF0000]/15 hover:bg-[#FF0000]/30 px-2.5 py-2 text-[11px] font-semibold text-red-400 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                      YouTube
                    </a>
                  </div>
                </div>
              </div>
              </div>
<h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-cyan-300 via-sky-200 to-teal-300 bg-clip-text text-transparent">
                Cyber PaMs
              </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                When the stricken PaMs finally awakened in their new forms, fear rippled through them. Their reflections showed metal beneath skin, luminous eyes, and voices threaded with harmonic resonance. Yet over time, acceptance bloomed. Then, mastery.</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                Their augmented spirits began to unlock extraordinary talents. And from among them emerged one whose musical power shook the oceanic halls of Melodius:</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
               <b>Pamadeus<br />
The Cybersiren.<br />
The Rockstar of the Realms.<br />
A legend coded in sound.</b></p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
                Her first song shattered glass reefs, healed sick coral dragons, and woke the sleeping neon whales of the Deep Passage. And so the Cyborg PaMs became not a tragedy, but an evolution.</p>
              
              <div className="py-4">
              {/* Album: Pamadeus */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                <div className="flex h-[200px] overflow-hidden">
                  {/* Col 1 — Album cover */}
                  <div className="relative w-[200px] flex-shrink-0 overflow-hidden">
                    <img src="/images/pamadeus-cover.webp" alt="Pamadeus" className="w-full h-full object-cover" />
                  </div>
                  {/* Col 2 — Video */}
                  <div className="relative flex-1 overflow-hidden" style={{ background: "#000" }}>
                    <iframe
                      src="https://player.vimeo.com/video/1116633982?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                  {/* Col 3 — Streaming links */}
                  <div className="flex flex-col justify-center gap-2 w-[130px] flex-shrink-0 px-3 bg-[#0a0a0a] border-l border-white/10">
                    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 mb-1">Stream</p>
                    <a
                      href="https://open.spotify.com/track/67QLyX5kZVIDRmeXhm7asG"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/30 px-2.5 py-2 text-[11px] font-semibold text-[#1DB954] transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Spotify
                    </a>
                    <a
                      href="https://music.apple.com/us/album/pamadeus-feat-monlee-mane-single/1731213435"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-2 text-[11px] font-semibold text-white/80 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      Apple Music
                    </a>
                    <a
                      href="https://youtu.be/MPqwKCoOkds"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#FF0000]/15 hover:bg-[#FF0000]/30 px-2.5 py-2 text-[11px] font-semibold text-red-400 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                      YouTube
                    </a>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCity?.id === 'psyopura' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black">
              <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=psyopura_complex_mqame4&profile=cld-default"
                  width="640"
                  height="360"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                The Psyopuras
              </h2>
              <p className="text-sm md:text-base text-white/80 leading-relaxed">
                The Psyopuras are a matriarchal order who long ago exiled the presence of men from their domain, relegating the few they keep to ceremonial or servile roles. Their continued lineage is sustained through a meticulously engineered “Harvesting Rite” — a ritual in which they draw vital essence from outsiders and refine it through esoteric bio-alchemical arts to ensure only daughters are ever born.
              </p>
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                On the rare occasion a male child emerges, the decree is absolute: he is set adrift upon a tidebound cradle, surrendered to the currents of fate. Many such castaways eventually wash upon the shores of The Nemanyo, shaping that kingdom’s strange population of wanderers and half-orphans.</p>

<p className="text-sm md:text-base text-white/70 leading-relaxed">
Yet even within the Psyopuras, discipline fractures. A clandestine circle composed of thrill-seekers, rulebreakers, and even a few ranking officials, hungers for forbidden chance. Though gambling is a capital crime within Psyopura law, these dissidents found escape in a covert digital refuge of their own making: <a href="https://bagsbro.io/ballers" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">The Bagaverse</a>, a pixel-woven dreamspace where consciousness can detach from flesh and indulge freely in games of risk, identity, and reinvention. </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
In this simulated sanctuary, some Psyopuras even toy with the roles they were taught to despise, exploring avatars coded with masculine traits - an expression both rebellious and taboo, whispered about only as “The Shadow Gamble.”
              </p>
            </div>
          </div>
        </div>
      )}

{activeCity?.id === 'nemanyo' && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Close button */}
      <button
        onClick={closeModal}
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Video */}
      <div className="w-full bg-black">
        <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
          <iframe
            src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=nemanyo_kingdom_wikgtx&profile=cld-default"
            width="640"
            height="360"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder={0}
          />
        </div>
      </div>

      {/* Story / continuation area */}
      <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
        <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-cyan-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">
          The Nemanyo Kingdom
        </h2>
        <p className="text-sm md:text-base text-white/80 leading-relaxed">
          {/* TODO: replace with real Nemanyo lore */}
     Queen Suraya and King Jamari rule the ancient civilization of Nemanyo, a people whose very lifeforce flows in symbiosis with water. Their magic is sustained by a thirty-thousand-year-old Celestial Lotus, an extraterrestrial blossom carried to Earth by their ancestors and tended with reverence across countless generations.
        </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
From this living relic, Suraya and Jamari draw their royal power — an intimate, radiant bond that allows them to bend tides, heal deepwater currents, and commune with the ocean itself.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
<b>But envy breeds conquest. </b>

Across the horizon rose The Czar of Chezidak, a ruthless warlord commanding an army forged in steel, greed, and scorched lands. Fascinated and threatened by the Nemanyo’s ancient source of power, the Czar launched a brutal siege upon their peaceful kingdom.
              </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
His forces stormed the shimmering waterways of Nemanyo, capturing thousands of citizens and dragging the young king and queen before roaring crowds, using them as sport and spectacle.</p>
       <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-sky-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
          Escape from Tyranny
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Suraya and Jamari managed a daring escape, an act that infuriated the Czar. In his wrath, he unleashed the full might of his militant horde upon their homeland. The once-luminous city of Nemanyo was shattered, collapsing into the ocean’s depths.
              </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Amid the carnage, the Czar seized the sacred Lotus and enslaved countless Nemanyo, forcing them into twisted automaton-like servitude as he harnessed the flower’s cosmic power to accelerate his empire’s technology and extend his dominion.
</p>
 <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
          Uprising
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Deep under the rubble, Suraya and Jamari lay motionless, until the ocean answered their suffering.

The spirit of the sea, ancient and omnipresent, enveloped the fallen rulers in a protective womb of current and light. Over days, then weeks, it restored them —mending bone and breath, rekindling the royal bond between Lotus and lineage.
              </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
When the two finally rose from the abyss, they were changed: strengthened, sharpened, and bound to the waters in ways no Nemanyo had ever been. And somewhere across the world, the Lotus pulsed, sending out a soft, sorrowful distress call only its rightful guardians could hear.
              </p>
       <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-violet-300 via-fuchsia-200 to-pink-300 bg-clip-text text-transparent">
          The Road to Chezidak
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Following that luminous signal, Queen Suraya and King Jamari emerged onto the hostile shores of The Land of Chezidak. Their kingdom lay in ruins. Their people had been twisted into mechanized slaves. Their sacred Lotus, the heart of their civilization, had been weaponized by their tyrant foe.

But the ocean had restored them for a reason.
              </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Now, they walk into enemy lands not as victims, but as avatars of rebirth, determined to reclaim their power, free their stolen people, and bring the wrath of Nemanyo’s tides upon the empire that sought to destroy them.
              </p>
              {/* Black Champagne feat. Osirika & The Bag Lord */}
              <div className="py-4">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-2">Featured Track</p>
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-sm font-bold text-white/90">Black Champagne <span className="text-white/50 font-normal">feat. Osirika &amp; The Bag Lord</span></p>
                  </div>
                  <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src="https://player.vimeo.com/video/409286436?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                </div>
              </div>
      </div>
    </div>
  </div>
)}

{activeCity?.id === 'chezidakian' && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      {/* Close button */}
      <button
        onClick={closeModal}
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Video */}
      <div className="w-full bg-black">
        <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
          <iframe
            src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=chezidakian_empire_u5ibn9&profile=cld-default"
            width="640"
            height="360"
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            frameBorder={0}
          />
        </div>
      </div>

      {/* Story / continuation area */}
      <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
        <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-amber-300 via-orange-200 to-red-300 bg-clip-text text-transparent">
          The Chezidakian Empire
        </h2>
        <p className="text-sm md:text-base text-white/80 leading-relaxed">
          {/* TODO: replace with real Nemanyo lore */}
          Long before he was feared as the Czar of Chezidak, he was simply a newborn — a child born to a young Psyopura who broke the silence of her order with forbidden love. But, the Psyopura code is absolute: no male may remain among them.
        </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
When her son came into the world, the young mother held him with the fierce tenderness of someone who already knew she could not keep him. Despite every instinct screaming to defy the ancient laws, she watched as her elders prepared the ceremonial raft — a tidebound cradle meant to carry male infants away into fate’s open hands.
              </p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
As waves swallowed the horizon, she felt her heart cleave in two.
She whispered a final blessing.
And her child drifted into a world that did not yet know his name.
</p>
  <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent">
          The Shores of The Nemanyo
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
By the grace of the ocean currents, the child survived. He washed ashore in the shimmering realm of The Nemanyo, where the people gifted with the Lotus-born symbiosis of water, found him and raised him as one of their own.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
He grew up surrounded by kindness, magic, and the flowing serenity of Nemanyo culture. But the kingdom was undergoing a great internal shift. A growing influx of refugees from distant lands began stirring tension, shaping a cultural rift that teetered toward civil war.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
When the crisis peaked, the ruling council made a harsh decree: <br />

<b>All outsiders must be cast out. <br />
Even the child who had never known another home.</b>
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
The boy — quiet, curious, and beloved by many, was expelled with the rest. For the second time in his life, the ocean took him away.
</p>
  <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-red-300 via-orange-200 to-amber-300 bg-clip-text text-transparent">
          The Rise of a Tyrant
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
He washed up not on a shore of refuge, but in a wasteland — a barren, wind-scoured land with no name, no people, and no hearth. Here, bitterness took root.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
In the desolation he found clarity:
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
<b>If no kingdom would claim him, <br />
he would build one of his own. <br />
And it would eclipse them all. </b> <br />
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
He carved a stronghold from stone and scrap, drawing wanderers, exiles, and zealots to his cause. Through cunning, intellect, and unwavering resolve, he forged an empire from nothing.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Thus was born Chezidak — a land of militant discipline, relentless expansion, and unbreakable loyalty to the boy who had once been left to die.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Now a grown man, hardened by loss and sharpened by resentment, he crowned himself <b>Czar</b>.
</p>
  <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-fuchsia-300 via-pink-200 to-rose-300 bg-clip-text text-transparent">
          The Seed of Revenge
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
Though his empire flourished, one wound never closed — the memory of The Nemanyo turning him away in their hour of fear.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
When he learned the truth of his origin, that he was a Psyopuran castaway, something inside him snapped into focus. Two worlds had abandoned him. Neither had paid for it.
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
And the Celestial Lotus, the living heart of Nemanyo’s magic, became the symbol of everything he was denied:
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
<b>Belonging. Power. Heritage. Destiny.</b>
</p>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
He vowed to claim it - not merely to wield its power, but to prove that no nation, no lineage, no ancient tradition
could decide his worth again.
</p>
  <h2 className="text-xl md:text-1xl font-extrabold bg-gradient-to-r from-rose-300 via-red-200 to-orange-300 bg-clip-text text-transparent">
          Thus the Czar of Chezidak marched east...
        </h2>
<p className="text-sm md:text-base text-white/70 leading-relaxed">
toward Nemanyo, <br />
toward the Lotus,<br />
toward vengeance long fermented.
</p>
              {/* Black Champagne feat. Osirika & The Bag Lord */}
              <div className="py-4">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/30 mb-2">Featured Track</p>
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-sm font-bold text-white/90">Black Champagne <span className="text-white/50 font-normal">feat. Osirika &amp; The Bag Lord</span></p>
                  </div>
                  <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src="https://player.vimeo.com/video/409286436?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                </div>
              </div>
      </div>
    </div>
  </div>
)}

{activeCity?.id === 'ciphons' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black">
              <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=Ciphons_fo0b9k&profile=cld-default"
                  width="640"
                  height="360"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                The Ciphons
              </h2>
            </div>
          </div>
        </div>
      )}

      {activeCity?.id === 'pamlovian-islands' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black">
              <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=Pineapples_rddpob&profile=cld-default"
                  width="640"
                  height="360"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
              <h2 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-lime-300 to-emerald-300 bg-clip-text text-transparent">
                The Pineapple Gardens
              </h2>
              
              <div className="py-4">
              {/* Album: Too High */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,.6)] bg-black">
                <div className="flex h-[200px] overflow-hidden">
                  {/* Col 1 — Album cover */}
                  <div className="relative w-[200px] flex-shrink-0 overflow-hidden">
                    <img src="/images/too-high.png" alt="Too High" className="w-full h-full object-cover" />
                  </div>
                  {/* Col 2 — Video */}
                  <div className="relative flex-1 overflow-hidden" style={{ background: "#000" }}>
                    <iframe
                      src="https://player.vimeo.com/video/1124127671?badge=0&autopause=0&player_id=0&app_id=58479"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 0, background: '#000' }}
                    />
                  </div>
                  {/* Col 3 — Streaming links */}
                  <div className="flex flex-col justify-center gap-2 w-[130px] flex-shrink-0 px-3 bg-[#0a0a0a] border-l border-white/10">
                    <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-white/30 mb-1">Stream</p>
                    <a
                      href="https://open.spotify.com/track/6GO8AdNUeXktaI56mlhfSA"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#1DB954]/15 hover:bg-[#1DB954]/30 px-2.5 py-2 text-[11px] font-semibold text-[#1DB954] transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                      Spotify
                    </a>
                    <a
                      href="https://music.apple.com/us/album/too-high-feat-monlee-mane-single/1726100209"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-2 text-[11px] font-semibold text-white/80 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                      Apple Music
                    </a>
                    <a
                      href="https://youtu.be/8bo78kc1iBE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-[#FF0000]/15 hover:bg-[#FF0000]/30 px-2.5 py-2 text-[11px] font-semibold text-red-400 transition"
                    >
                      <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
                      YouTube
                    </a>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeCity?.id === 'catatonia' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-[#050814] rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black/80 hover:text-white transition"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="w-full bg-black">
              <div className="w-full" style={{ aspectRatio: '640 / 360' }}>
                <iframe
                  src="https://player.cloudinary.com/embed/?cloud_name=djola8t4j&public_id=Catatonia_aqvh1g&profile=cld-default"
                  width="640"
                  height="360"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  allowFullScreen
                  frameBorder={0}
                />
              </div>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex flex-col gap-3 flex-1 min-h-0">
              <h2 className="text-xl md:text-2xl font-bold text-white">
                The Caves of Catatonia
              </h2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
