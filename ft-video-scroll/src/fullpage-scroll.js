import fullpage from "fullpage.js";

export class FullpageScroll {
  constructor(options) {
    this.options = {
      sectionSelector: ".section",
      navigation: true,
      scrollingSpeed: 1000,
      easing: "easeInOutCubic",
      loopBottom: false,
      loopTop: false,
      css3: true,
      scrollBar: false,
      anchors: [
        "section1",
        "section2",
        "section3",
        "section4",
        "section5",
        "section6",
        "section7",
        "section8",
        "section9",
        "section10",
      ],
      navigationTooltips: [
        "Section 1",
        "Section 2",
        "Section 3",
        "Section 4",
        "Section 5",
        "Section 6",
        "Section 7",
        "Section 8",
        "Section 9",
        "Section 10",
      ],
      showActiveTooltip: true,
      ...options,
    };

    this.fullpage = null;
    this.videoScroll = null;
    this.init();
  }

  init() {
    this.fullpage = new fullpage("#fullpage", {
      ...this.options,
      onLeave: (origin, destination, direction) => {
        if (this.videoScroll && !this.videoScroll.isScrollAllowed) {
          return false;
        }
        console.log(
          `Leaving section ${origin.index + 1}, going to ${destination.index + 1}, direction: ${direction}`,
        );
        this.handleSectionChange(destination.index + 1, direction);
        return true;
      },
      afterLoad: (origin, destination, direction) => {
        console.log(`Loaded section ${destination.index + 1}`);
      },
    });
  }

  setVideoScroll(videoScroll) {
    this.videoScroll = videoScroll;
  }

  handleSectionChange(index, direction) {
    console.log(
      `FullpageScroll: Changing to section ${index}, direction: ${direction}`,
    );
    const event = new CustomEvent("nextPlayIndex", {
      detail: { nextPlayIndex: index, direction: direction },
    });
    document.dispatchEvent(event);
  }

  moveTo(index) {
    this.fullpage.moveTo(index);
  }

  moveUp() {
    this.fullpage.moveSectionUp();
  }

  moveDown() {
    this.fullpage.moveSectionDown();
  }
}
