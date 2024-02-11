const BASE_API_URL = "https://30hl3jkdbg.execute-api.us-west-2.amazonaws.com/development/api";
const AWS_API_KEY = import.meta.env.VITE_AWS_API_KEY

const COMMON_REQUEST_PROPS: RequestInit = {
    mode: "no-cors",
    credentials: "omit",
    headers: {
        "Content-Type": "application/json",
        "X-Api-Key": AWS_API_KEY
    },
}

export const initiateMultipartUpload = async () => {
    const url = `${BASE_API_URL}/files/initiateMultipartUpload`
    return await fetch(url, {
        body: JSON.stringify({key: "deez"}),
        method: "POST",
        ...COMMON_REQUEST_PROPS
    })
}

export const getMultipartSignedUploadUrls = async () => {
    const url = `${BASE_API_URL}/files/getMultipartSignedUploadUrls`
    return await fetch(url, {
        body: JSON.stringify({key: "deez"}),
        method: "POST",
        ...COMMON_REQUEST_PROPS
    })
}

export const completeMultipartUpload = async () => {
    const url = `${BASE_API_URL}/files/completeMultipartUpload`
    return await fetch(url, {
        body: JSON.stringify({key: "deez"}),
        method: "POST",
        ...COMMON_REQUEST_PROPS
    })
}

export const deleteFile = async () => {
    const url = `${BASE_API_URL}/files/deleteFile`
    return await fetch(url, {
        body: JSON.stringify({key: "deez"}),
        method: "POST",
        ...COMMON_REQUEST_PROPS
    })
}