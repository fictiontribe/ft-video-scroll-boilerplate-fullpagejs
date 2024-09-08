import fullpage from "fullpage.js";
import lottie from "lottie-web";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);


const videoHero = document.getElementById("video-hero");
const loaderContainer = document.getElementById("loader-container");
const loaderPercentage = document.getElementById("loader-percentage");

// Configuration
const ENABLE_SECTION_PROGRESS = true;
const SECTION_DURATION = 5000; // 5 seconds
const NUM_OF_SLIDES = 12;

let currentSectionTimer;

const srcDesktop = new URL(
  "https://customer-vphn1rt580wkipy2.cloudflarestream.com/9b32b7d15e079b61d8bd5f95988d0901/downloads/default.mp4",
  import.meta.url,
).href;
const srcMobile = new URL(
  "https://customer-vphn1rt580wkipy2.cloudflarestream.com/5bced2acf51a2177b15cafcf2fdd30e8/downloads/default.mp4",
  import.meta.url,
).href;

const isMobile = window.innerWidth <= 991;
let currentIndex = 0;
const fps = 24;
let debounceTimer;

// Initialize Lottie
const lottieLoader = lottie.loadAnimation({
  container: document.getElementById("lottie-loader"),
  renderer: "svg",
  loop: true,
  autoplay: true,
  path: "loader.json", // Replace with your Lottie animation file
});

// Update the startSectionProgress function
function startSectionProgress(index) {
  if (!ENABLE_SECTION_PROGRESS || !isAutoscrollEnabled) return;

  // Clear any existing timers
  stopSectionProgress();

  setActiveIndicator(index);

  const navItems = document.querySelectorAll("#fp-nav ul li");
  if (navItems.length > index) {
    const navItem = navItems[index].querySelector("a");
    if (navItem) {
      // Use requestAnimationFrame to ensure the active class is applied before adding fill
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          navItem.classList.add("fill");
        });
      });

      if (ENABLE_SECTION_PROGRESS && isAutoscrollEnabled) {
        // Clear the existing timer before setting a new one
        if (currentSectionTimer) {
          clearTimeout(currentSectionTimer);
        }
        currentSectionTimer = setTimeout(() => {
          fullpage_api.moveSectionDown();
        }, SECTION_DURATION);
      }
    }
  }
}

function stopSectionProgress() {
  if (!ENABLE_SECTION_PROGRESS) return;

  clearTimeout(currentSectionTimer);
  document.querySelectorAll("#fp-nav ul li a").forEach((item) => {
    item.classList.remove("fill");
  });
}

function convertTimeToSeconds(time) {
  if (!time) return 0;
  const [min, sec, frames] = time.split(":");
  return parseInt(min) * 60 + parseInt(sec) + parseInt(frames) / fps;
}

function getCurrentSectionName() {
  const currentSection = document.querySelector(".section.active");
  return currentSection
    ? currentSection.getAttribute("data-section-name")
    : null;
}

let isPlaying = false;
let isLooping = false;
let isTransitioning = false;
let currentTransition = null;

let isAutoscrollEnabled = false;
const autoscrollToggle = document.getElementById("autoscrollToggle");

function toggleAutoscroll() {
  isAutoscrollEnabled = autoscrollToggle.checked;
  if (isAutoscrollEnabled) {
    // Get the current active section index
    const currentIndex = fullpage_api.getActiveSection().index;

    // Immediately start the section progress for the current section
    startSectionProgress(currentIndex);
  } else {
    stopSectionProgress();
  }
}

