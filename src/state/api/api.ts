import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'

const baseQuery = fetchBaseQuery({
    baseUrl: "/api/",
    // prepareHeaders
})

const retryBaseQuery = retry(baseQuery, { maxRetries: 2 });

export const api = createApi({
    reducerPath: "api",
    baseQuery: retryBaseQuery,
    tagTypes: ["Studysets", "Users"],
    /*
        This API has the endpoints injected in adjacent files.
        The endpoints are defined in the adjacent files, and then
        injected into the API here.
    */
   endpoints: () => ({}), 
});

