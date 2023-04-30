import { configureStore } from "@reduxjs/toolkit";
import globalReducer from "state/slices/globalSlice";
import studySetsReducer from "state/slices/studysetsSlice";
import { api } from "./api/api";

const apiPath = api.reducerPath;

export const store = configureStore({
    reducer: {
        [apiPath]: api.reducer,
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
