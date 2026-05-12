import { useCallback } from "react";
import { Box, Zoom, Fab } from "@mui/material";
import { ArrowUpward } from "@mui/icons-material";
import useScrollTrigger from "@mui/material/useScrollTrigger";

const ScrollToTopFab = () => {
  // Use `window` instead of `body` as `document` will be `undefined` when the
  // hooks first runs. By default, useScrollTrigger will attach itself to `window`.
  const trigger = useScrollTrigger({
    // Number of pixels needed to scroll to toggle `trigger` to `true`.
    threshold: 100,
  });
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return (
    <Zoom in={trigger}>
      <Box
        role="presentation"
        // Place the button in the bottom right corner.
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1,
        }}
      >
        <Fab
          onClick={scrollToTop}
          color="primary"
          size="small"
          aria-label="Scroll back to top"
          title="Scroll back to top"
        >
          <ArrowUpward fontSize="medium" sx={{ color: "#000000" }} />
        </Fab>
      </Box>
    </Zoom>
  );
};

export default ScrollToTopFab;
