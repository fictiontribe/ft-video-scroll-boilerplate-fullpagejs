export class VideoScroll {
  constructor(options) {
    this.options = {
      videoContainer: "#video-hero",
      sectionContainer: ".section",
      loaderWrapper: ".loader-wrapper",
      breakpoint: 991,
      frameGap: 0.1,
      easing: "ease",
      fps: 25,
      ...options,
    };

    this.video = document.querySelector(this.options.videoContainer);
    this.sections = document.querySelectorAll(this.options.sectionContainer);
    this.loaderWrapper = document.querySelector(this.options.loaderWrapper);
    this.loaderNumber = this.loaderWrapper.querySelector(".loader-number");

    this.isMobile = false;
    this.isPlaying = false;
    this.currentIndex = 0;
    this.positions = [];
    this.currentSection = null;
    this.isTransitioning = false;
    this.direction = "forward";
    this.transitionProgress = 0;
    this.animationFrame = null;
    this.lastUpdateTime = 0;
    this.frameInterval = 1000 / this.options.fps;
    this.videoBlob = null;
    this.isScrollAllowed = true;

    this.init();
  }

  async init() {
    console.log("Initializing VideoScroll");
    this.setupPositions();
    this.setupEventListeners();
    this.setContainerWidth();
    await this.loadVideoAsBlob();
  }

  setupPositions() {
    console.log("Setting up positions");
    this.positions = Array.from(this.sections).map((section) => ({
      loop: this.convertTimeRange([
        section.dataset.loopstart || "00:00:00",
        section.dataset.loopend || "00:00:00",
      ]),
      transition: {
        forward: this.convertTimeRange([
          section.dataset.transitionstart || "00:00:00",
          section.dataset.transitionend || "00:00:00",
        ]),
        backward: this.convertTimeRange([
          section.dataset.transitionstartbackward ||
            section.dataset.transitionstart ||
            "00:00:00",
          section.dataset.transitionendbackward ||
            section.dataset.transitionend ||
            "00:00:00",
        ]),
      },
      // Commented out linked section logic
      // linked: section.dataset.linked ? parseInt(section.dataset.linked) : null,
    }));
    console.log("Positions:", this.positions);
  }

  setupEventListeners() {
    console.log("Setting up event listeners");
    window.addEventListener("resize", () => this.setContainerWidth());
    document.addEventListener("nextPlayIndex", (event) =>
      this.handleSectionChange(
        event.detail.nextPlayIndex,
        event.detail.direction,
      ),
    );
  }

  setContainerWidth() {
    console.log("Setting container width");
    const viewWidth = window.innerWidth;
    if (
      viewWidth < this.options.breakpoint &&
      !document.body.classList.contains("mobile")
    ) {
      document.body.classList.remove("desktop");
      document.body.classList.add("mobile");
      this.isMobile = true;
      this.loadVideoAsBlob();
    } else if (
      viewWidth >= this.options.breakpoint &&
      !document.body.classList.contains("desktop")
    ) {
      document.body.classList.remove("mobile");
      document.body.classList.add("desktop");
      this.isMobile = false;
      this.loadVideoAsBlob();
    }
  }

  async loadVideoAsBlob() {
    console.log("Loading video as blob");
    this.loaderWrapper.classList.remove("hide");
    const videoSrc = this.isMobile
      ? this.options.srcMobile
      : this.options.srcDesktop;

    try {
      const response = await fetch(videoSrc);
      const blob = await response.blob();
      this.videoBlob = URL.createObjectURL(blob);
      this.video.src = this.videoBlob;

      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          console.log("Video metadata loaded successfully");
          resolve();
        };
      });

      console.log("Video loaded successfully");
      this.startVideo();
    } catch (error) {
      console.error("Error loading video:", error);
      this.handleVideoLoadError(error);
    }
  }

  handleVideoLoadError(error) {
    console.error("Video load error:", error);
    this.loaderWrapper.querySelector(".loader-number").textContent = "Error";
    const errorMessage = document.createElement("p");
    errorMessage.textContent = `Failed to load video. Please check the console for details.`;
    this.loaderWrapper.appendChild(errorMessage);
  }

  async startVideo() {
    console.log("Starting video");
    try {
      this.video.muted = true;
      await this.video.play();
      this.isPlaying = true;
      this.loaderWrapper.classList.add("hide");
      this.video.style.opacity = 1;
      this.setVideoToSection(0, "forward");
      this.startPlayback();
    } catch (error) {
      console.error("Error playing video:", error);
      this.loaderWrapper.querySelector(".loader-number").textContent =
        "Tap to Start";
      document.body.addEventListener("click", () => this.startVideo(), {
        once: true,
      });
    }
  }

  handleSectionChange(index, direction) {
    console.log(
      `Handling section change to index ${index}, direction: ${direction}`,
    );
    if (this.currentIndex !== index - 1) {
      this.isTransitioning = true;
      this.direction = direction;
      this.currentIndex = index - 1;
      this.transitionProgress = 0;
      this.setVideoToSection(this.currentIndex, direction);
      this.isScrollAllowed = false;
    }
  }

  setVideoToSection(index, direction) {
    console.log(`Setting video to section ${index}, direction: ${direction}`);
    this.currentSection = this.positions[index];
    if (this.currentSection) {
      const transitionTime =
        direction === "forward"
          ? this.currentSection.transition.forward[0]
          : this.currentSection.transition.backward[1];
      console.log(`Setting video time to ${transitionTime}`);
      this.video.currentTime = transitionTime;
    }
  }

  startPlayback() {
    console.log("Starting playback loop");
    let lastTime = performance.now();
    const animate = (time) => {
      const deltaTime = time - lastTime;
      if (deltaTime >= this.frameInterval) {
        this.updateVideoTime(deltaTime / 1000);
        lastTime = time;
      }
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  updateVideoTime(deltaTime) {
    if (!this.currentSection) return;

    let targetTime;
    const transitionDuration =
      this.direction === "forward"
        ? this.currentSection.transition.forward[1] -
          this.currentSection.transition.forward[0]
        : this.currentSection.transition.backward[1] -
          this.currentSection.transition.backward[0];

    if (this.isTransitioning) {
      this.transitionProgress += deltaTime;
      const progress = Math.min(
        this.transitionProgress / transitionDuration,
        1,
      );

      if (this.direction === "forward") {
        targetTime = this.lerp(
          this.currentSection.transition.forward[0],
          this.currentSection.transition.forward[1],
          progress,
        );
      } else {
        targetTime = this.lerp(
          this.currentSection.transition.backward[1],
          this.currentSection.transition.backward[0],
          progress,
        );
      }

      if (progress >= 1) {
        this.isTransitioning = false;
        this.isScrollAllowed = true;
        targetTime =
          this.direction === "forward"
            ? this.currentSection.loop[0]
            : this.currentSection.loop[1];
      }
    } else {
      const loopDuration =
        this.currentSection.loop[1] - this.currentSection.loop[0];
      let loopProgress;
      if (this.direction === "forward") {
        loopProgress =
          (this.video.currentTime - this.currentSection.loop[0] + deltaTime) /
          loopDuration;
        targetTime = this.lerp(
          this.currentSection.loop[0],
          this.currentSection.loop[1],
          loopProgress % 1,
        );
      } else {
        loopProgress =
          (this.currentSection.loop[1] - this.video.currentTime + deltaTime) /
          loopDuration;
        targetTime = this.lerp(
          this.currentSection.loop[1],
          this.currentSection.loop[0],
          loopProgress % 1,
        );
      }
    }

    this.video.currentTime = targetTime;

    // Removed linked section logic
  }

  lerp(start, end, t) {
    return start * (1 - t) + end * t;
  }

  convertTime(time) {
    const [min, sec, frames] = time ? time.split(":") : ["00", "00", "00"];
    return Math.max(
      parseInt(min) * 60 + parseInt(sec) + parseInt(frames) * (1 / 30),
      0.01,
    );
  }

  convertTimeRange(timeRange) {
    return [this.convertTime(timeRange[0]), this.convertTime(timeRange[1])];
  }
}
