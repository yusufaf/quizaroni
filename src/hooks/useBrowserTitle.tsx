import { useEffect } from "react";

const useBrowserTitle = (title: string) => {
  useEffect(() => {
    document.title = `Quizaroni | ${title}`;
    return () => {
      document.title = "Quizaroni";
    };
  }, [title]);
};

export default useBrowserTitle;
