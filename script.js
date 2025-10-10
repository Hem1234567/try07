// starfield background starts
function starfieldInit() {
  const canvas = document.getElementById("starfieldCanvas");
  const ctx = canvas.getContext("2d");

  const starfieldResizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  starfieldResizeCanvas();

  const starfieldStarCount = 200;
  const starfieldStars = Array.from({ length: starfieldStarCount }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    speed: Math.random() * 2 + 1,
  }));

  const starfieldAnimate = () => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < starfieldStarCount; i++) {
      let star = starfieldStars[i];
      star.z -= star.speed;

      if (star.z <= 0) {
        star.z = canvas.width;
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height;
        star.speed = Math.random() * 2 + 1;
      }

      const scale = 500 / star.z;
      const x = (star.x - canvas.width / 2) * scale + canvas.width / 2;
      const y = (star.y - canvas.height / 2) * scale + canvas.height / 2;

      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        const size = (1 - star.z / canvas.width) * 2;
        const opacity = (1 - star.z / canvas.width) * 0.8;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
      }
    }

    requestAnimationFrame(starfieldAnimate);
  };

  starfieldAnimate();

  window.addEventListener("resize", starfieldResizeCanvas);
}

document.addEventListener("DOMContentLoaded", starfieldInit);

//cursor code starts 
        class TargetCursor {
          constructor(options = {}) {
            this.targetSelector = options.targetSelector || ".cursor-target";
            this.spinDuration = options.spinDuration || 2;
            this.hideDefaultCursor = options.hideDefaultCursor !== false;

            this.constants = {
              borderWidth: 3,
              cornerSize: 12,
              parallaxStrength: 0.00005,
            };

            this.activeTarget = null;
            this.currentTargetMove = null;
            this.currentLeaveHandler = null;
            this.isAnimatingToTarget = false;
            this.resumeTimeout = null;
            this.spinTl = null;

            this.init();
          }

          init() {
            this.createCursor();
            this.setupEventListeners();

            if (this.hideDefaultCursor) {
              document.body.style.cursor = "none";
            }
          }

          createCursor() {
            this.cursorWrapper = document.createElement("div");
            this.cursorWrapper.className = "target-cursor-wrapper";

            this.dot = document.createElement("div");
            this.dot.className = "target-cursor-dot";
            this.cursorWrapper.appendChild(this.dot);

            const corners = [
              { className: "target-cursor-corner corner-tl" },
              { className: "target-cursor-corner corner-tr" },
              { className: "target-cursor-corner corner-br" },
              { className: "target-cursor-corner corner-bl" },
            ];

            corners.forEach((corner) => {
              const cornerEl = document.createElement("div");
              cornerEl.className = corner.className;
              this.cursorWrapper.appendChild(cornerEl);
            });

            document.body.appendChild(this.cursorWrapper);
            this.corners = this.cursorWrapper.querySelectorAll(".target-cursor-corner");

            gsap.set(this.cursorWrapper, {
              xPercent: -50,
              yPercent: -50,
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
            });

            this.createSpinTimeline();
          }

          createSpinTimeline() {
            if (this.spinTl) {
              this.spinTl.kill();
            }

            this.spinTl = gsap.timeline({ repeat: -1 }).to(this.cursorWrapper, {
              rotation: "+=360",
              duration: this.spinDuration,
              ease: "none",
            });
          }

          moveCursor(x, y) {
            if (!this.cursorWrapper) return;

            gsap.to(this.cursorWrapper, {
              x,
              y,
              duration: 0.1,
              ease: "power3.out",
            });
          }

          cleanupTarget(target) {
            if (this.currentTargetMove) {
              target.removeEventListener("mousemove", this.currentTargetMove);
            }
            if (this.currentLeaveHandler) {
              target.removeEventListener("mouseleave", this.currentLeaveHandler);
            }
            this.currentTargetMove = null;
            this.currentLeaveHandler = null;
          }

          setupEventListeners() {
            this.moveHandler = (e) => this.moveCursor(e.clientX, e.clientY);
            window.addEventListener("mousemove", this.moveHandler);

            this.scrollHandler = () => {
              if (!this.activeTarget || !this.cursorWrapper) return;

              const mouseX = gsap.getProperty(this.cursorWrapper, "x");
              const mouseY = gsap.getProperty(this.cursorWrapper, "y");

              const elementUnderMouse = document.elementFromPoint(mouseX, mouseY);
              const isStillOverTarget =
                elementUnderMouse &&
                (elementUnderMouse === this.activeTarget ||
                  elementUnderMouse.closest(this.targetSelector) === this.activeTarget);

              if (!isStillOverTarget) {
                if (this.currentLeaveHandler) {
                  this.currentLeaveHandler();
                }
              }
            };

            window.addEventListener("scroll", this.scrollHandler, { passive: true });

            this.mouseDownHandler = () => {
              if (!this.dot) return;
              gsap.to(this.dot, { scale: 0.7, duration: 0.3 });
              gsap.to(this.cursorWrapper, { scale: 0.9, duration: 0.2 });
            };

            this.mouseUpHandler = () => {
              if (!this.dot) return;
              gsap.to(this.dot, { scale: 1, duration: 0.3 });
              gsap.to(this.cursorWrapper, { scale: 1, duration: 0.2 });
            };

            window.addEventListener("mousedown", this.mouseDownHandler);
            window.addEventListener("mouseup", this.mouseUpHandler);

            this.enterHandler = (e) => {
              const directTarget = e.target;

              const allTargets = [];
              let current = directTarget;
              while (current && current !== document.body) {
                if (current.matches(this.targetSelector)) {
                  allTargets.push(current);
                }
                current = current.parentElement;
              }

              const target = allTargets[0] || null;
              if (!target || !this.cursorWrapper || !this.corners) return;

              if (this.activeTarget === target) return;

              if (this.activeTarget) {
                this.cleanupTarget(this.activeTarget);
              }

              if (this.resumeTimeout) {
                clearTimeout(this.resumeTimeout);
                this.resumeTimeout = null;
              }

              this.activeTarget = target;
              const corners = Array.from(this.corners);
              corners.forEach((corner) => {
                gsap.killTweensOf(corner);
              });

              gsap.killTweensOf(this.cursorWrapper, "rotation");
              this.spinTl?.pause();

              gsap.set(this.cursorWrapper, { rotation: 0 });

              const updateCorners = (mouseX, mouseY) => {
                const rect = target.getBoundingClientRect();
                const cursorRect = this.cursorWrapper.getBoundingClientRect();

                const cursorCenterX = cursorRect.left + cursorRect.width / 2;
                const cursorCenterY = cursorRect.top + cursorRect.height / 2;

                const [tlc, trc, brc, blc] = Array.from(this.corners);

                const { borderWidth, cornerSize, parallaxStrength } = this.constants;

                let tlOffset = {
                  x: rect.left - cursorCenterX - borderWidth,
                  y: rect.top - cursorCenterY - borderWidth,
                };
                let trOffset = {
                  x: rect.right - cursorCenterX + borderWidth - cornerSize,
                  y: rect.top - cursorCenterY - borderWidth,
                };
                let brOffset = {
                  x: rect.right - cursorCenterX + borderWidth - cornerSize,
                  y: rect.bottom - cursorCenterY + borderWidth - cornerSize,
                };
                let blOffset = {
                  x: rect.left - cursorCenterX - borderWidth,
                  y: rect.bottom - cursorCenterY + borderWidth - cornerSize,
                };

                if (mouseX !== undefined && mouseY !== undefined) {
                  const targetCenterX = rect.left + rect.width / 2;
                  const targetCenterY = rect.top + rect.height / 2;
                  const mouseOffsetX = (mouseX - targetCenterX) * parallaxStrength;
                  const mouseOffsetY = (mouseY - targetCenterY) * parallaxStrength;

                  tlOffset.x += mouseOffsetX;
                  tlOffset.y += mouseOffsetY;
                  trOffset.x += mouseOffsetX;
                  trOffset.y += mouseOffsetY;
                  brOffset.x += mouseOffsetX;
                  brOffset.y += mouseOffsetY;
                  blOffset.x += mouseOffsetX;
                  blOffset.y += mouseOffsetY;
                }

                const tl = gsap.timeline();
                const corners = [tlc, trc, brc, blc];
                const offsets = [tlOffset, trOffset, brOffset, blOffset];

                corners.forEach((corner, index) => {
                  tl.to(
                    corner,
                    {
                      x: offsets[index].x,
                      y: offsets[index].y,
                      duration: 0.2,
                      ease: "power2.out",
                    },
                    0
                  );
                });
              };

              this.isAnimatingToTarget = true;
              updateCorners();

              setTimeout(() => {
                this.isAnimatingToTarget = false;
              }, 1);

              let moveThrottle = null;
              const targetMove = (ev) => {
                if (moveThrottle || this.isAnimatingToTarget) return;
                moveThrottle = requestAnimationFrame(() => {
                  const mouseEvent = ev;
                  updateCorners(mouseEvent.clientX, mouseEvent.clientY);
                  moveThrottle = null;
                });
              };

              const leaveHandler = () => {
                this.activeTarget = null;
                this.isAnimatingToTarget = false;

                if (this.corners) {
                  const corners = Array.from(this.corners);
                  gsap.killTweensOf(corners);

                  const { cornerSize } = this.constants;
                  const positions = [
                    { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                    { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                    { x: -cornerSize * 1.5, y: cornerSize * 0.5 },
                  ];

                  const tl = gsap.timeline();
                  corners.forEach((corner, index) => {
                    tl.to(
                      corner,
                      {
                        x: positions[index].x,
                        y: positions[index].y,
                        duration: 0.3,
                        ease: "power3.out",
                      },
                      0
                    );
                  });
                }

                this.resumeTimeout = setTimeout(() => {
                  if (!this.activeTarget && this.cursorWrapper && this.spinTl) {
                    const currentRotation = gsap.getProperty(
                      this.cursorWrapper,
                      "rotation"
                    );
                    const normalizedRotation = currentRotation % 360;

                    this.spinTl.kill();
                    this.spinTl = gsap.timeline({ repeat: -1 }).to(this.cursorWrapper, {
                      rotation: "+=360",
                      duration: this.spinDuration,
                      ease: "none",
                    });

                    gsap.to(this.cursorWrapper, {
                      rotation: normalizedRotation + 360,
                      duration: this.spinDuration * (1 - normalizedRotation / 360),
                      ease: "none",
                      onComplete: () => {
                        this.spinTl?.restart();
                      },
                    });
                  }
                  this.resumeTimeout = null;
                }, 50);

                this.cleanupTarget(target);
              };

              this.currentTargetMove = targetMove;
              this.currentLeaveHandler = leaveHandler;

              target.addEventListener("mousemove", targetMove);
              target.addEventListener("mouseleave", leaveHandler);
            };

            window.addEventListener("mouseover", this.enterHandler, { passive: true });
          }

          destroy() {
            window.removeEventListener("mousemove", this.moveHandler);
            window.removeEventListener("mouseover", this.enterHandler);
            window.removeEventListener("scroll", this.scrollHandler);
            window.removeEventListener("mousedown", this.mouseDownHandler);
            window.removeEventListener("mouseup", this.mouseUpHandler);

            if (this.activeTarget) {
              this.cleanupTarget(this.activeTarget);
            }

            this.spinTl?.kill();

            if (this.cursorWrapper) {
              this.cursorWrapper.remove();
            }

            document.body.style.cursor = "";
          }
        }

        // Initialize the cursor when the page loads
        document.addEventListener("DOMContentLoaded", () => {
          const cursor = new TargetCursor({
            targetSelector: ".cursor-target",
            spinDuration: 2,
            hideDefaultCursor: true,
          });
        });
        // cursor code ends

//Home section starts
// Countdown timer
function updateHomeTimer() {
  // Set the future date
  const future = Date.parse("Dec 27, 2025 07:00:00");
  const now = new Date();
  const diff = future - now;

  // If the difference is negative, the event has passed
  if (diff <= 0) {
    document.querySelector(".home-timer").innerHTML = `
                            <div class="home-timer-unit">
                                <div class="home-timer-value">00</div>
                                <div class="home-timer-label">Event Started</div>
                            </div>
                        `;
    return;
  }

  // Calculate time components
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  // Update the display
  document.getElementById("homeDays").textContent = days
    .toString()
    .padStart(2, "0");
  document.getElementById("homeHours").textContent = hours
    .toString()
    .padStart(2, "0");
  document.getElementById("homeMinutes").textContent = minutes
    .toString()
    .padStart(2, "0");
  document.getElementById("homeSeconds").textContent = seconds
    .toString()
    .padStart(2, "0");
}

// Initialize
function initHome() {
  // Set initial timer
  updateHomeTimer();

  // Set up interval for timer
  setInterval(updateHomeTimer, 1000);
}

// Start when DOM is loaded
document.addEventListener("DOMContentLoaded", initHome);

//home section ends

//About section starts
// Function to animate counting
function animateCounter(element) {
  const target = parseInt(element.getAttribute("data-target"));
  const duration = 2000; // Animation duration in milliseconds
  const step = Math.ceil(target / (duration / 16)); // Calculate step for 60fps
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }

    // Format numbers with commas
    element.textContent = current.toLocaleString();
  }, 16);
}

