import { configureStore } from "@reduxjs/toolkit";
import globalReducer from "state/slices/globalSlice";
import studySetsReducer from "state/slices/studysetsSlice";
import viewSetsReducer from "state/slices/viewSetsSlice";
import createSetReducer from "state/slices/createSetSlice";
import api from "./api/api";
import loggerMiddleware from "./middleware/logger";

const isDevelopment = import.meta.env.DEV;

const { reducerPath: apiPath, reducer: apiReducer } = api;

const middlewares = [api.middleware];
if (isDevelopment) {
    middlewares.push(loggerMiddleware);
}

export const store = configureStore({
    reducer: {
        [apiPath]: apiReducer,
        globalState: globalReducer,
        studySets: studySetsReducer,
        viewSets: viewSetsReducer,
        createSet: createSetReducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(middlewares);
    },
    devTools: isDevelopment,
});

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
// export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;