function updateVideoTime(index, reverse = false) {
  return new Promise((resolve, reject) => {
    if (currentTransition) {
      currentTransition.cancel();
    }

    let isCancelled = false;
    currentTransition = {
      cancel: () => {
        isCancelled = true;
        videoHero.pause();
        isTransitioning = false;
        fullpage_api.setAllowScrolling(true);
        resolve();
      },
    };

    if (isTransitioning) {
      videoHero.pause();
    }
    isTransitioning = true;
    isPlaying = true;
    isLooping = false;

    fullpage_api.setAllowScrolling(false);

    let section, startTime, endTime;

    if (reverse) {
      section = document.querySelector(`#section-${index + 1}`);
      startTime = convertTimeToSeconds(section.dataset.transitionstartbackward);
      endTime = convertTimeToSeconds(section.dataset.transitionendbackward);
    } else {
      section = document.querySelector(`#section-${index + 1}`);
      startTime = convertTimeToSeconds(section.dataset.transitionstart);
      endTime = convertTimeToSeconds(section.dataset.transitionend);
    }

    if (
      !section ||
      isNaN(startTime) ||
      isNaN(endTime) ||
      startTime === 0 ||
      endTime === 0
    ) {
      console.error("Invalid section or time data", section?.id);
      isPlaying = false;
      isTransitioning = false;
      fullpage_api.setAllowScrolling(true);
      currentTransition = null;
      return reject(new Error("Invalid section or time data"));
    }

    videoHero.currentTime = startTime;
    videoHero.playbackRate = 1;

    videoHero
      .play()
      .then(() => {
        console.log(
          `Playing transition: startTime = ${startTime.toFixed(3)}, endTime = ${endTime.toFixed(3)}`,
        );
        const checkTime = () => {
          if (isCancelled) return;

          const currentTime = videoHero.currentTime;
          if (currentTime >= endTime) {
            videoHero.pause();
            isPlaying = false;
            setTimeout(() => {
              if (!isCancelled) {
                fullpage_api.setAllowScrolling(true);
                isTransitioning = false;
              }
            }, 250);

            const targetSection = reverse
              ? document.querySelector(`#section-${index}`)
              : section;

            if (targetSection && !isCancelled) {
              const loopStart = convertTimeToSeconds(
                targetSection.dataset.loopstart,
              );
              const loopEnd = convertTimeToSeconds(
                targetSection.dataset.loopend,
              );
              startLoopingVideo(loopStart, loopEnd).then(resolve).catch(reject);
            } else {
              resolve();
            }
            currentTransition = null;
          } else {
            requestAnimationFrame(checkTime);
          }
        };
        requestAnimationFrame(checkTime);
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error("Error playing video:", error);
          isPlaying = false;
          isTransitioning = false;
          fullpage_api.setAllowScrolling(true);
          currentTransition = null;
          reject(error);
        }
      });
  });
}

function startLoopingVideo(loopStart, loopEnd) {
  return new Promise((resolve, reject) => {
    isLooping = true;
    videoHero.currentTime = loopStart;
    videoHero.playbackRate = 1;

    const loopCheck = () => {
      if (!isLooping) return resolve();
      const currentTime = videoHero.currentTime;
      if (currentTime >= loopEnd) {
        videoHero.currentTime = loopStart;
      }
      requestAnimationFrame(loopCheck);
    };

    videoHero
      .play()
      .then(() => {
        requestAnimationFrame(loopCheck);
      })
      .catch((error) => {
        console.error("Error playing video:", error);
        reject(error);
      });
  });
}

function animateLoader(duration, onUpdate) {
  const startTime = Date.now();

  function update() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    onUpdate(Math.round(progress * 100));

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  update();
}

async function loadVideo() {
  const videoSrc = isMobile ? srcMobile : srcDesktop;
  let loadingComplete = false;
  let actualProgress = 0;

  animateLoader(750, (animatedProgress) => {
    if (!loadingComplete) {
      loaderPercentage.textContent = `${Math.max(actualProgress, animatedProgress)}%`;
    }
  });

  return new Promise((resolve, reject) => {
    videoHero.src = videoSrc;
    videoHero.load();

    videoHero.onloadeddata = () => {
      loadingComplete = true;
      resolve();
    };

    videoHero.onerror = (error) => {
      console.error("Video loading error:", error);
      reject(new Error("Failed to load video"));
    };

    // Simulated loading progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      actualProgress = Math.min(progress, 100);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 300);
  });
}