// Function to check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top <=
      (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
    rect.bottom >= 0
  );
}

// Track which elements have been animated in the current view
let animatedElements = new Set();

// Initialize counters when page loads
document.addEventListener("DOMContentLoaded", function () {
  const statsSection = document.querySelector(".about-stats-section");

  // Function to handle scroll event
  function handleScroll() {
    if (isInViewport(statsSection)) {
      const counters = document.querySelectorAll(".about-stat-number");

      counters.forEach((counter) => {
        // Only animate if not already animated in this view
        if (!animatedElements.has(counter)) {
          animateCounter(counter);
          animatedElements.add(counter);
        }
      });
    } else {
      // Reset animation tracking when section is out of view
      animatedElements.clear();
    }
  }

  // Add scroll event listener with throttling
  let scrollTimeout;
  window.addEventListener("scroll", function () {
    if (!scrollTimeout) {
      scrollTimeout = setTimeout(function () {
        scrollTimeout = null;
        handleScroll();
      }, 100);
    }
  });

  // Check if section is already in view on page load
  handleScroll();
});
//About section ends

// Dome Gallery Script
const WORLD_DEFAULT_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Abstract art",
  },
  {
    src: "https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Modern sculpture",
  },
  {
    src: "https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Digital artwork",
  },
  {
    src: "https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Contemporary art",
  },
  {
    src: "https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Geometric pattern",
  },
  {
    src: "https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    alt: "Textured surface",
  },
  {
    src: "https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large",
    alt: "Social media image",
  },
];

