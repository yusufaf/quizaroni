import { combineReducers } from "redux";
import userAuthReducer from "./reducers/globalSlice";

const allReducers = combineReducers(
    {
        userAuthState: userAuthReducer
    }
);

export default allReducers;