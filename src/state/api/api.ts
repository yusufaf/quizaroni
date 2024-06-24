import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
	// baseUrl: "/api/",
});

// const retryBaseQuery = retry(baseQuery, { maxRetries: 2 });

const api = createApi({
	reducerPath: "api",
	baseQuery,
	tagTypes: ["Studyset", "User"],
	/*
		This API has the endpoints injected in adjacent files.
		The endpoints are defined in the adjacent files, and then
		injected into the API here.
	*/
	endpoints: () => ({}),
});
export default api;