// Developed By Amin Madani
/**
 * 3D Engine for Aghdas Mathematical Presentation
 * Precision tetrahedral geometry, solid modular cube packing,
 * and 4-copy spatial assembly with Three.js.
 */

class Aghdas3DVisualizer {
  constructor(containerId, mode = 'single') {
    this.container = document.getElementById(containerId);
    this.mode = mode; // 'single' (Slide 4) or 'four-copies' (Slide 5)
    this.animationId = null;
    this.cubes = [];
    this.copyGroups = [];
    this.isAutoRotating = true;
    this.currentExplode = 0;
    this.targetExplode = 0;
    this.currentMerge = 0;
    this.targetMerge = 0;

    // Mathematical parameters for precision regular tetrahedron
    // Edge length E = 2.8, with cubeSize = 0.88 giving a clean 0.26 unit air gap between all cubes
    const E = 2.8;
    this.edgeLength = E;
    this.cubeSize = 0.88; // Pristine clear spacing, eliminating any interpenetration

    const H = E * Math.sqrt(2 / 3);       // Total height ≈ 2.286
    const R = E * Math.sqrt(3 / 8);       // Circumradius from centroid to apex ≈ 1.715
    const r = H - R;                      // Distance to base plane ≈ 0.571
    const Rbase = E / Math.sqrt(3);       // Base circumradius ≈ 1.617

    // 4 Vertices of regular tetrahedron centered at (0, 0, 0)
    this.vertices = [
      new THREE.Vector3(0, R, 0),                                       // V0: Apex (Top)
      new THREE.Vector3(Rbase, -r, 0),                                  // V1: Base Corner 1 (Front-Right)
      new THREE.Vector3(-Rbase / 2, -r, Rbase * (Math.sqrt(3) / 2)),    // V2: Base Corner 2 (Back-Left)
      new THREE.Vector3(-Rbase / 2, -r, -Rbase * (Math.sqrt(3) / 2))   // V3: Base Corner 3 (Back-Right)
    ];

    // Normalized direction vectors from center (0,0,0) toward each vertex
    this.directions = this.vertices.map(v => v.clone().normalize());

    // 10 Barycentric integer coordinates for n=3 (a + b + c + d = 2)
    this.barycentricCoords = [];
    for (let a = 2; a >= 0; a--) {
      for (let b = 2 - a; b >= 0; b--) {
        for (let c = 2 - a - b; c >= 0; c--) {
          const d = 2 - a - b - c;
          this.barycentricCoords.push({ a, b, c, d });
        }
      }
    }

    this.initScene();
    this.createStudioLighting();
    this.createTetrahedralCage();
    this.buildMeshes();
    this.initControls();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfbfbfb);

    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    if (this.mode === 'four-copies') {
      // Elevated 3/4 isometric perspective framing all 4 spatial pyramids with generous clearance
      this.camera.position.set(16.5, 12.0, 17.5);
    } else {
      // Perspective for single pyramid
      this.camera.position.set(7.8, 5.2, 9.2);
    }

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  createStudioLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.82);
    this.scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(14, 20, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xf0fdf4, 0.45);
    fillLight.position.set(-14, -4, -14);
    this.scene.add(fillLight);

    // Floor Contact Shadow Plane
    const shadowPlaneGeo = new THREE.PlaneGeometry(40, 40);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.07 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -3.2;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);
  }

  createTetrahedralCage() {
    const cageGroup = new THREE.Group();
    const cageMaterial = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.22,
      gapSize: 0.16,
      linewidth: 1.5
    });

    const edges = [
      [0, 1], [0, 2], [0, 3],
      [1, 2], [2, 3], [3, 1]
    ];

    edges.forEach(([i, j]) => {
      const p1 = this.vertices[i].clone().multiplyScalar(1.28);
      const p2 = this.vertices[j].clone().multiplyScalar(1.28);
      const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const line = new THREE.Line(geo, cageMaterial);
      line.computeLineDistances();
      cageGroup.add(line);
    });

    // Subtle small vertex markers
    const sphereGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.1
    });

    this.vertices.forEach(v => {
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(v.clone().multiplyScalar(1.28));
      cageGroup.add(sphere);
    });

    this.scene.add(cageGroup);
  }

  initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 35;
    this.controls.minDistance = 3.5;
    this.controls.target.set(0, 0.1, 0);

    this.controls.addEventListener('start', () => {
      this.isAutoRotating = false;
    });
  }

  /**
   * Crisp high-resolution cube face badge with Font Yas
   */
  createNumberTexture(number, ringColor, bgColor = '#ffffff', textColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Clean face base
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 512);

    // Inset border
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 22;
    ctx.strokeRect(18, 18, 476, 476);

    // Solid circular insignia
    ctx.fillStyle = ringColor;
    ctx.beginPath();
    ctx.arc(256, 256, 172, 0, Math.PI * 2);
    ctx.fill();

    // Persian numeral in Font Yas
    ctx.fillStyle = textColor;
    ctx.font = '700 240px Yas, Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const pNumber = String(number).split('').map(c => persianDigits[parseInt(c)] || c).join('');
    // Slight vertical optical alignment for Persian glyphs
    ctx.fillText(pNumber, 256, 268);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    return texture;
  }

  getCartesianPosition(a, b, c, d) {
    const v0 = this.vertices[0];
    const v1 = this.vertices[1];
    const v2 = this.vertices[2];
    const v3 = this.vertices[3];

    const pos = new THREE.Vector3();
    pos.addScaledVector(v0, a / 2);
    pos.addScaledVector(v1, b / 2);
    pos.addScaledVector(v2, c / 2);
    pos.addScaledVector(v3, d / 2);
    return pos;
  }

  buildMeshes() {
    if (this.mode === 'single') {
      this.buildSingleTetrahedron();
    } else {
      this.buildFourCopies();
    }
  }

  buildSingleTetrahedron() {
    this.cubes = [];
    const cubeGeo = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
    const edgeGeo = new THREE.EdgesGeometry(cubeGeo);

    // Slide 4: 1 Top cube (3), 3 Middle cubes (2), 6 Bottom cubes (1)
    const layerColors = [
      { num: 1, ring: '#0284c7', base: 0xf0f9ff, wire: 0x0369a1 }, // Layer 0 (Bottom): 6 cubes
      { num: 2, ring: '#059669', base: 0xecfdf5, wire: 0x047857 }, // Layer 1 (Middle): 3 cubes
      { num: 3, ring: '#d97706', base: 0xfffbeb, wire: 0xb45309 }  // Layer 2 (Top apex): 1 cube
    ];

    this.barycentricCoords.forEach(coord => {
      const { a, b, c, d } = coord;
      const layer = a; // 0, 1, or 2
      const cfg = layerColors[layer];
      const pos = this.getCartesianPosition(a, b, c, d);

      const texture = this.createNumberTexture(cfg.num, cfg.ring, '#ffffff');
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.base,
        roughness: 0.24,
        metalness: 0.04,
        map: texture,
        transparent: false
      });

      const mesh = new THREE.Mesh(cubeGeo, mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Dark clean edge outlines
      const lineMat = new THREE.LineBasicMaterial({ color: cfg.wire, linewidth: 2 });
      const wireframe = new THREE.LineSegments(edgeGeo, lineMat);
      mesh.add(wireframe);

      mesh.userData = {
        basePos: pos.clone(),
        layer: layer,
        number: cfg.num
      };

      this.scene.add(mesh);
      this.cubes.push(mesh);
    });
  }

  buildFourCopies() {
    this.copyGroups = [];
    const cubeGeo = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
    const edgeGeo = new THREE.EdgesGeometry(cubeGeo);

    // 4 High-Contrast Vibrant Themes for the 4 Pyramids
    const themes = [
      { name: 'کپی ۱ (رأس بالا)', ring: '#d97706', base: 0xfffbeb, wire: 0xb45309 }, // Gold Amber
      { name: 'کپی ۲ (رأس راست)', ring: '#0284c7', base: 0xf0f9ff, wire: 0x0369a1 }, // Cobalt Blue
      { name: 'کپی ۳ (رأس چپ)',  ring: '#059669', base: 0xecfdf5, wire: 0x047857 }, // Emerald Green
      { name: 'کپی ۴ (رأس عقب)', ring: '#dc2626', base: 0xfef2f2, wire: 0xb91c1c }  // Ruby Red
    ];

    // Texture cache for the magical sum 6 (merged state)
    this.mergedTexture = this.createNumberTexture(6, '#059669', '#ffffff');

    // Generous radial explosion distance: each pyramid floats cleanly in its own quadrant of space
    this.maxExplodeDistance = 5.6;

    for (let k = 0; k < 4; k++) {
      const group = new THREE.Group();
      const theme = themes[k];
      const dirVector = this.directions[k].clone();

      this.barycentricCoords.forEach(coord => {
        const { a, b, c, d } = coord;
        const pos = this.getCartesianPosition(a, b, c, d);

        // Aghdas value assignment for Copy k
        const vals = [a + 1, b + 1, c + 1, d + 1];
        const val = vals[k];

        const originalTexture = this.createNumberTexture(val, theme.ring, '#ffffff');
        const mat = new THREE.MeshStandardMaterial({
          color: theme.base,
          roughness: 0.24,
          metalness: 0.04,
          map: originalTexture,
          transparent: false
        });

        const mesh = new THREE.Mesh(cubeGeo, mat);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const lineMat = new THREE.LineBasicMaterial({ color: theme.wire, linewidth: 2 });
        const wireframe = new THREE.LineSegments(edgeGeo, lineMat);
        mesh.add(wireframe);

        mesh.userData = {
          basePos: pos.clone(),
          val: val,
          originalTexture: originalTexture
        };

        group.add(mesh);
      });

      // Position group outward along its tetrahedral symmetry axis
      const initialPos = dirVector.clone().multiplyScalar(this.maxExplodeDistance);
      group.position.copy(initialPos);

      group.userData = {
        dirVector: dirVector,
        theme: theme,
        index: k
      };

      this.scene.add(group);
      this.copyGroups.push(group);
    }
  }

  setLayerExplode(targetFactor) {
    this.targetExplode = Math.max(0, Math.min(1, targetFactor));
  }

  setAssembleProgress(targetFactor) {
    this.targetMerge = Math.max(0, Math.min(1, targetFactor));
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  resetCamera() {
    if (this.mode === 'four-copies') {
      this.camera.position.set(16.5, 12.0, 17.5);
    } else {
      this.camera.position.set(7.8, 5.2, 9.2);
    }
    this.controls.target.set(0, 0.1, 0);
    this.isAutoRotating = true;
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Smooth spring/lerp for layer explosion in Slide 4
    if (this.mode === 'single' && this.cubes.length > 0) {
      this.currentExplode += (this.targetExplode - this.currentExplode) * 0.12;
      this.cubes.forEach(cube => {
        const layer = cube.userData.layer; // 0 (bottom), 1 (middle), 2 (top)
        const p = cube.userData.basePos.clone();
        p.y += layer * this.currentExplode * 1.55;
        cube.position.copy(p);
      });
    }

    // Smooth assembly for 4 copies in Slide 5
    if (this.mode === 'four-copies' && this.copyGroups.length > 0) {
      this.currentMerge += (this.targetMerge - this.currentMerge) * 0.12;
      
      const mergeFactor = this.currentMerge;
      const dist = (1.0 - mergeFactor) * this.maxExplodeDistance;
      const isFullyMerged = mergeFactor > 0.93;

      this.copyGroups.forEach((group, idx) => {
        const dir = group.userData.dirVector;
        group.position.copy(dir.clone().multiplyScalar(dist));

        if (isFullyMerged) {
          // When fully assembled in center: Group 0 becomes the single active master pyramid showing 6
          if (idx === 0) {
            group.visible = true;
            group.children.forEach(mesh => {
              if (mesh.material.map !== this.mergedTexture) {
                mesh.material.map = this.mergedTexture;
                mesh.material.color.setHex(0xecfdf5); // Crisp emerald tint
                mesh.material.needsUpdate = true;
              }
            });
          } else {
            // Hide other copies to completely eliminate GPU Z-fighting / visual clutter
            group.visible = false;
          }
        } else {
          // In separated or transitioning state: All 4 pyramids are fully visible with their distinct colors
          group.visible = true;
          group.children.forEach(mesh => {
            if (mesh.material.map !== mesh.userData.originalTexture) {
              mesh.material.map = mesh.userData.originalTexture;
              mesh.material.color.setHex(group.userData.theme.base);
              mesh.material.needsUpdate = true;
            }
          });
        }
      });
    }

    // Subtle turntable rotation
    if (this.isAutoRotating) {
      this.scene.rotation.y += 0.0035;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) this.renderer.domElement.remove();
  }
}