async function initializeVideo() {
  try {
    await loadVideo();
    loaderContainer.style.display = "none";
    videoHero.style.display = "block";

    if (isMobile) {
      // For mobile, show a play button
      // createPlayButton();
      const firstSection = document.querySelector("#section-1");
      if (firstSection) {
        const loopStart = convertTimeToSeconds(firstSection.dataset.loopstart);
        const loopEnd = convertTimeToSeconds(firstSection.dataset.loopend);
        startLoopingVideo(loopStart, loopEnd).catch(console.error);
      }
    } else {
      // For desktop, attempt to autoplay
      try {
        await videoHero.play();
        // Start the first section's loop
        const firstSection = document.querySelector("#section-1");
        if (firstSection) {
          const loopStart = convertTimeToSeconds(
            firstSection.dataset.loopstart,
          );
          const loopEnd = convertTimeToSeconds(firstSection.dataset.loopend);
          startLoopingVideo(loopStart, loopEnd).catch(console.error);
        }
      } catch (playError) {
        console.warn("Autoplay prevented. Showing play button.", playError);
        createPlayButton();
      }
    }
  } catch (error) {
    console.error("Error loading video:", error);
    loaderPercentage.textContent =
      "Error loading video. Please check your internet connection and try again.";
    throw error;
  }
}

function createPlayButton() {
  const playButton = document.createElement("button");
  playButton.textContent = "Play Video";
  playButton.style.position = "absolute";
  playButton.style.zIndex = "1000";
  playButton.style.top = "50%";
  playButton.style.left = "50%";
  playButton.style.transform = "translate(-50%, -50%)";
  playButton.onclick = () => {
    videoHero
      .play()
      .then(() => {
        playButton.remove();
        // Start the first section's loop
        const firstSection = document.querySelector("#section-1");
        if (firstSection) {
          const loopStart = convertTimeToSeconds(
            firstSection.dataset.loopstart,
          );
          const loopEnd = convertTimeToSeconds(firstSection.dataset.loopend);
          startLoopingVideo(loopStart, loopEnd).catch(console.error);
        }
      })
      .catch((error) => {
        console.error("Error playing video:", error);
        alert("Unable to play video. Please check your browser settings.");
      });
  };
  document.body.appendChild(playButton);
}

async function initializeFirstSection() {
  const firstSection = document.querySelector("#section-1");
  if (firstSection) {
    const loopStart = convertTimeToSeconds(firstSection.dataset.loopstart);
    const loopEnd = convertTimeToSeconds(firstSection.dataset.loopend);
    await startLoopingVideo(loopStart, loopEnd);

    // Animate the first section's text
    animateSection(null, { item: firstSection }, "down");
  } else {
    console.error("First section not found");
  }
}

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, delay);
}

function animateSection(origin, destination, direction) {
  const destinationTitle = destination.item.querySelector(".section-title");
  const destinationText = destination.item.querySelector(".section-text");

  const duration = 1; // Duration of the animation in seconds
  const stagger = 0.2; // Stagger between title and text animations

  // Determine the direction of the animation
  const yFrom = direction === "down" ? 50 : -50;

  if (origin) {
    const originTitle = origin.item.querySelector(".section-title");
    const originText = origin.item.querySelector(".section-text");
    const yTo = direction === "down" ? -50 : 50;

    // Animate out the origin section
    gsap.to([originTitle, originText], {
      y: yTo,
      opacity: 0,
      duration: duration,
      stagger: stagger,
      ease: "power3.in",
    });
  }

  // Animate in the destination section
  gsap.fromTo(
    [destinationTitle, destinationText],
    {
      y: yFrom,
      opacity: 0,
    },
    {
      y: 0,
      opacity: 1,
      duration: duration,
      stagger: stagger,
      ease: "power3.out",
      delay: origin ? duration / 2 : 0, // Start halfway through the out animation if there's an origin
    },
  );
}

