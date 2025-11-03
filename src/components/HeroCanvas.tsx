import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: false,
      powerPreference: 'low-power'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const particleCount = window.innerWidth < 768 ? 50 : 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 50;
      positions[i + 1] = (Math.random() - 0.5) * 50;
      positions[i + 2] = (Math.random() - 0.5) * 50;
      
      velocities[i] = (Math.random() - 0.5) * 0.02;
      velocities[i + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i + 2] = (Math.random() - 0.5) * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x0ea5e9,
      size: 2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.1,
    });

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    function animate(currentTime: number) {
      frameIdRef.current = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime;

      const positionAttribute = particles.geometry.attributes.position;
      if (!positionAttribute) return;
      
      const positions = positionAttribute.array as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        const vx = velocities[i];
        const vy = velocities[i + 1];
        const vz = velocities[i + 2];
        const px = positions[i];
        const py = positions[i + 1];
        const pz = positions[i + 2];
        
        if (vx === undefined || vy === undefined || vz === undefined ||
            px === undefined || py === undefined || pz === undefined) continue;
        
        positions[i] = px + vx;
        positions[i + 1] = py + vy;
        positions[i + 2] = pz + vz;
        
        if (Math.abs(px + vx) > 25) velocities[i] = vx * -1;
        if (Math.abs(py + vy) > 25) velocities[i + 1] = vy * -1;
        if (Math.abs(pz + vz) > 25) velocities[i + 2] = vz * -1;
      }

      if (positionAttribute) {
        positionAttribute.needsUpdate = true;
      }

      const linePositions: number[] = [];
      for (let i = 0; i < positions.length; i += 3) {
        for (let j = i + 3; j < positions.length; j += 3) {
          const px1 = positions[i];
          const py1 = positions[i + 1];
          const pz1 = positions[i + 2];
          const px2 = positions[j];
          const py2 = positions[j + 1];
          const pz2 = positions[j + 2];
          
          if (px1 === undefined || py1 === undefined || pz1 === undefined ||
              px2 === undefined || py2 === undefined || pz2 === undefined) continue;
          
          const dx = px1 - px2;
          const dy = py1 - py2;
          const dz = pz1 - pz2;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (distance < 10) {
            linePositions.push(px1, py1, pz1);
            linePositions.push(px2, py2, pz2);
          }
        }
      }

      scene.remove(scene.children.find(child => child.type === 'Line') as THREE.Object3D);
      
      if (linePositions.length > 0) {
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lines);
      }

      particles.rotation.y += 0.001;
      renderer.render(scene, camera);
    }

    animate(0);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
