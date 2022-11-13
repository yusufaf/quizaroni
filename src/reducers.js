import { combineReducers } from "redux";
import globalReducer from "./reducers/globalSlice";

const allReducers = combineReducers(
    {
        global: globalReducer
    }
);

export default allReducers;