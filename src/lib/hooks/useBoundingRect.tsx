import { useState, useEffect } from 'react';

const useBoundingRect = (ref) => {
  const [boundingRect, setBoundingRect] = useState<DOMRect | null> (null);

  useEffect(() => {
    const updateBoundingRect = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setBoundingRect(rect);
      }
    };

    // Initial update
    updateBoundingRect();

    // Event listener for window resize
    window.addEventListener('resize', updateBoundingRect);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('resize', updateBoundingRect);
    };
  }, [ref]);

  return boundingRect;
};

export default useBoundingRect;