function initializeNavigation() {
  console.log("Initializing navigation");

  const navigationElements = {
    up: ['.arrow-up', '.frame-button-up'],
    down: ['.arrow-down', '.frame-button-down']
  };

  const addClickListeners = (selectors, direction) => {
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`${direction} element found:`, element);
        element.addEventListener("click", () => {
          console.log(`${direction} button clicked`);
          stopSectionProgress();
          fullpage_api[`moveSection${direction.charAt(0).toUpperCase() + direction.slice(1)}`]();
        });
      } else {
        console.log(`${direction} element not found for selector: ${selector}`);
      }
    });
  };

  addClickListeners(navigationElements.up, 'up');
  addClickListeners(navigationElements.down, 'down');

  // Start the progress for the initial section
  if (ENABLE_SECTION_PROGRESS) {
    startSectionProgress(fullpage_api.getActiveSection().index);
  }
}

function updateNavigationVisibility(index, totalSections) {
  const elements = {
    up: ['.arrow-up', '.frame-button-up'],
    down: ['.arrow-down', '.frame-button-down']
  };

  const setDisplay = (selectors, condition) => {
    selectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = condition ? 'flex' : 'none';
      }
    });
  };

  setDisplay(elements.up, index !== 0);
  setDisplay(elements.down, index !== totalSections - 1);
}

function setActiveIndicator(index) {
  const navItems = document.querySelectorAll("#fp-nav ul li");
  navItems.forEach((item, i) => {
    const link = item.querySelector("a");
    if (i === index) {
      item.classList.add("active");
      if (link) link.classList.add("active");
    } else {
      item.classList.remove("active");
      if (link) link.classList.remove("active");
    }
  });
}

