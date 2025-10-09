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

// starfield background ends

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
