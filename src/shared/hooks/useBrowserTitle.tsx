import { useEffect } from "react";

export default function useBrowserTitle(title: string) {
    useEffect(() => {
        document.title = `Quizaroni | ${title}`;
        return () => {
            document.title = "Quizaroni";
        };
    }, [title]);
}
