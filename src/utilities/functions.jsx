export const updateBrowserTitle = title => {
    document.title = `Quizaroni | ${title}`
    return () => {
        document.title = `Quizaroni`;
    }
};
