import { configureStore } from "@reduxjs/toolkit";
import globalReducer from "state/slices/globalSlice";
import studySetsReducer from "state/slices/studysetsSlice";
import api from "./api/api";

const {reducerPath: apiPath, reducer: apiReducer} = api;

export const store = configureStore({
    reducer: {
        [apiPath]: apiReducer,
        global: globalReducer,
        studySets: studySetsReducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(api.middleware);
    },
    devTools: process.env.NODE_ENV !== "production",
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
// export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;
