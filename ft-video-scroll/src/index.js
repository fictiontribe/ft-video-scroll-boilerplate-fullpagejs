import { VideoScroll } from "./video-scroll.js";
import { FullpageScroll } from "./fullpage-scroll.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Initializing application");

    const videoScroll = new VideoScroll({
      srcDesktop: new URL(
        "../ecfb9e00-feb9-4ee4-911e-a70ce8c32111.mp4",
        import.meta.url,
      ).href,
      srcMobile: new URL(
        "../ecfb9e00-feb9-4ee4-911e-a70ce8c32111.mp4",
        import.meta.url,
      ).href,
      fps: 25,
    });

    const fullpageScroll = new FullpageScroll();
    fullpageScroll.setVideoScroll(videoScroll);

    console.log("Application initialized successfully");
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});