function createDebugOverlay() {
  const debugOverlay = document.createElement('div');
  debugOverlay.id = 'debug-overlay';
  debugOverlay.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
    overflow: hidden;
  `;
  document.body.appendChild(debugOverlay);

  function updateDebugInfo() {
    const currentSection = document.querySelector('.section.active');
    const currentIndex = fullpage_api.getActiveSection().index;
    const sectionData = currentSection.dataset;
    const currentTime = videoHero.currentTime;

    const debugInfo = `
      Current Slide: ${currentIndex + 1}
      Section Name: ${sectionData.sectionName}
      Current Time: ${currentTime.toFixed(3)}s
      Loop Start: ${convertTimeToSeconds(sectionData.loopstart).toFixed(3)}s
      Loop End: ${convertTimeToSeconds(sectionData.loopend).toFixed(3)}s
      Transition Start: ${convertTimeToSeconds(sectionData.transitionstart).toFixed(3)}s
      Transition End: ${convertTimeToSeconds(sectionData.transitionend).toFixed(3)}s
      Backward Start: ${convertTimeToSeconds(sectionData.transitionstartbackward).toFixed(3)}s
      Backward End: ${convertTimeToSeconds(sectionData.transitionendbackward).toFixed(3)}s
      Is Looping: ${isLooping}
      Is Transitioning: ${isTransitioning}
      Playback Rate: ${videoHero.playbackRate}
    `;

    debugOverlay.textContent = debugInfo.trim();
  }

  // Update debug info every frame
  function animateDebugInfo() {
    updateDebugInfo();
    requestAnimationFrame(animateDebugInfo);
  }

  // Start the animation loop
  animateDebugInfo();

  // Toggle debug overlay visibility
  const toggleDebug = (event) => {
    if (event.key === 'd' && event.ctrlKey) {
      debugOverlay.style.display = debugOverlay.style.display === 'none' ? 'block' : 'none';
    }
  };

  document.addEventListener('keydown', toggleDebug);

  return debugOverlay;
}

function initializeDebugOverlay() {
  // if (process.env.NODE_ENV === 'development') {
    createDebugOverlay();
    console.log('Debug overlay initialized. Press Ctrl+D to toggle visibility.');
  // }
}

document.addEventListener("DOMContentLoaded", async () => {
  videoHero.style.display = "none"; // Hide video initially

  try {
    await initializeVideo(); // Use the new initializeVideo function

    const sections = document.querySelectorAll(".section");
    const sectionNames = Array.from(sections).map((section) =>
      section.getAttribute("data-section-name"),
    );
    const sectionAnchors = Array.from(sections).map((section) =>
      section.getAttribute("data-anchor"),
    );

    // Function to initialize a specific section
    async function initializeSection(sectionIndex) {
      const section = document.querySelector(`#section-${sectionIndex + 1}`);
      if (section) {
        const loopStart = convertTimeToSeconds(section.dataset.loopstart);
        const loopEnd = convertTimeToSeconds(section.dataset.loopend);
        await startLoopingVideo(loopStart, loopEnd);
        animateSection(null, { item: section }, "down");
      } else {
        console.error(`Section ${sectionIndex + 1} not found`);
      }
    }

    let initialSectionIndex = 0;
    // Check if there's a hash in the URL
    const hash = window.location.hash;
    if (hash) {
      const sectionIndex = sectionAnchors.indexOf(hash.substring(1));
      if (sectionIndex !== -1) {
        initialSectionIndex = sectionIndex;
      }
    }

    const fullpageInstance = new fullpage("#fullpage", {
      anchors: sectionAnchors,
      menu: "#menu",
      css3: true,
      scrollingSpeed: 900,
      autoScrolling: true,
      fitToSection: true,
      fitToSectionDelay: 300,
      scrollBar: false,
      easing: "easeInOutCubic",
      easingcss3: "ease",
      loopBottom: false,
      loopTop: false,
      continuousVertical: false,
      normalScrollElements: "#element1, .element2",
      scrollOverflow: true,
      touchSensitivity: 15,
      normalScrollElementTouchThreshold: 5,
      bigSectionsDestination: null,
      navigation: true,
      navigationPosition: "left",
      navigationTooltips: sectionNames,
      showActiveTooltip: true,

      afterLoad: function (origin, destination, direction) {
        stopSectionProgress();
        if (isAutoscrollEnabled) {
          startSectionProgress(destination.index);
        }
      },

      afterRender: function () {
        updateNavigationVisibility(initialSectionIndex, NUM_OF_SLIDES);
        initializeSection(initialSectionIndex);

        // Delay setting the active indicator to ensure navigation is fully rendered
        setTimeout(() => {
          setActiveIndicator(initialSectionIndex);
          startSectionProgress(initialSectionIndex);
        }, 100);
      },

      onLeave: (origin, destination, direction) => {
        // Remove this line to allow navigation during transitions
        // if (isTransitioning) return false;

        isLooping = false;
        const transitionIndex =
          direction === "up" ? origin.index : destination.index;

        // Stop the current transition if it's in progress
        if (isTransitioning) {
          videoHero.pause();
          isTransitioning = false;
          fullpage_api.setAllowScrolling(true);
        }

        // Start the video transition
        updateVideoTime(transitionIndex, direction === "up").catch(
          console.error,
        );

        // Animate the sections
        animateSection(origin, destination, direction);
        updateNavigationVisibility(destination.index, NUM_OF_SLIDES);
        stopSectionProgress();
      },
    });

    initializeNavigation();

    // Disable clicking on the left menu
    const fpNav = document.getElementById("fp-nav");
    if (fpNav) {
      fpNav.style.pointerEvents = "none";
    }

    autoscrollToggle.addEventListener("change", toggleAutoscroll);

    // Debugger 
    initializeDebugOverlay();
  } catch (error) {
    console.error("Failed to initialize video or fullpage:", error);
    // Handle the error appropriately, maybe show a user-friendly message
    loaderPercentage.textContent =
      "Error loading content. Please refresh the page.";
  }
});
