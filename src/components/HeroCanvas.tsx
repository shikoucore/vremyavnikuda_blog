import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 35);

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'low-power'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create 3D Cube wireframe
    const cubeSize = 15;
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry);
    const cubeMaterial = new THREE.LineBasicMaterial({ 
      color: 0x0ea5e9, 
      transparent: true,
      opacity: 0.4
    });
    const cube = new THREE.LineSegments(cubeEdges, cubeMaterial);
    scene.add(cube);

    // Create grid planes (memory layers)
    const gridGroup = new THREE.Group();
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const gridHelper = new THREE.GridHelper(cubeSize, 8, 0x0ea5e9, 0x0ea5e9);
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.15;
      gridHelper.position.y = -cubeSize/2 + (i * cubeSize/(layers-1));
      gridHelper.rotation.y = Math.PI / 4;
      gridGroup.add(gridHelper);
    }
    scene.add(gridGroup);

    // Particles inside cube (memory blocks)
    const particleCount = window.innerWidth < 768 ? 40 : 80;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cubeHalf = cubeSize / 2 - 1;
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * (cubeSize - 2);
      positions[i + 1] = (Math.random() - 0.5) * (cubeSize - 2);
      positions[i + 2] = (Math.random() - 0.5) * (cubeSize - 2);
      
      velocities[i] = (Math.random() - 0.5) * 0.03;
      velocities[i + 1] = (Math.random() - 0.5) * 0.03;
      velocities[i + 2] = (Math.random() - 0.5) * 0.03;

      // Color coding: green (heap), cyan (stack), yellow (active)
      const rand = Math.random();
      if (rand < 0.6) {
        colors[i] = 0.06; colors[i + 1] = 0.65; colors[i + 2] = 0.91; // cyan
      } else if (rand < 0.85) {
        colors[i] = 0.06; colors[i + 1] = 0.73; colors[i + 2] = 0.51; // green
      } else {
        colors[i] = 0.98; colors[i + 1] = 0.75; colors[i + 2] = 0.14; // yellow
      }
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: window.innerWidth < 768 ? 2.5 : 3,
      transparent: true,
      opacity: 0.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Connection lines (pointers)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.2,
    });

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    let time = 0;

    // Mouse move handler
    const handleMouseMove = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    function animate(currentTime: number) {
      frameIdRef.current = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime;
      time += 0.01;

      // Rotate cube slowly
      cube.rotation.x = Math.sin(time * 0.3) * 0.2 + mouseRef.current.y * 0.3;
      cube.rotation.y += 0.003;
      cube.rotation.z = Math.cos(time * 0.2) * 0.1 + mouseRef.current.x * 0.2;

      // Rotate grid layers
      gridGroup.rotation.x = cube.rotation.x;
      gridGroup.rotation.y = cube.rotation.y;
      gridGroup.rotation.z = cube.rotation.z;

      // Update particles
      const positionAttribute = particles.geometry.attributes.position;
      if (!positionAttribute) return;
      
      const positions = positionAttribute.array as Float32Array;
      const cubeHalf = cubeSize / 2 - 0.5;

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
        
        // Bounce inside cube
        if (Math.abs(px + vx) > cubeHalf) velocities[i] = vx * -1;
        if (Math.abs(py + vy) > cubeHalf) velocities[i + 1] = vy * -1;
        if (Math.abs(pz + vz) > cubeHalf) velocities[i + 2] = vz * -1;
      }

      if (positionAttribute) {
        positionAttribute.needsUpdate = true;
      }

      // Create connection lines (pointers between memory blocks)
      const linePositions: number[] = [];
      const maxConnections = window.innerWidth < 768 ? 20 : 40;
      let connectionCount = 0;

      for (let i = 0; i < positions.length && connectionCount < maxConnections; i += 3) {
        for (let j = i + 3; j < positions.length && connectionCount < maxConnections; j += 3) {
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

          if (distance < 6) {
            linePositions.push(px1, py1, pz1);
            linePositions.push(px2, py2, pz2);
            connectionCount++;
          }
        }
      }

      // Remove old lines
      const oldLines = scene.children.filter(child => child.type === 'LineSegments' && child !== cube);
      oldLines.forEach(line => scene.remove(line));
      
      // Add new lines
      if (linePositions.length > 0) {
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lines);
      }

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
      window.removeEventListener('mousemove', handleMouseMove);
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
