export const updateBrowserTitle = (title: string) => {
    document.title = `Quizaroni | ${title}`
    return () => {
        document.title = `Quizaroni`;
    }
};

export const formatDate = (date: Date | Number | String) => {
    
}