/**
 * ==========================================================================
 * CHAND-PELLEH (STAIRCASE & TRIANGULAR NUMBERS) 3D VISUALIZER
 * Enhanced Step-by-Step Pedagogical Engine:
 * Step 1: 1-Pelleh (1 cube: T1 = 1)
 * Step 2: 2-Pelleh (1 + 2 = 3 cubes: T2 = 3)
 * Step 3: 3-Pelleh (1 + 2 + 3 = 6 cubes: T3 = 6)
 * Step 4: 4-Pelleh (1 + 2 + 3 + 4 = 10 cubes: T4 = 10)
 * Step 5: Gauss Proof (2 copies interlocking into 4x5 rectangle: 2*T4 = 20 => T4 = 10)
 * Step 6: 3D Stacking (Vertical morphing into Aghdas's tetrahedral pyramid layers!)
 * ==========================================================================
 */
class ChandPellehVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.animationId = null;
    this.isAutoRotating = true;
    this.currentStep = 1;
    this.targetGroupPos = new THREE.Vector3(0, 0, 0);
    this.currentGroupPos = new THREE.Vector3(0, 0, 0);

    this.initScene();
    this.createLights();
    this.buildMeshes();
    this.initControls();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfcfcfc);

    const width = this.container.clientWidth || 550;
    const height = this.container.clientHeight || 400;

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    this.camera.position.set(6.8, 5.4, 7.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.88));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(12, 16, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 0.5);
    fillLight.position.set(-10, -5, -8);
    this.scene.add(fillLight);
  }

  buildMeshes() {
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    this.cubeSize = 0.82;
    this.gap = 0.92;
    const boxGeo = new THREE.BoxGeometry(this.cubeSize, this.cubeSize, this.cubeSize);
    const edgeGeo = new THREE.EdgesGeometry(boxGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.32 });

    // Pedestal Platform Floor with subtle grid attached to pyramidGroup
    const platformGeo = new THREE.BoxGeometry(7.2, 0.22, 7.2);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.08 });
    this.platform = new THREE.Mesh(platformGeo, platformMat);
    this.platform.position.set(0.5, -1.62, 0.5);
    this.platform.receiveShadow = true;

    this.gridHelper = new THREE.GridHelper(6.8, 8, 0x94a3b8, 0xcbd5e1);
    this.gridHelper.position.set(0.5, -1.505, 0.5);

    // Primary group containing platform and all 3D cubes
    this.pyramidGroup = new THREE.Group();
    this.pyramidGroup.add(this.platform);
    this.pyramidGroup.add(this.gridHelper);
    this.mainGroup.add(this.pyramidGroup);

    // 4 Layers (k=1 at top to k=4 at base)
    // T1=1, T2=3, T3=6, T4=10 cubes. Total = 20 cubes.
    const layerColors = [0x0284c7, 0x059669, 0xd97706, 0x6366f1]; // Sky, Emerald, Amber, Indigo

    this.allCubes = [];
    this.cubesByLayer = [[], [], [], []];

    for (let k = 1; k <= 4; k++) {
      const layerIndex = k - 1;
      const color = layerColors[layerIndex];
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.25,
        metalness: 0.1
      });

      // Layer height: top layer k=1 is at y=3, base k=4 is at y=0
      const layerY = 4 - k;

      // Triangular footprint: i >= 0, j >= 0, i + j <= k - 1
      for (let i = 0; i < k; i++) {
        for (let j = 0; j <= k - 1 - i; j++) {
          const mesh = new THREE.Mesh(boxGeo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

          // Base positions centered nicely around origin
          const posX = (i - 0.8) * this.gap;
          const posY = (layerY - 1.2) * this.gap;
          const posZ = (j - 0.8) * this.gap;

          mesh.position.set(posX, posY, posZ);

          const isInitialVisible = (k === 1);
          mesh.visible = isInitialVisible;
          mesh.scale.set(isInitialVisible ? 1.0 : 0.001, isInitialVisible ? 1.0 : 0.001, isInitialVisible ? 1.0 : 0.001);

          mesh.userData = {
            basePos: new THREE.Vector3(posX, posY, posZ),
            layerIndex: layerIndex,
            k: k,
            i: i,
            j: j,
            targetScale: isInitialVisible ? 1.0 : 0.0,
            currentScale: isInitialVisible ? 1.0 : 0.0,
            targetYOffset: 0.0,
            currentYOffset: 0.0
          };

          this.pyramidGroup.add(mesh);
          this.allCubes.push(mesh);
          this.cubesByLayer[layerIndex].push(mesh);
        }
      }
    }
  }

  setStep(step) {
    this.currentStep = step;
    if (step >= 1 && step <= 4) {
      // Step 1..4: Reveal layers up to step
      // Ground the lowest active layer to the floor by shifting down by (4 - step) * gap
      const groundShiftY = -(4 - step) * this.gap;
      this.allCubes.forEach(mesh => {
        const isActive = mesh.userData.k <= step;
        mesh.userData.targetScale = isActive ? 1.0 : 0.0;
        mesh.userData.targetYOffset = groundShiftY;
        if (!isActive && mesh.userData.currentScale < 0.05) {
          mesh.visible = false;
        } else {
          mesh.visible = true;
        }
      });

      // Centering offset for small vs large shapes
      const centers = {
        1: { x: 0.6, y: 0.0, z: 0.6 },
        2: { x: 0.3, y: 0.0, z: 0.3 },
        3: { x: 0.0, y: 0.0, z: 0.0 },
        4: { x: -0.2, y: 0.0, z: -0.2 }
      };
      if (centers[step]) {
        this.targetGroupPos.set(centers[step].x, centers[step].y, centers[step].z);
      }
    } else if (step === 5) {
      // Step 5: Exploded layers view (vertical upward explosion, bottom layer stays on floor!)
      // Layer 1 (top): +2.4, Layer 2: +1.6, Layer 3: +0.8, Layer 4 (base): 0.0
      const explodeYOffsets = [2.4, 1.6, 0.8, 0.0];
      this.allCubes.forEach(mesh => {
        mesh.userData.targetScale = 1.0;
        mesh.visible = true;
        mesh.userData.targetYOffset = explodeYOffsets[mesh.userData.layerIndex] || 0.0;
      });
      // Lower group slightly to center the whole exploded stack with comfortable headroom
      this.targetGroupPos.set(-0.2, -0.7, -0.2);
    } else if (step === 6) {
      // Step 6: Full assembled pyramid with Aghdas connection
      this.allCubes.forEach(mesh => {
        mesh.userData.targetScale = 1.0;
        mesh.visible = true;
        mesh.userData.targetYOffset = 0.0;
      });
      this.targetGroupPos.set(-0.2, 0.0, -0.2);
    }
  }

  setMode(mode) {
    if (mode === 'explode') {
      this.setStep(5);
    } else if (mode === 'full') {
      this.setStep(6);
    } else {
      this.setStep(4);
    }
  }

  initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 25;
    this.controls.minDistance = 3;
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  resetCamera() {
    this.camera.position.set(6.8, 5.4, 7.2);
    this.controls.target.set(0, 0, 0);
    this.mainGroup.rotation.set(0, 0, 0);
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Group position smooth centering lerp
    this.currentGroupPos.lerp(this.targetGroupPos, 0.12);
    if (this.pyramidGroup) {
      this.pyramidGroup.position.copy(this.currentGroupPos);
    }

    // Lerp cube scale and vertical explosion offset
    if (this.allCubes) {
      this.allCubes.forEach(mesh => {
        if (!mesh.userData) return;

        // Scale lerp
        const ts = mesh.userData.targetScale;
        mesh.userData.currentScale += (ts - mesh.userData.currentScale) * 0.16;
        const s = mesh.userData.currentScale;
        if (s <= 0.03) {
          mesh.visible = false;
          mesh.scale.set(0.001, 0.001, 0.001);
        } else {
          mesh.visible = true;
          mesh.scale.set(s, s, s);
        }

        // Y-offset lerp (for layer explosion in step 5)
        const ty = mesh.userData.targetYOffset || 0.0;
        mesh.userData.currentYOffset += (ty - mesh.userData.currentYOffset) * 0.1;
        const base = mesh.userData.basePos;
        if (base) {
          mesh.position.set(base.x, base.y + mesh.userData.currentYOffset, base.z);
        }
      });
    }

    if (this.isAutoRotating) {
      this.mainGroup.rotation.y += 0.005;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) this.renderer.domElement.remove();
  }
}

