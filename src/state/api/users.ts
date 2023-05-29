import api from "./api";
import {
} from "lib/types";


/* Endpoints
	router.post("/api/studysets/create", createStudySet);

*/

export const usersApi = api.injectEndpoints({
    endpoints: (build) => ({
        getStudyset: build.query<any, any>({
            query: ({ uuid }) => ({
                url: "studysets/get",
                method: "GET",
                params: { uuid },
            }),
            providesTags: (result, error, arg) => [
                { type: "Studyset", id: result?.uuid },
            ],
        }),
    }),
});

export const {


} = usersApi;