const WORLD_DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35,
};

class WorldDomeGallery {
  constructor(options = {}) {
    this.config = {
      images: options.images || WORLD_DEFAULT_IMAGES,
      fit: options.fit || 0.5,
      fitBasis: options.fitBasis || "auto",
      minRadius: options.minRadius || 600,
      maxRadius: options.maxRadius || Infinity,
      padFactor: options.padFactor || 0.25,
      overlayBlurColor: options.overlayBlurColor || "#060010",
      maxVerticalRotationDeg:
        options.maxVerticalRotationDeg || WORLD_DEFAULTS.maxVerticalRotationDeg,
      dragSensitivity:
        options.dragSensitivity || WORLD_DEFAULTS.dragSensitivity,
      enlargeTransitionMs:
        options.enlargeTransitionMs || WORLD_DEFAULTS.enlargeTransitionMs,
      segments: options.segments || WORLD_DEFAULTS.segments,
      dragDampening: options.dragDampening || 2,
      openedImageWidth: options.openedImageWidth || "250px",
      openedImageHeight: options.openedImageHeight || "350px",
      imageBorderRadius: options.imageBorderRadius || "30px",
      openedImageBorderRadius: options.openedImageBorderRadius || "30px",
      grayscale: options.grayscale !== undefined ? options.grayscale : true,
    };

    this.root = document.getElementById("world-dome-gallery");
    this.sphere = document.getElementById("world-sphere");
    this.viewer = document.getElementById("world-viewer");
    this.frame = document.getElementById("world-frame");
    this.scrim = document.getElementById("world-scrim");

    this.rotation = { x: 0, y: 0 };
    this.startRot = { x: 0, y: 0 };
    this.startPos = null;
    this.dragging = false;
    this.moved = false;
    this.inertiaRAF = null;
    this.opening = false;
    this.openStartedAt = 0;
    this.lastDragEndAt = 0;
    this.lockedRadius = null;
    this.focusedEl = null;
    this.originalTilePosition = null;

    this.init();
  }

  clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  normalizeAngle(d) {
    return ((d % 360) + 360) % 360;
  }

  wrapAngleSigned(deg) {
    const a = (((deg + 180) % 360) + 360) % 360;
    return a - 180;
  }

  getDataNumber(el, name, fallback) {
    const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
    const n = attr == null ? NaN : parseFloat(attr);
    return Number.isFinite(n) ? n : fallback;
  }

  buildItems(pool, seg) {
    const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
    const evenYs = [-4, -2, 0, 2, 4];
    const oddYs = [-3, -1, 1, 3, 5];

    const coords = xCols.flatMap((x, c) => {
      const ys = c % 2 === 0 ? evenYs : oddYs;
      return ys.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }));
    });

    const totalSlots = coords.length;
    if (pool.length === 0) {
      return coords.map((c) => ({ ...c, src: "", alt: "" }));
    }
    if (pool.length > totalSlots) {
      console.warn(
        `[WorldDomeGallery] Provided image count (${pool.length}) exceeds available tiles (${totalSlots}). Some images will not be shown.`
      );
    }

    const normalizedImages = pool.map((image) => {
      if (typeof image === "string") {
        return { src: image, alt: "" };
      }
      return { src: image.src || "", alt: image.alt || "" };
    });

    const usedImages = Array.from(
      { length: totalSlots },
      (_, i) => normalizedImages[i % normalizedImages.length]
    );

    for (let i = 1; i < usedImages.length; i++) {
      if (usedImages[i].src === usedImages[i - 1].src) {
        for (let j = i + 1; j < usedImages.length; j++) {
          if (usedImages[j].src !== usedImages[i].src) {
            const tmp = usedImages[i];
            usedImages[i] = usedImages[j];
            usedImages[j] = tmp;
            break;
          }
        }
      }
    }

    return coords.map((c, i) => ({
      ...c,
      src: usedImages[i].src,
      alt: usedImages[i].alt,
    }));
  }

  computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
    const unit = 360 / segments / 2;
    const rotateY = unit * (offsetX + (sizeX - 1) / 2);
    const rotateX = unit * (offsetY - (sizeY - 1) / 2);
    return { rotateX, rotateY };
  }

  applyTransform(xDeg, yDeg) {
    if (this.sphere) {
      this.sphere.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
  }

  stopInertia() {
    if (this.inertiaRAF) {
      cancelAnimationFrame(this.inertiaRAF);
      this.inertiaRAF = null;
    }
  }

  startInertia(vx, vy) {
    const MAX_V = 1.4;
    let vX = this.clamp(vx, -MAX_V, MAX_V) * 80;
    let vY = this.clamp(vy, -MAX_V, MAX_V) * 80;
    let frames = 0;
    const d = this.clamp(this.config.dragDampening ?? 0.6, 0, 1);
    const frictionMul = 0.94 + 0.055 * d;
    const stopThreshold = 0.015 - 0.01 * d;
    const maxFrames = Math.round(90 + 270 * d);

    const step = () => {
      vX *= frictionMul;
      vY *= frictionMul;
      if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
        this.inertiaRAF = null;
        return;
      }
      if (++frames > maxFrames) {
        this.inertiaRAF = null;
        return;
      }
      const nextX = this.clamp(
        this.rotation.x - vY / 200,
        -this.config.maxVerticalRotationDeg,
        this.config.maxVerticalRotationDeg
      );
      const nextY = this.wrapAngleSigned(this.rotation.y + vX / 200);
      this.rotation = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
      this.inertiaRAF = requestAnimationFrame(step);
    };

    this.stopInertia();
    this.inertiaRAF = requestAnimationFrame(step);
  }

  handleDragStart(e) {
    if (this.focusedEl) return;
    this.stopInertia();
    this.dragging = true;
    this.moved = false;
    this.startRot = { ...this.rotation };
    this.startPos = { x: e.clientX, y: e.clientY };
  }

  handleDrag(e) {
    if (this.focusedEl || !this.dragging || !this.startPos) return;

    const dxTotal = e.clientX - this.startPos.x;
    const dyTotal = e.clientY - this.startPos.y;

    if (!this.moved) {
      const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
      if (dist2 > 16) this.moved = true;
    }

    const nextX = this.clamp(
      this.startRot.x - dyTotal / this.config.dragSensitivity,
      -this.config.maxVerticalRotationDeg,
      this.config.maxVerticalRotationDeg
    );
    const nextY = this.wrapAngleSigned(
      this.startRot.y + dxTotal / this.config.dragSensitivity
    );

    if (this.rotation.x !== nextX || this.rotation.y !== nextY) {
      this.rotation = { x: nextX, y: nextY };
      this.applyTransform(nextX, nextY);
    }
  }

  handleDragEnd(e) {
    if (!this.dragging) return;
    this.dragging = false;

    if (this.moved) this.lastDragEndAt = performance.now();
    this.moved = false;
  }

  setupDragEvents() {
    const main = document.querySelector(".world-main");

    main.addEventListener("mousedown", this.handleDragStart.bind(this));
    document.addEventListener("mousemove", this.handleDrag.bind(this));
    document.addEventListener("mouseup", this.handleDragEnd.bind(this));

    // Touch events
    main.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleDragStart(e.touches[0]);
    });

    document.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.handleDrag(e.touches[0]);
    });

    document.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.handleDragEnd(e);
    });
  }

  setupResizeObserver() {
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;
      let basis;
      switch (this.config.fitBasis) {
        case "min":
          basis = minDim;
          break;
        case "max":
          basis = maxDim;
          break;
        case "width":
          basis = w;
          break;
        case "height":
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * this.config.fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = this.clamp(radius, this.config.minRadius, this.config.maxRadius);
      this.lockedRadius = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * this.config.padFactor));
      this.root.style.setProperty("--radius", `${this.lockedRadius}px`);
      this.root.style.setProperty("--viewer-pad", `${viewerPad}px`);
      this.root.style.setProperty(
        "--overlay-blur-color",
        this.config.overlayBlurColor
      );
      this.root.style.setProperty(
        "--tile-radius",
        this.config.imageBorderRadius
      );
      this.root.style.setProperty(
        "--enlarge-radius",
        this.config.openedImageBorderRadius
      );
      this.root.style.setProperty(
        "--image-filter",
        this.config.grayscale ? "grayscale(1)" : "none"
      );
      this.applyTransform(this.rotation.x, this.rotation.y);

      const enlargedOverlay = this.viewer?.querySelector(".world-enlarge");
      if (
        enlargedOverlay &&
        this.frame &&
        document.querySelector(".world-main")
      ) {
        const frameR = this.frame.getBoundingClientRect();
        const mainR = document
          .querySelector(".world-main")
          .getBoundingClientRect();

        const hasCustomSize =
          this.config.openedImageWidth && this.config.openedImageHeight;
        if (hasCustomSize) {
          const tempDiv = document.createElement("div");
          tempDiv.style.cssText = `position: absolute; width: ${this.config.openedImageWidth}; height: ${this.config.openedImageHeight}; visibility: hidden;`;
          document.body.appendChild(tempDiv);
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);

          const centeredLeft =
            frameR.left - mainR.left + (frameR.width - tempRect.width) / 2;
          const centeredTop =
            frameR.top - mainR.top + (frameR.height - tempRect.height) / 2;

          enlargedOverlay.style.left = `${centeredLeft}px`;
          enlargedOverlay.style.top = `${centeredTop}px`;
        } else {
          enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
          enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
          enlargedOverlay.style.width = `${frameR.width}px`;
          enlargedOverlay.style.height = `${frameR.height}px`;
        }
      }
    });
    ro.observe(this.root);
  }

  closeEnlarged() {
    if (performance.now() - this.openStartedAt < 250) return;
    const el = this.focusedEl;
    if (!el) return;
    const parent = el.parentElement;
    const overlay = this.viewer?.querySelector(".world-enlarge");
    if (!overlay) return;
    const refDiv = parent.querySelector(".world-item__image--reference");
    const originalPos = this.originalTilePosition;
    if (!originalPos) {
      overlay.remove();
      if (refDiv) refDiv.remove();
      parent.style.setProperty("--rot-y-delta", "0deg");
      parent.style.setProperty("--rot-x-delta", "0deg");
      el.style.visibility = "";
      el.style.zIndex = 0;
      this.focusedEl = null;
      this.root?.removeAttribute("data-enlarging");
      this.opening = false;
      return;
    }
    const currentRect = overlay.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    const originalPosRelativeToRoot = {
      left: originalPos.left - rootRect.left,
      top: originalPos.top - rootRect.top,
      width: originalPos.width,
      height: originalPos.height,
    };
    const overlayRelativeToRoot = {
      left: currentRect.left - rootRect.left,
      top: currentRect.top - rootRect.top,
      width: currentRect.width,
      height: currentRect.height,
    };
    const animatingOverlay = document.createElement("div");
    animatingOverlay.className = "world-enlarge-closing";
    animatingOverlay.style.cssText = `position:absolute;left:${overlayRelativeToRoot.left}px;top:${overlayRelativeToRoot.top}px;width:${overlayRelativeToRoot.width}px;height:${overlayRelativeToRoot.height}px;z-index:9999;border-radius: var(--enlarge-radius, 32px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${this.config.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;
    const originalImg = overlay.querySelector("img");
    if (originalImg) {
      const img = originalImg.cloneNode();
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      animatingOverlay.appendChild(img);
    }
    overlay.remove();
    this.root.appendChild(animatingOverlay);
    void animatingOverlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      animatingOverlay.style.left = originalPosRelativeToRoot.left + "px";
      animatingOverlay.style.top = originalPosRelativeToRoot.top + "px";
      animatingOverlay.style.width = originalPosRelativeToRoot.width + "px";
      animatingOverlay.style.height = originalPosRelativeToRoot.height + "px";
      animatingOverlay.style.opacity = "0";
    });
    const cleanup = () => {
      animatingOverlay.remove();
      this.originalTilePosition = null;
      if (refDiv) refDiv.remove();
      parent.style.transition = "none";
      el.style.transition = "none";
      parent.style.setProperty("--rot-y-delta", "0deg");
      parent.style.setProperty("--rot-x-delta", "0deg");
      requestAnimationFrame(() => {
        el.style.visibility = "";
        el.style.opacity = "0";
        el.style.zIndex = 0;
        this.focusedEl = null;
        this.root?.removeAttribute("data-enlarging");
        requestAnimationFrame(() => {
          parent.style.transition = "";
          el.style.transition = "opacity 300ms ease-out";
          requestAnimationFrame(() => {
            el.style.opacity = "1";
            setTimeout(() => {
              el.style.transition = "";
              el.style.opacity = "";
              this.opening = false;
            }, 300);
          });
        });
      });
    };
    animatingOverlay.addEventListener("transitionend", cleanup, { once: true });
  }

  setupCloseEvents() {
    this.scrim.addEventListener("click", this.closeEnlarged.bind(this));

    const onKey = (e) => {
      if (e.key === "Escape") this.closeEnlarged();
    };
    window.addEventListener("keydown", onKey);
  }

  openItemFromElement(el) {
    if (this.opening) return;
    this.opening = true;
    this.openStartedAt = performance.now();
    const parent = el.parentElement;
    this.focusedEl = el;
    el.setAttribute("data-focused", "true");
    const offsetX = this.getDataNumber(parent, "offsetX", 0);
    const offsetY = this.getDataNumber(parent, "offsetY", 0);
    const sizeX = this.getDataNumber(parent, "sizeX", 2);
    const sizeY = this.getDataNumber(parent, "sizeY", 2);
    const parentRot = this.computeItemBaseRotation(
      offsetX,
      offsetY,
      sizeX,
      sizeY,
      this.config.segments
    );
    const parentY = this.normalizeAngle(parentRot.rotateY);
    const globalY = this.normalizeAngle(this.rotation.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - this.rotation.x;
    parent.style.setProperty("--rot-y-delta", `${rotY}deg`);
    parent.style.setProperty("--rot-x-delta", `${rotX}deg`);
    const refDiv = document.createElement("div");
    refDiv.className = "world-item__image world-item__image--reference";
    refDiv.style.opacity = "0";
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);
    const tileR = refDiv.getBoundingClientRect();
    const mainR = document.querySelector(".world-main").getBoundingClientRect();
    const frameR = this.frame.getBoundingClientRect();
    this.originalTilePosition = {
      left: tileR.left,
      top: tileR.top,
      width: tileR.width,
      height: tileR.height,
    };
    el.style.visibility = "hidden";
    el.style.zIndex = 0;
    const overlay = document.createElement("div");
    overlay.className = "world-enlarge";
    overlay.style.position = "absolute";
    overlay.style.left = frameR.left - mainR.left + "px";
    overlay.style.top = frameR.top - mainR.top + "px";
    overlay.style.width = frameR.width + "px";
    overlay.style.height = frameR.height + "px";
    overlay.style.opacity = "0";
    overlay.style.zIndex = "30";
    overlay.style.willChange = "transform, opacity";
    overlay.style.transformOrigin = "top left";
    overlay.style.transition = `transform ${this.config.enlargeTransitionMs}ms ease, opacity ${this.config.enlargeTransitionMs}ms ease`;
    const rawSrc = parent.dataset.src || el.querySelector("img")?.src || "";
    const img = document.createElement("img");
    img.src = rawSrc;
    overlay.appendChild(img);
    this.viewer.appendChild(overlay);
    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;
    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${sx0}, ${sy0})`;
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      overlay.style.transform = "translate(0px, 0px) scale(1,1)";
      this.root?.setAttribute("data-enlarging", "true");
    });
    const wantsResize =
      this.config.openedImageWidth || this.config.openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = (ev) => {
        if (ev.propertyName !== "transform") return;
        overlay.removeEventListener("transitionend", onFirstEnd);
        const prevTransition = overlay.style.transition;
        overlay.style.transition = "none";
        const tempWidth = this.config.openedImageWidth || `${frameR.width}px`;
        const tempHeight =
          this.config.openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + "px";
        overlay.style.height = frameR.height + "px";
        void overlay.offsetWidth;
        overlay.style.transition = `left ${this.config.enlargeTransitionMs}ms ease, top ${this.config.enlargeTransitionMs}ms ease, width ${this.config.enlargeTransitionMs}ms ease, height ${this.config.enlargeTransitionMs}ms ease`;
        const centeredLeft =
          frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop =
          frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });
        const cleanupSecond = () => {
          overlay.removeEventListener("transitionend", cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener("transitionend", cleanupSecond, {
          once: true,
        });
      };
      overlay.addEventListener("transitionend", onFirstEnd);
    }
  }

  onTileClick(e) {
    if (this.dragging) return;
    if (performance.now() - this.lastDragEndAt < 80) return;
    if (this.opening) return;
    this.openItemFromElement(e.currentTarget);
  }

  onTilePointerUp(e) {
    if (e.pointerType !== "touch") return;
    if (this.dragging) return;
    if (performance.now() - this.lastDragEndAt < 80) return;
    if (this.opening) return;
    this.openItemFromElement(e.currentTarget);
  }

  onTileTouchEnd(e) {
    if (this.dragging) return;
    if (performance.now() - this.lastDragEndAt < 80) return;
    if (this.opening) return;
    this.openItemFromElement(e.currentTarget);
  }

  setupTileEvents() {
    // This will be called after the tiles are created
    const tiles = document.querySelectorAll(".world-item__image");
    tiles.forEach((tile) => {
      tile.addEventListener("click", this.onTileClick.bind(this));
      tile.addEventListener("pointerup", this.onTilePointerUp.bind(this));
      tile.addEventListener("touchend", this.onTileTouchEnd.bind(this));
    });
  }

  init() {
    // Set initial CSS variables
    this.root.style.setProperty("--segments-x", this.config.segments);
    this.root.style.setProperty("--segments-y", this.config.segments);
    this.root.style.setProperty(
      "--overlay-blur-color",
      this.config.overlayBlurColor
    );
    this.root.style.setProperty("--tile-radius", this.config.imageBorderRadius);
    this.root.style.setProperty(
      "--enlarge-radius",
      this.config.openedImageBorderRadius
    );
    this.root.style.setProperty(
      "--image-filter",
      this.config.grayscale ? "grayscale(1)" : "none"
    );

    // Build and render items
    const items = this.buildItems(this.config.images, this.config.segments);

    items.forEach((it, i) => {
      const itemEl = document.createElement("div");
      itemEl.className = "world-item";
      itemEl.dataset.src = it.src;
      itemEl.dataset.offsetX = it.x;
      itemEl.dataset.offsetY = it.y;
      itemEl.dataset.sizeX = it.sizeX;
      itemEl.dataset.sizeY = it.sizeY;
      itemEl.style.setProperty("--offset-x", it.x);
      itemEl.style.setProperty("--offset-y", it.y);
      itemEl.style.setProperty("--item-size-x", it.sizeX);
      itemEl.style.setProperty("--item-size-y", it.sizeY);

      const imageEl = document.createElement("div");
      imageEl.className = "world-item__image";
      imageEl.setAttribute("role", "button");
      imageEl.setAttribute("tabIndex", "0");
      imageEl.setAttribute("aria-label", it.alt || "Open image");

      const img = document.createElement("img");
      img.src = it.src;
      img.draggable = false;
      img.alt = it.alt;

      imageEl.appendChild(img);
      itemEl.appendChild(imageEl);
      this.sphere.appendChild(itemEl);
    });

    // Apply initial transform
    this.applyTransform(this.rotation.x, this.rotation.y);

    // Setup events
    this.setupDragEvents();
    this.setupResizeObserver();
    this.setupCloseEvents();
    this.setupTileEvents();
  }
}