/**
 * ==========================================================================
 * SIMPLEX DIMENSIONAL FAMILY 3D STUDIO VISUALIZER
 * Faithful implementation of user's attached simplex diagram and 3D render:
 * - Architectural checkerboard floor with soft shadows
 * - Simultaneous side-by-side family overview:
 *   • 0: Point (Glossy white sphere, 1 vertex)
 *   • 1: Line segment (Sleek white capsule, 2 red vertices)
 *   • 2: Triangle (Translucent red glass face with white edge frame, 3 red vertices)
 *   • 3: Tetrahedron (Translucent red glass 3D pyramid with white edge frames, 4 red vertices)
 * - 4D Pentatope stereographic rotation mode
 * - Cinematic camera lerp for inspecting each dimension
 * ==========================================================================
 */
class SimplexVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.animationId = null;
    this.isAutoRotating = true;
    this.activeDimension = 'all'; // 'all', 0, 1, 2, 3, 4
    this.hyperTime = 0;

    this.studioGroup = new THREE.Group();
    this.pentatopeGroup = new THREE.Group();

    // Camera target interpolation (Framing all 4 simplexes side by side)
    this.targetCameraPos = new THREE.Vector3(0, 5.2, 13.8);
    this.targetControlsTarget = new THREE.Vector3(0, 0.2, 0);
    this.isTransitioningCamera = false;

    // 4D regular pentatope (5 vertices in R^4)
    const s = 1.0;
    const a = 1.0 / Math.sqrt(5);
    this.pentatope4D = [
      new THREE.Vector4( s,  s,  s, -a),
      new THREE.Vector4( s, -s, -s, -a),
      new THREE.Vector4(-s,  s, -s, -a),
      new THREE.Vector4(-s, -s,  s, -a),
      new THREE.Vector4( 0,  0,  0, Math.sqrt(5) - a)
    ];

    this.initScene();
    this.createLights();
    this.buildCheckerboardFloor();
    this.buildSimplexFamilyStudio();
    this.build4DPentatope();
    this.initControls();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6f8fa);

    const width = this.container.clientWidth || 550;
    const height = this.container.clientHeight || 400;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 5.2, 13.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(this.studioGroup);
    this.scene.add(this.pentatopeGroup);
    this.pentatopeGroup.visible = false;
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.88));

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.95);
    mainLight.position.set(10, 18, 12);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.5);
    rimLight.position.set(-10, 8, -10);
    this.scene.add(rimLight);
  }

  createCheckerboardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const tileSize = 64;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        ctx.fillStyle = ((x / tileSize + y / tileSize) % 2 === 0) ? '#1e293b' : '#f8fafc';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }

  buildCheckerboardFloor() {
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createCheckerboardTexture(),
      roughness: 0.18,
      metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    floor.receiveShadow = true;
    this.studioGroup.add(floor);

    // Floor number badges "0", "1", "2", "3" matching reference image
    const createFloorBadge = (text, posX, posZ) => {
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 128;
      badgeCanvas.height = 128;
      const bCtx = badgeCanvas.getContext('2d');
      bCtx.fillStyle = 'rgba(30, 41, 59, 0.85)';
      bCtx.beginPath();
      bCtx.arc(64, 64, 56, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.strokeStyle = '#38bdf8';
      bCtx.lineWidth = 6;
      bCtx.stroke();
      bCtx.fillStyle = '#ffffff';
      bCtx.font = 'bold 64px Outfit, Inter, sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(text, 64, 68);

      const bTex = new THREE.CanvasTexture(badgeCanvas);
      const bGeo = new THREE.PlaneGeometry(0.7, 0.7);
      const bMat = new THREE.MeshBasicMaterial({ map: bTex, transparent: true });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.rotation.x = -Math.PI / 2;
      bMesh.position.set(posX, -1.58, posZ);
      return bMesh;
    };

    this.studioGroup.add(createFloorBadge('0', -4.5, 1.4));
    this.studioGroup.add(createFloorBadge('1', -1.8, 1.4));
    this.studioGroup.add(createFloorBadge('2', 1.2, 1.4));
    this.studioGroup.add(createFloorBadge('3', 4.5, 1.4));

    // Floor label "simplexes"
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const lCtx = labelCanvas.getContext('2d');
    lCtx.fillStyle = '#0284c7';
    lCtx.font = '900 54px Outfit, Inter, sans-serif';
    lCtx.textAlign = 'center';
    lCtx.textBaseline = 'middle';
    lCtx.fillText('simplexes', 256, 64);
    const lTex = new THREE.CanvasTexture(labelCanvas);
    const lGeo = new THREE.PlaneGeometry(3.6, 0.9);
    const lMat = new THREE.MeshBasicMaterial({ map: lTex, transparent: true });
    const lMesh = new THREE.Mesh(lGeo, lMat);
    lMesh.rotation.x = -Math.PI / 2;
    lMesh.position.set(0, -1.58, 2.5);
    this.studioGroup.add(lMesh);
  }

  buildSimplexFamilyStudio() {
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.05 });
    const redVertexMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2, metalness: 0.1 });
    const glassRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.65,
      roughness: 0.15,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    const createVertex = (pos) => {
      const geo = new THREE.SphereGeometry(0.14, 20, 20);
      const sphere = new THREE.Mesh(geo, redVertexMat);
      sphere.position.copy(pos);
      sphere.castShadow = true;
      return sphere;
    };

    const createEdgeTube = (p1, p2, radius = 0.055) => {
      const dist = p1.distanceTo(p2);
      const geo = new THREE.CylinderGeometry(radius, radius, dist, 16);
      const mesh = new THREE.Mesh(geo, whiteMat);
      mesh.castShadow = true;
      const midpoint = p1.clone().add(p2).multiplyScalar(0.5);
      mesh.position.copy(midpoint);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize());
      return mesh;
    };

    // -------------------------------------------------------------
    // 0: Point (0D Simplex - 1 Vertex)
    // -------------------------------------------------------------
    const p0Group = new THREE.Group();
    p0Group.position.set(-4.5, -1.2, 0);

    const pointGeo = new THREE.SphereGeometry(0.36, 32, 32);
    const pointMesh = new THREE.Mesh(pointGeo, whiteMat);
    pointMesh.castShadow = true;
    p0Group.add(pointMesh);

    // Red dot on top
    const dotGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const dotMesh = new THREE.Mesh(dotGeo, redVertexMat);
    dotMesh.position.set(0, 0.38, 0);
    p0Group.add(dotMesh);

    this.studioGroup.add(p0Group);

    // -------------------------------------------------------------
    // 1: Line Segment (1D Simplex - 2 Vertices)
    // -------------------------------------------------------------
    const p1Group = new THREE.Group();
    p1Group.position.set(-1.8, -0.6, 0);

    const v1_a = new THREE.Vector3(-0.9, -0.7, 0);
    const v1_b = new THREE.Vector3(0.9, 0.7, 0);

    p1Group.add(createEdgeTube(v1_a, v1_b, 0.08));
    p1Group.add(createVertex(v1_a));
    p1Group.add(createVertex(v1_b));

    this.studioGroup.add(p1Group);

    // -------------------------------------------------------------
    // 2: Triangle (2D Simplex - 3 Vertices, 1 Face)
    // -------------------------------------------------------------
    const p2Group = new THREE.Group();
    p2Group.position.set(1.2, -0.3, 0);

    const v2 = [
      new THREE.Vector3(0, 1.25, 0),
      new THREE.Vector3(-1.15, -0.95, 0.2),
      new THREE.Vector3(1.15, -0.95, -0.2)
    ];

    // White frame edges
    p2Group.add(createEdgeTube(v2[0], v2[1]));
    p2Group.add(createEdgeTube(v2[1], v2[2]));
    p2Group.add(createEdgeTube(v2[2], v2[0]));

    // Red vertex spheres
    v2.forEach(v => p2Group.add(createVertex(v)));

    // Red glass face
    const triGeo = new THREE.BufferGeometry().setFromPoints(v2);
    triGeo.setIndex([0, 1, 2]);
    triGeo.computeVertexNormals();
    const triMesh = new THREE.Mesh(triGeo, glassRedMat);
    p2Group.add(triMesh);

    this.studioGroup.add(p2Group);

    // -------------------------------------------------------------
    // 3: Tetrahedron (3D Simplex - 4 Vertices, 6 Edges, 4 Faces)
    // -------------------------------------------------------------
    const p3Group = new THREE.Group();
    p3Group.position.set(4.5, -0.1, 0);

    const R = 1.45;
    const v3 = [
      new THREE.Vector3(0, R, 0),                                       // Apex
      new THREE.Vector3(R * Math.sqrt(8/9), -R / 3, 0),                 // Base 1
      new THREE.Vector3(-R * Math.sqrt(2/9), -R / 3, R * Math.sqrt(2/3)), // Base 2
      new THREE.Vector3(-R * Math.sqrt(2/9), -R / 3, -R * Math.sqrt(2/3)) // Base 3
    ];

    // 6 White frame edges
    const tetraEdges = [[0,1], [0,2], [0,3], [1,2], [2,3], [3,1]];
    tetraEdges.forEach(([i, j]) => {
      p3Group.add(createEdgeTube(v3[i], v3[j]));
    });

    // 4 Red vertex spheres
    v3.forEach(v => p3Group.add(createVertex(v)));

    // 4 Red glass faces
    const tetraFaces = [[0,1,2], [0,2,3], [0,3,1], [1,3,2]];
    tetraFaces.forEach(([a, b, c]) => {
      const fGeo = new THREE.BufferGeometry().setFromPoints([v3[a], v3[b], v3[c]]);
      fGeo.setIndex([0, 1, 2]);
      fGeo.computeVertexNormals();
      p3Group.add(new THREE.Mesh(fGeo, glassRedMat));
    });

    this.studioGroup.add(p3Group);
  }

  build4DPentatope() {
    const sphereGeo = new THREE.SphereGeometry(0.18, 24, 24);
    const vertexColors = [0x2563eb, 0x059669, 0xd97706, 0xbe123c, 0x9333ea];

    this.pentatopeSpheres = [];
    this.pentatopeLines = [];
    this.pentatopeFaces = [];

    // 5 Vertices
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: vertexColors[i],
        metalness: 0.1,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeo, mat);
      this.pentatopeSpheres.push(sphere);
      this.pentatopeGroup.add(sphere);
    }

    // 10 Edges
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x9333ea,
          transparent: true,
          opacity: 0.75,
          linewidth: 2
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.userData = { i, j };
        this.pentatopeLines.push(line);
        this.pentatopeGroup.add(line);
      }
    }

    // 10 Triangular faces
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        for (let k = j + 1; k < 5; k++) {
          const faceGeo = new THREE.BufferGeometry();
          const faceMat = new THREE.MeshStandardMaterial({
            color: 0xa855f7,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
          });
          const mesh = new THREE.Mesh(faceGeo, faceMat);
          mesh.userData = { i, j, k };
          this.pentatopeFaces.push(mesh);
          this.pentatopeGroup.add(mesh);
        }
      }
    }
  }

  setDimension(dim) {
    this.activeDimension = String(dim);
    this.isTransitioningCamera = true;
    const d = String(dim);

    if (d === '4') {
      this.studioGroup.visible = false;
      this.pentatopeGroup.visible = true;
      this.targetCameraPos.set(0, 1.2, 7.2);
      this.targetControlsTarget.set(0, 0, 0);
    } else {
      this.studioGroup.visible = true;
      this.pentatopeGroup.visible = false;

      if (d === '0') {
        this.targetCameraPos.set(-4.5, 0.4, 4.2);
        this.targetControlsTarget.set(-4.5, -0.8, 0);
      } else if (d === '1') {
        this.targetCameraPos.set(-1.8, 0.6, 4.2);
        this.targetControlsTarget.set(-1.8, -0.5, 0);
      } else if (d === '2') {
        this.targetCameraPos.set(1.2, 0.8, 4.8);
        this.targetControlsTarget.set(1.2, -0.2, 0);
      } else if (d === '3') {
        this.targetCameraPos.set(4.5, 1.2, 5.5);
        this.targetControlsTarget.set(4.5, 0.1, 0);
      } else {
        // 'all' - Full Simplex Family View
        this.targetCameraPos.set(0, 5.2, 13.8);
        this.targetControlsTarget.set(0, 0.2, 0);
      }
    }
  }

  project4DTo3D(v4, angleXW, angleYZ) {
    const cosA = Math.cos(angleXW);
    const sinA = Math.sin(angleXW);
    const x1 = v4.x * cosA - v4.w * sinA;
    const w1 = v4.x * sinA + v4.w * cosA;

    const cosB = Math.cos(angleYZ);
    const sinB = Math.sin(angleYZ);
    const y1 = v4.y * cosB - v4.z * sinB;
    const z1 = v4.y * sinB + v4.z * cosB;

    const cameraDist4D = 3.6;
    const scale = cameraDist4D / (cameraDist4D - w1);

    return new THREE.Vector3(x1 * scale * 1.5, y1 * scale * 1.5, z1 * scale * 1.5);
  }

  initControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 60; // Allow generous unzoom/zoom-out
    this.controls.minDistance = 1.5;

    // Immediately stop camera transition when user manually interacts
    this.controls.addEventListener('start', () => {
      this.isTransitioningCamera = false;
    });
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  resetCamera() {
    this.setDimension(this.activeDimension);
    this.isTransitioningCamera = true;
    this.studioGroup.rotation.set(0, 0, 0);
    this.pentatopeGroup.rotation.set(0, 0, 0);
  }

  onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Camera smooth transition lerp only during auto-focusing
    if (this.isTransitioningCamera) {
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.controls.target.lerp(this.targetControlsTarget, 0.08);
      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05 &&
          this.controls.target.distanceTo(this.targetControlsTarget) < 0.05) {
        this.camera.position.copy(this.targetCameraPos);
        this.controls.target.copy(this.targetControlsTarget);
        this.isTransitioningCamera = false;
      }
    }

    // 4D Pentatope rotation (only rotates when auto-rotation is active!)
    if (this.pentatopeGroup.visible) {
      if (this.isAutoRotating) {
        this.hyperTime += 0.005; // calm, soothing rotation rate (no dizziness)
      }
      const angleXW = this.hyperTime;
      const angleYZ = this.hyperTime * 0.65;

      const projectedPoints = this.pentatope4D.map(v4 => this.project4DTo3D(v4, angleXW, angleYZ));

      projectedPoints.forEach((p, idx) => {
        if (this.pentatopeSpheres[idx]) {
          this.pentatopeSpheres[idx].position.copy(p);
        }
      });

      this.pentatopeLines.forEach(line => {
        const { i, j } = line.userData;
        line.geometry.setFromPoints([projectedPoints[i], projectedPoints[j]]);
      });

      this.pentatopeFaces.forEach(mesh => {
        const { i, j, k } = mesh.userData;
        mesh.geometry.setFromPoints([projectedPoints[i], projectedPoints[j], projectedPoints[k]]);
        mesh.geometry.setIndex([0, 1, 2]);
        mesh.geometry.computeVertexNormals();
      });
    }

    if (this.isAutoRotating) {
      if (this.studioGroup.visible) {
        this.studioGroup.rotation.y += 0.003;
      }
      if (this.pentatopeGroup.visible) {
        this.pentatopeGroup.rotation.y += 0.003;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) this.renderer.domElement.remove();
  }
}

