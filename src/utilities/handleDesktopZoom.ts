export const handleDesktopZoom = () => {
    const { devicePixelRatio, innerWidth, innerHeight } = window;
    const { availHeight, availWidth } = window.screen;

    const defaultWidth = 1920;
    const rootSize = 16;
    const browserZoomModifier = availWidth / innerWidth;

    const newRootSize = rootSize * (innerWidth / defaultWidth) * browserZoomModifier;
    const adjustedRootSize = rootSize / devicePixelRatio;

    console.log("New Calculated Root Size = ", newRootSize);
    console.log("rootSize / devicePixelRatio = ", adjustedRootSize);

    console.log({ innerHeight, innerWidth, devicePixelRatio, availHeight, availWidth });
    document.querySelector("html").setAttribute("style", `font-size: ${adjustedRootSize}px`);
}