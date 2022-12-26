import { combineReducers } from "redux";
import globalReducer from "./slices/globalSlice";

const allReducers = combineReducers(
    {
        global: globalReducer
    }
);

export default allReducers;