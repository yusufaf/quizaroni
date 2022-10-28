import { combineReducers } from "redux";
import userAuthReducer from "./reducers/global";

const allReducers = combineReducers(
    {
        userAuthState: userAuthReducer
    }
);

export default allReducers;