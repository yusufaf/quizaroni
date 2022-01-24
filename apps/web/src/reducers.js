import { combineReducers } from "redux";
import userAuthReducer from "./reducers/userAuthState";

const allReducers = combineReducers(
    {
        userAuthState: userAuthReducer
    }
);

export default allReducers;