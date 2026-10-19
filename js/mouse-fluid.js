/**
 * mouse-fluid.js — GPU-based Fluid Mouse Trail Simulation & Distortion
 * Ported directly from the lusion.co WebGL render pipeline.
 *
 * Implements:
 *  1. Double FBO ping-pong rendering loop for velocity advection simulation.
 *  2. Gaussian blur pass to smooth out velocity vectors.
 *  3. Post-processing shader pass combining:
 *     - Fluid refraction displacement mapping.
 *     - Velocity-driven RGB Chromatic Aberration.
 *     - Dynamic color cycle (RGB sine wave) blended with a custom liquid tint.
 *     - Turbulence/noise displacement.
 *  4. Interactive Control Panel (lil-gui) with pure white default fluid color!
 */
(function () {
  "use strict";

  class MouseFluidEffect {
    /**
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.Scene} scene
     * @param {THREE.Camera} camera
     */
    constructor(renderer, scene, camera) {
      this.renderer = renderer;
      this.scene = scene;
      this.camera = camera;
      this.settings = {
        pointer: {
          ease: 0.25,
        },
        flow: {
          radius: 0.04,
          strength: 1.5,
          decay: 0.0028,
          growScale: 1.0,
          advectionStrength: 0.008,
          blurStrength: 0.35,
          blurRadius: 1.2,
          noiseStrength: 0.003,
          noiseScale: 3.0,
        },
        rgb: {
          frequency: 10.0,
          strength: 0.0, // pure white default (no rainbow aberration unless enabled)
          mix: 0.0,      // 100% pure liquid color
        },
        liquid: {
          color: new THREE.Color(1.0, 1.0, 1.0), // FULL PURE WHITE
        },
        aberration: {
          strength: 0.015,
        },
        scene: {
          distortion: 0.025,
        },
      };

      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      this.resolution = isMobile ? 256 : 512;

      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      this.aspectRatio = screenW / screenH;

      this.sceneRenderTarget = new THREE.WebGLRenderTarget(screenW, screenH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });

      // Procedural noise texture fallback
      function createNoiseDataTexture() {
        const width = 128;
        const height = 128;
        const size = width * height;
        const data = new Uint8Array(4 * size);
        for (let i = 0; i < size; i++) {
          const stride = i * 4;
          data[stride]     = Math.floor(Math.random() * 255);
          data[stride + 1] = Math.floor(Math.random() * 255);
          data[stride + 2] = Math.floor(Math.random() * 255);
          data[stride + 3] = 255;
        }
        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        return texture;
      }

      this.noiseTexture = createNoiseDataTexture();

      let textureType = THREE.HalfFloatType;
      try {
        const gl = renderer.getContext();
        const isWebGL2 = renderer.capabilities.isWebGL2;
        if (!isWebGL2) {
          const hasHalfFloat =
            gl.getExtension("OES_texture_half_float") &&
            gl.getExtension("OES_texture_half_float_linear");
          const hasFloat =
            gl.getExtension("OES_texture_float") &&
            gl.getExtension("OES_texture_float_linear");
          if (hasHalfFloat) {
            textureType = THREE.HalfFloatType;
          } else if (hasFloat) {
            textureType = THREE.FloatType;
          } else {
            textureType = THREE.UnsignedByteType;
          }
        }
      } catch (e) {
        textureType = THREE.UnsignedByteType;
      }

      const fboOptions = {
        depthBuffer: false,
        stencilBuffer: false,
        type: textureType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      };

      this.velocityFBO1 = new THREE.WebGLRenderTarget(
        this.resolution,
        this.resolution,
        fboOptions,
      );
      this.velocityFBO2 = new THREE.WebGLRenderTarget(
        this.resolution,
        this.resolution,
        fboOptions,
      );
      this.readVelocity = this.velocityFBO1;
      this.writeVelocity = this.velocityFBO2;

      // blur buffer
      this.blurFBO = new THREE.WebGLRenderTarget(
        this.resolution / 2,
        this.resolution / 2,
        fboOptions,
      );

      // ── Post Processing full screen setup ───────────────
      this.fboScene = new THREE.Scene();
      this.fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      this.fboQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      this.fboScene.add(this.fboQuad);

      // ── Shader Materials ─────────────────────────────────
      this._initShaders();

      // ── Pointer Tracker ──────────────────────────────────
      this.pointer = {
        current: new THREE.Vector2(0.5, 0.5),
        target: new THREE.Vector2(0.5, 0.5),
        velocity: new THREE.Vector2(0, 0),
        lastTime: 0,
        isActive: false,
      };

      this._setupEventListeners();

      // ── Control Panel GUI ────────────────────────────────
      this._initGUI();
    }

    _initShaders() {
      // 1. Gaussian Blur Shader
      this.blurMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tInput: { value: null },
          uBlurDirection: { value: new THREE.Vector2(0, 0) },
        },
        vertexShader: this._basicVertexShader(),
        fragmentShader: `
          uniform sampler2D tInput;
          uniform vec2 uBlurDirection;
          varying vec2 vUv;
          void main() {
            vec4 sum = vec4(0.0);
            sum += texture2D(tInput, vUv - 4.0 * uBlurDirection) * 0.051;
            sum += texture2D(tInput, vUv - 3.0 * uBlurDirection) * 0.0918;
            sum += texture2D(tInput, vUv - 2.0 * uBlurDirection) * 0.12245;
            sum += texture2D(tInput, vUv - 1.0 * uBlurDirection) * 0.1531;
            sum += texture2D(tInput, vUv) * 0.1633;
            sum += texture2D(tInput, vUv + 1.0 * uBlurDirection) * 0.1531;
            sum += texture2D(tInput, vUv + 2.0 * uBlurDirection) * 0.12245;
            sum += texture2D(tInput, vUv + 3.0 * uBlurDirection) * 0.0918;
            sum += texture2D(tInput, vUv + 4.0 * uBlurDirection) * 0.051;
            gl_FragColor = sum;
          }
        `,
        depthWrite: false,
        depthTest: false,
      });

      // 2. Fluid Simulation Shader
      this.velocityMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tVelocity: { value: null },
          tBlur: { value: null },
          tNoise: { value: this.noiseTexture },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uVelocity: { value: new THREE.Vector2(0, 0) },
          uDeltaTime: { value: 16.6 },
          uRadius: { value: this.settings.flow.radius },
          uStrength: { value: this.settings.flow.strength },
          uDecay: { value: this.settings.flow.decay },
          uGrowScale: { value: this.settings.flow.growScale },
          uAdvectionStrength: { value: this.settings.flow.advectionStrength },
          uBlurStrength: { value: this.settings.flow.blurStrength },
          uNoiseStrength: { value: this.settings.flow.noiseStrength },
          uNoiseScale: { value: this.settings.flow.noiseScale },
          uAspectRatio: { value: this.aspectRatio },
        },
        vertexShader: this._basicVertexShader(),
        fragmentShader: `
          uniform sampler2D tVelocity;
          uniform sampler2D tBlur;
          uniform sampler2D tNoise;
          uniform vec2 uMouse;
          uniform vec2 uVelocity;
          uniform float uDeltaTime;
          uniform float uRadius;
          uniform float uStrength;
          uniform float uDecay;
          uniform float uGrowScale;
          uniform float uAdvectionStrength;
          uniform float uBlurStrength;
          uniform float uNoiseStrength;
          uniform float uNoiseScale;
          uniform float uAspectRatio;
          varying vec2 vUv;

          void main() {
            vec2 ratio = vec2(uAspectRatio, 1.0);
            float fpsScale = uDeltaTime * (60.0 / 1000.0);

            // Splat
            vec2 localUV = vUv * ratio;
            vec2 localMouse = uMouse * ratio;
            float dist = distance(localUV, localMouse);
            float mask = exp(-dist / uRadius);
            vec2 splat = uVelocity * uStrength * mask;

            // Advection
            vec2 center = vec2(0.5, 0.5);
            float growScale = pow(uGrowScale, fpsScale);
            vec2 scaledUV = (vUv - center) / growScale + center;

            vec2 base = texture2D(tVelocity, scaledUV).rg;
            vec2 advectUV = scaledUV - base * uAdvectionStrength * fpsScale;

            // Turbulence noise
            vec2 noiseUV = scaledUV * ratio * uNoiseScale;
            vec2 noiseSampler = texture2D(tNoise, noiseUV).rg;
            vec2 textureNoise = (noiseSampler - vec2(0.5)) * uNoiseStrength;

            vec2 deformedUV = advectUV + textureNoise;

            vec2 advected = texture2D(tVelocity, deformedUV).rg;
            vec2 blurred = texture2D(tBlur, deformedUV).rg;

            float decayFactor = exp(-uDecay * fpsScale);
            vec2 mixed = mix(advected, blurred, uBlurStrength) * decayFactor;

            gl_FragColor = vec4(mixed + splat, 0.0, 1.0);
          }
        `,
        depthWrite: false,
        depthTest: false,
      });

      // 3. Final Compositing Shader (refraction + chromatic aberration + full white liquid)
      this.postScene = new THREE.Scene();
      this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      this.postQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: null },
            tVelocity: { value: null },
            uDistortionStrength: { value: this.settings.scene.distortion },
            uAberrationStrength: { value: this.settings.aberration.strength },
            uRgbFrequency: { value: this.settings.rgb.frequency },
            uRgbStrength: { value: this.settings.rgb.strength },
            uRgbMix: { value: this.settings.rgb.mix },
            uLiquidColor: { value: this.settings.liquid.color },
          },
          vertexShader: this._basicVertexShader(),
          fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform sampler2D tVelocity;
            uniform float uDistortionStrength;
            uniform float uAberrationStrength;
            uniform float uRgbFrequency;
            uniform float uRgbStrength;
            uniform float uRgbMix;
            uniform vec3 uLiquidColor;
            varying vec2 vUv;

            void main() {
              vec2 flowDirection = texture2D(tVelocity, vUv).rg;
              
              float flowLen = length(clamp(flowDirection, -2.0, 2.0));
              float rgbPhase = flowLen * -0.15;
              float phase = rgbPhase * uRgbFrequency * 3.14159265;
              
              vec3 rgb = vec3(
                sin(phase + 0.0) * 0.5 + 0.5,
                sin(phase + 2.0) * 0.5 + 0.5,
                sin(phase + 4.0) * 0.5 + 0.5
              );
              
              float rgbStrength = length(flowDirection) * uRgbStrength;
              vec3 liquidColor = mix(uLiquidColor, rgb, uRgbMix);

              float caStrength = rgbStrength * uAberrationStrength * uDistortionStrength;
              vec2 caOffset = flowDirection * caStrength;

              vec2 uvOffset = flowDirection * (-uDistortionStrength) * length(liquidColor);
              vec2 sceneUV = vUv + uvOffset;

              float r = texture2D(tDiffuse, sceneUV + caOffset).r;
              float g = texture2D(tDiffuse, sceneUV - caOffset).g;
              float b = texture2D(tDiffuse, sceneUV - caOffset).b;
              float a = texture2D(tDiffuse, sceneUV).a;

              vec3 caColor = vec3(r, g, b);
              vec3 finalColor = mix(caColor, liquidColor, min(rgbStrength + 0.3, 1.0));

              // Compute fluid visibility trail so pure white liquid shines softly over the page
              float fluidTrail = smoothstep(0.003, 0.16, flowLen) * 0.85;
              float finalAlpha = max(a, fluidTrail);

              gl_FragColor = vec4(finalColor, finalAlpha);
            }
          `,
          depthWrite: false,
          depthTest: false,
          transparent: true,
        }),
      );
      this.postScene.add(this.postQuad);
    }

    _basicVertexShader() {
      return `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `;
    }

    _setupEventListeners() {
      const handleMove = (clientX, clientY) => {
        const rect = this.renderer.domElement.getBoundingClientRect();

        // Remap to UV space [0, 1]
        const x = (clientX - rect.left) / rect.width;
        const y = 1.0 - (clientY - rect.top) / rect.height;

        this.pointer.target.set(x, y);

        if (!this.pointer.isActive) {
          this.pointer.current.copy(this.pointer.target);
          this.pointer.velocity.set(0, 0);
          this.pointer.isActive = true;
        }
      };

      window.addEventListener("mousemove", (e) => {
        handleMove(e.clientX, e.clientY);
      });

      window.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) {
          handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      });

      window.addEventListener("touchend", () => {
        this.pointer.isActive = false;
      });
      document.body.addEventListener("mouseleave", () => {
        this.pointer.isActive = false;
      });
    }

    /**
     * Rescales the post-processing buffer size
     */
    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.aspectRatio = w / h;
      this.sceneRenderTarget.setSize(w, h);
      this.velocityMaterial.uniforms.uAspectRatio.value = this.aspectRatio;
    }

    /**
     * Swap velocity write and read targets
     */
    _swapVelocity() {
      const temp = this.readVelocity;
      this.readVelocity = this.writeVelocity;
      this.writeVelocity = temp;
    }

    /**
     * Perform the fluid simulation steps (blur, advect, splat, decay)
     */
    _stepSimulation(dtMs) {
      const now = performance.now();
      const p = this.pointer;

      if (p.isActive && p.lastTime > 0) {
        const dt = now - p.lastTime;
        const lerpFactor =
          1.0 - Math.pow(1.0 - this.settings.pointer.ease, dt / 16.66);

        const prevX = p.current.x;
        const prevY = p.current.y;

        p.current.x = p.current.x + (p.target.x - p.current.x) * lerpFactor;
        p.current.y = p.current.y + (p.target.y - p.current.y) * lerpFactor;

        const vdt = Math.max(dt / 1000, 1e-6);
        p.velocity.set(
          (p.current.x - prevX) / vdt,
          (p.current.y - prevY) / vdt,
        );
      } else {
        p.velocity.set(0, 0);
      }
      p.lastTime = now;

      const blurRadius = this.settings.flow.blurRadius;
      const blurDir = new THREE.Vector2(
        blurRadius / this.resolution,
        (blurRadius * this.aspectRatio) / this.resolution,
      );

      // Diagonal blur pass
      this.blurMaterial.uniforms.tInput.value = this.readVelocity.texture;
      this.blurMaterial.uniforms.uBlurDirection.value.copy(blurDir);
      this.fboQuad.material = this.blurMaterial;

      this.renderer.setRenderTarget(this.blurFBO);
      this.renderer.render(this.fboScene, this.fboCamera);

      // Velocity simulation pass
      const u = this.velocityMaterial.uniforms;
      u.tVelocity.value = this.readVelocity.texture;
      u.tBlur.value = this.blurFBO.texture;
      u.uMouse.value.copy(p.current);
      u.uVelocity.value.set(p.velocity.x, p.velocity.y);
      u.uDeltaTime.value = Math.min(dtMs, 100);

      this.fboQuad.material = this.velocityMaterial;
      this.renderer.setRenderTarget(this.writeVelocity);
      this.renderer.render(this.fboScene, this.fboCamera);
      this.renderer.setRenderTarget(null);

      this._swapVelocity();
    }

    /**
     * Render loop wrapper
     */
    render() {
      this._stepSimulation(16.66);

      this.renderer.setRenderTarget(this.sceneRenderTarget);

      const prevClearAlpha = this.renderer.getClearAlpha();
      this.renderer.setClearAlpha(0.0);
      this.renderer.clear();
      this.renderer.setClearAlpha(prevClearAlpha);

      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);

      this.postQuad.material.uniforms.tDiffuse.value =
        this.sceneRenderTarget.texture;
      this.postQuad.material.uniforms.tVelocity.value =
        this.readVelocity.texture;
      this.renderer.render(this.postScene, this.postCamera);
    }

    /**
     * Updates liquid tint color
     * @param {string|THREE.Color} color
     */
    setLiquidColor(color) {
      if (typeof color === "string") {
        this.settings.liquid.color.set(color);
      } else {
        this.settings.liquid.color.copy(color);
      }
      this.postQuad.material.uniforms.uLiquidColor.value.copy(
        this.settings.liquid.color,
      );
      if (this.guiLiquidColorController) {
        this.guiLiquidColorController.setValue(
          "#" + this.settings.liquid.color.getHexString(),
        );
      }
    }

    /**
     * Initialize dynamic parameter GUI using lil-gui
     */
    _initGUI() {
      const GUI = window.lil?.GUI;
      if (!GUI) return;

      const gui = new GUI({ title: "🌊 Fluid Mouse Controls" });

      gui.domElement.style.position = "fixed";
      gui.domElement.style.top = "80px";
      gui.domElement.style.right = "20px";
      gui.domElement.style.zIndex = "99999";
      gui.domElement.style.boxShadow = "0 10px 35px rgba(0,0,0,0.25)";
      gui.domElement.style.borderRadius = "8px";

      const s = this.settings;

      // Material Folder (Liquid Tint)
      const fLiquid = gui.addFolder("Liquid Color");
      const liquidColorHelper = { color: "#" + s.liquid.color.getHexString() };
      this.guiLiquidColorController = fLiquid
        .addColor(liquidColorHelper, "color")
        .name("Fluid Color")
        .onChange((v) => {
          s.liquid.color.set(v);
          this.postQuad.material.uniforms.uLiquidColor.value.copy(
            s.liquid.color,
          );
        });

      // Simulation Folder
      const fFlow = gui.addFolder("Fluid Simulation");
      fFlow
        .add(s.flow, "radius", 0.005, 0.1, 0.001)
        .name("Splat Radius")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uRadius.value = v;
        });
      fFlow
        .add(s.flow, "strength", 0.1, 4.0, 0.1)
        .name("Flow Strength")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uStrength.value = v;
        });
      fFlow
        .add(s.flow, "decay", 0.0005, 0.01, 0.0001)
        .name("Trail Decay")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uDecay.value = v;
        });
      fFlow
        .add(s.flow, "advectionStrength", 0.0, 0.03, 0.001)
        .name("Advection")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uAdvectionStrength.value = v;
        });
      fFlow
        .add(s.flow, "blurStrength", 0.0, 1.0, 0.05)
        .name("Blur Intensity")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uBlurStrength.value = v;
        });
      fFlow
        .add(s.flow, "noiseStrength", 0.0, 0.015, 0.0005)
        .name("Turbulence")
        .onChange((v) => {
          this.velocityMaterial.uniforms.uNoiseStrength.value = v;
        });

      // Interaction Folder
      const fPointer = gui.addFolder("Cursor Motion");
      fPointer.add(s.pointer, "ease", 0.05, 0.5, 0.01).name("Cursor Easing");

      // Refraction & Optics Folder
      const fEnv = gui.addFolder("Refraction & Optics");
      fEnv
        .add(s.scene, "distortion", 0.0, 0.08, 0.001)
        .name("Refraction")
        .onChange((v) => {
          this.postQuad.material.uniforms.uDistortionStrength.value = v;
        });
      fEnv
        .add(s.aberration, "strength", 0.0, 0.1, 0.001)
        .name("Aberration")
        .onChange((v) => {
          this.postQuad.material.uniforms.uAberrationStrength.value = v;
        });

      // Chromatic Sine Effects
      const fRgb = gui.addFolder("Rainbow Sine (Optional)");
      fRgb
        .add(s.rgb, "mix", 0.0, 1.0, 0.02)
        .name("Rainbow Mix")
        .onChange((v) => {
          this.postQuad.material.uniforms.uRgbMix.value = v;
        });
      fRgb
        .add(s.rgb, "strength", 0.0, 2.0, 0.05)
        .name("RGB Intensity")
        .onChange((v) => {
          this.postQuad.material.uniforms.uRgbStrength.value = v;
        });
      fRgb.close();

      this.gui = gui;

      // Connect button to toggle GUI
      const toggleBtn = document.getElementById("fluidControlBtn");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          if (gui.domElement.style.display === "none") {
            gui.domElement.style.display = "";
            toggleBtn.style.color = "var(--gold-dark)";
          } else {
            gui.domElement.style.display = "none";
            toggleBtn.style.color = "";
          }
        });
      }
    }
  }

  window.MouseFluidEffect = MouseFluidEffect;

  // Auto-initialize when Three.js is loaded
  function initFluidTrail() {
    if (typeof THREE === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.id = "mouseFluidCanvas";
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9998";
    document.body.appendChild(canvas);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch(e) {
      console.warn("WebGL not supported for mouse fluid effect:", e);
      return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 4;

    // Glowing pure white particles inside the 3D scene
    const particleCount = 55;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      scales[i] = Math.random() * 0.04 + 0.02;
    }
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Pure white glowing particle texture
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext("2d");
    const pGrd = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    pGrd.addColorStop(0, "rgba(255, 255, 255, 0.98)");
    pGrd.addColorStop(0.45, "rgba(255, 255, 255, 0.45)");
    pGrd.addColorStop(1, "rgba(255, 255, 255, 0)");
    pCtx.fillStyle = pGrd;
    pCtx.fillRect(0, 0, 32, 32);

    const pTexture = new THREE.CanvasTexture(pCanvas);
    const pMat = new THREE.PointsMaterial({
      size: 0.22,
      map: pTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particlesMesh = new THREE.Points(geom, pMat);
    scene.add(particlesMesh);

    const fluid = new MouseFluidEffect(renderer, scene, camera);
    fluid.setLiquidColor(new THREE.Color(1.0, 1.0, 1.0)); // PURE WHITE

    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      fluid.resize();
    });

    let clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      const pos = geom.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += Math.sin(time + i) * 0.0015;
      }
      geom.attributes.position.needsUpdate = true;

      fluid.render();
    }
    animate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFluidTrail);
  } else {
    initFluidTrail();
  }
})();