window.Aghdas3DVisualizer = Aghdas3DVisualizer;
window.ChandPellehVisualizer = ChandPellehVisualizer;
window.SimplexVisualizer = SimplexVisualizer;

/**
 * ThankYou3DVisualizer - Interactive Multi-Geometry Finale Studio
 * Features 3D crystal tetrahedron, live 4D tesseract projection, and golden symmetry gem.
 */
class ThankYou3DVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.currentShape = 'tetra';
    this.isAutoRotating = true;
    this.angle4D = 0;
    this.time = 0;
    this.particleCloud = null;

    this.initScene();
    this.createLights();
    this.createParticleCloud();
    this.createTetrahedron();
    this.createTesseract();
    this.createGem();
    this.setShape('tetra');
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initScene() {
    this.scene = new THREE.Scene();
    const w = this.container.clientWidth || 550;
    const h = this.container.clientHeight || 420;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.8, 5.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.container.appendChild(this.renderer.domElement);

    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.minDistance = 2.8;
      this.controls.maxDistance = 9;
      this.controls.enablePan = false;
    }
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.5);
    dirLight1.position.set(4, 6, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 1.3);
    dirLight2.position.set(-4, -3, -3);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa855f7, 2.2, 10);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);
  }

  createParticleCloud() {
    const count = 120;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorChoices = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xf59e0b),
      new THREE.Color(0x10b981),
      new THREE.Color(0xa855f7)
    ];

    for (let i = 0; i < count; i++) {
      const radius = 2.0 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      positions[i * 3] = radius * Math.cos(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(phi) * Math.sin(theta);

      const col = colorChoices[Math.floor(Math.random() * colorChoices.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.particleCloud = new THREE.Points(geom, mat);
    this.scene.add(this.particleCloud);
  }

  createTetrahedron() {
    this.tetraGroup = new THREE.Group();
    const geom = new THREE.TetrahedronGeometry(1.6, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      metalness: 0.1,
      roughness: 0.15,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9,
      clearcoat: 1.0
    });
    const mesh = new THREE.Mesh(geom, mat);
    this.tetraGroup.add(mesh);

    const wireGeom = new THREE.WireframeGeometry(geom);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const wire = new THREE.LineSegments(wireGeom, wireMat);
    this.tetraGroup.add(wire);

    const posAttr = geom.getAttribute('position');
    const sphereGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9
    });

    for (let i = 0; i < posAttr.count; i++) {
      const s = new THREE.Mesh(sphereGeom, sphereMat);
      s.position.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      this.tetraGroup.add(s);
    }

    this.scene.add(this.tetraGroup);
  }

  createTesseract() {
    this.tesseractGroup = new THREE.Group();
    this.tessVertices4D = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          for (let w = -1; w <= 1; w += 2) {
            this.tessVertices4D.push({ x, y, z, w });
          }
        }
      }
    }

    this.tessEdges = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        if (this.tessVertices4D[i].x !== this.tessVertices4D[j].x) diff++;
        if (this.tessVertices4D[i].y !== this.tessVertices4D[j].y) diff++;
        if (this.tessVertices4D[i].z !== this.tessVertices4D[j].z) diff++;
        if (this.tessVertices4D[i].w !== this.tessVertices4D[j].w) diff++;
        if (diff === 1) this.tessEdges.push([i, j]);
      }
    }

    this.tessSpheres = [];
    const sphereGeom = new THREE.SphereGeometry(0.065, 12, 12);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8
    });

    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(sphereGeom, sphereMat);
      this.tessSpheres.push(s);
      this.tesseractGroup.add(s);
    }

    this.tessLines = [];
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85
    });

    this.tessEdges.forEach(([i, j]) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(g, lineMat);
      line.userData = { i, j };
      this.tessLines.push(line);
      this.tesseractGroup.add(line);
    });

    this.scene.add(this.tesseractGroup);
  }

  createGem() {
    this.gemGroup = new THREE.Group();
    const geom = new THREE.IcosahedronGeometry(1.5, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.65,
      transparent: true,
      opacity: 0.88,
      reflectivity: 0.95,
      clearcoat: 1.0
    });
    const mesh = new THREE.Mesh(geom, mat);
    this.gemGroup.add(mesh);

    const wireGeom = new THREE.WireframeGeometry(geom);
    const wireMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 });
    const wire = new THREE.LineSegments(wireGeom, wireMat);
    this.gemGroup.add(wire);

    const coreGeom = new THREE.OctahedronGeometry(0.8, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    this.gemGroup.add(core);

    this.scene.add(this.gemGroup);
  }

  setShape(shape) {
    this.currentShape = shape;
    if (this.tetraGroup) this.tetraGroup.visible = (shape === 'tetra');
    if (this.tesseractGroup) this.tesseractGroup.visible = (shape === 'tesseract');
    if (this.gemGroup) this.gemGroup.visible = (shape === 'gem');
  }

  toggleAutoRotate() {
    this.isAutoRotating = !this.isAutoRotating;
    return this.isAutoRotating;
  }

  onWindowResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.time += 0.015;

    if (this.particleCloud) {
      this.particleCloud.rotation.y += 0.0015;
      this.particleCloud.rotation.x = Math.sin(this.time * 0.4) * 0.08;
    }

    if (this.isAutoRotating) {
      if (this.tetraGroup && this.tetraGroup.visible) {
        this.tetraGroup.rotation.y += 0.008;
        this.tetraGroup.rotation.x = Math.sin(this.time * 0.5) * 0.2;
      }
      if (this.gemGroup && this.gemGroup.visible) {
        this.gemGroup.rotation.y += 0.007;
        this.gemGroup.rotation.z = Math.cos(this.time * 0.4) * 0.15;
      }
      if (this.tesseractGroup && this.tesseractGroup.visible) {
        this.tesseractGroup.rotation.y += 0.005;
      }
    }

    if (this.tesseractGroup && this.tesseractGroup.visible) {
      this.angle4D += 0.012;
      const cosA = Math.cos(this.angle4D);
      const sinA = Math.sin(this.angle4D);
      const distance = 2.4;

      const projected = this.tessVertices4D.map(v => {
        const xRot = v.x * cosA - v.w * sinA;
        const wRot = v.x * sinA + v.w * cosA;
        const factor = 1 / (distance - wRot * 0.45);
        return new THREE.Vector3(xRot * factor * 2.8, v.y * factor * 2.8, v.z * factor * 2.8);
      });

      for (let i = 0; i < 16; i++) {
        this.tessSpheres[i].position.copy(projected[i]);
      }

      this.tessLines.forEach(line => {
        const { i, j } = line.userData;
        line.geometry.setFromPoints([projected[i], projected[j]]);
      });
    }

    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) this.renderer.domElement.remove();
  }
}

window.ThankYou3DVisualizer = ThankYou3DVisualizer;

