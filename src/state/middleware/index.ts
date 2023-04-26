// import { Middleware } from "@reduxjs/toolkit";
// import { AnyAction } from "redux";
// import { useBaseQuery } from "@reduxjs/toolkit/query";
// import { store } from "src/state/store";

// import {
//     selectSelectedStudySet,
//     setSelectedStudySet,
// } from "src/state/slices/studysetsSlice";

// export const updateSelectedStudySetMiddleware: Middleware =
//     () => (next) => (action: AnyAction) => {
//         const queryAction = useBaseQuery.match(action);

//         if (queryAction) {
//             const { requestId } = queryAction.meta;
//             const state = store.getState();
//             const selectedStudySet = selectSelectedStudySet(state);

//             // If a mutation is being made on a study set,
//             // update the selected study set in the Redux store.
//             if (requestId && selectedStudySet?.uuid === action.payload.uuid) {
//                 store.dispatch(setSelectedStudySet(action.payload.uuid));
//             }
//         }

//         return next(action);
//     };
