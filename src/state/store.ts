import { configureStore } from "@reduxjs/toolkit";
import globalReducer from "src/state/slices/globalSlice";
import studySetsReducer from "src/state/slices/studysetsSlice";
import { api } from "./api/api";

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        global: globalReducer,
        studySets: studySetsReducer,
    },
    devTools: process.env.NODE_ENV !== "production",
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
// export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;