// Initialize the gallery when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WorldDomeGallery();
});

// Mobile touch event handler to ensure buttons work
document.addEventListener("DOMContentLoaded", function () {
  // Add touch event listeners to ensure buttons work on mobile
  const buttons = document.querySelectorAll(".home-space-button");

  buttons.forEach((button) => {
    // Prevent default touch behavior that might interfere
    button.addEventListener(
      "touchstart",
      function (e) {
        e.stopPropagation();
      },
      { passive: true }
    );

    button.addEventListener(
      "touchend",
      function (e) {
        e.stopPropagation();
      },
      { passive: true }
    );
  });
});

//Domains section

// DOMAIN CARDS INTERACTIVITY
        document.addEventListener("DOMContentLoaded", function () {
            const domainCards = document.querySelectorAll(".domains-card");

            domainCards.forEach((card) => {
                const cardData = card.querySelector(".domains-card-data");

                card.addEventListener("mouseenter", function () {
                    // Show data animation
                    cardData.style.animation = "domains-show-data 1s forwards";
                    cardData.style.opacity = "1";
                    cardData.style.transition = "opacity 0.3s";

                    // Remove overflow animation
                    card.style.animation = "domains-remove-overflow 2s forwards";
                });

                card.addEventListener("mouseleave", function () {
                    // Remove data animation
                    cardData.style.animation = "domains-remove-data 1s forwards";

                    // Show overflow animation
                    card.style.animation = "domains-show-overflow 2s forwards";

                    // After animation completes, reset opacity with delay
                    setTimeout(() => {
                        if (!card.matches(":hover")) {
                            cardData.style.opacity = "0";
                        }
                    }, 1000);
                });
            });

            // Add animation to heading letters
            const letters = document.querySelectorAll('.domains-heading-small div div');
            letters.forEach((letter, index) => {
                letter.style.animationDelay = `${index * 0.1}s`;
                letter.style.animation = `domains-slideIn 0.8s ease forwards`;
            });
        });

        // Add CSS animation for heading
        const style = document.createElement('style');
        style.textContent = `
            @keyframes domains-slideIn {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

//domain section ends 

//timeline section starts
// Progress bar animation
        function initTimelineProgress() {
            const progressBar = document.getElementById("timeline-progressBar");
            const timelineEvents = document.querySelectorAll(".timeline-event");
            const eventMarkers = document.querySelectorAll(".timeline-event-marker");
            const eventDescriptions = document.querySelectorAll(
                ".timeline-event-description"
            );

            // Initially hide the progress bar completely
            progressBar.style.opacity = "0";
            progressBar.style.height = "0%";

            let hasUserScrolled = false;
            let progressBarVisible = false;

            // Track if user has started scrolling
            window.addEventListener("scroll", function () {
                if (!hasUserScrolled) {
                    hasUserScrolled = window.pageYOffset > 10;
                }
            });

            window.addEventListener("scroll", function () {
                const timelineComponent = document.querySelector(".timeline-component");
                const timelineRect = timelineComponent.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

                // Only activate if user has actually scrolled AND timeline is in view
                const timelineInView =
                    timelineRect.top < windowHeight * 0.8 &&
                    timelineRect.bottom > windowHeight * 0.2;

                if (hasUserScrolled && timelineInView) {
                    if (!progressBarVisible) {
                        // Show progress bar with fade-in effect
                        progressBar.style.opacity = "1";
                        progressBarVisible = true;
                    }

                    // Calculate progress based on timeline visibility
                    const timelineStart = scrollTop + timelineRect.top;
                    const timelineEnd = timelineStart + timelineRect.height;
                    const viewportMiddle = scrollTop + windowHeight / 2;

                    // Calculate how much of the timeline has been scrolled through
                    const timelineScrollStart = timelineStart - windowHeight * 0.3;
                    const timelineScrollEnd = timelineEnd - windowHeight * 0.7;
                    const scrollRange = timelineScrollEnd - timelineScrollStart;

                    if (scrollRange > 0) {
                        const currentScroll = Math.max(
                            0,
                            Math.min(scrollRange, scrollTop - timelineScrollStart)
                        );
                        const progressPercentage = (currentScroll / scrollRange) * 100;
                        progressBar.style.height =
                            Math.max(0, Math.min(100, progressPercentage)) + "%";
                    }
                } else {
                    // Hide progress bar when not in timeline section or if user hasn't scrolled yet
                    if (progressBarVisible) {
                        progressBar.style.opacity = "0";
                        progressBarVisible = false;
                    }
                    progressBar.style.height = "0%";
                }

                // Update active states based on scroll position
                timelineEvents.forEach((event, index) => {
                    const rect = event.getBoundingClientRect();
                    const isVisible =
                        rect.top < window.innerHeight * 0.7 &&
                        rect.bottom > window.innerHeight * 0.3;

                    if (isVisible) {
                        eventMarkers[index].classList.add("active");
                        eventDescriptions[index].classList.add("active");
                    } else {
                        eventMarkers[index].classList.remove("active");
                        eventDescriptions[index].classList.remove("active");
                    }
                });
            });

            // Small delay to ensure DOM is fully ready
            setTimeout(() => {
                window.dispatchEvent(new Event("scroll"));
            }, 100);
        }

        // Initialize on DOM ready
        document.addEventListener("DOMContentLoaded", function () {
            initTimelineProgress();
        });

        //timeline section ends

        //full sponser section starts

        function viewSponsorshipDeck() {
          // Open the sponsorship deck in a new browser tab for viewing
          window.open("PEC-Hacks-3.0-Sponsorship-Deck.pdf", "_blank");
        }

        //full sponser section ends


