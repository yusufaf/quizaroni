import { Auth } from "aws-amplify";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAuthenticated,
    setAuthenticated,
    setCognitoUser,
    setUserData,
} from "src/slices/globalSlice";
import { setStudySets } from "src/slices/studysetsSlice";

const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);

    const checkAuthState = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            console.log("Testing current auth user = ", currentUser);
            // TODO: Review what you can do with this
            // const session = await Auth.currentSession();
            // console.log("Response from current session = ", session);

            dispatch(setAuthenticated(true));
            dispatch(setCognitoUser(currentUser));
            const { username } = currentUser;
            /* Retrieve user data, passing username as a query parameter */
            const response = await axios.get("/api/users/get", {
                params: {
                    username,
                },
            });

            console.log({ response });
            const userData = response.data;
            dispatch(setUserData(userData));

            /* Re-fetch study set data */

            /* Fetch the study sets for the user */
            const studySetsResponse = await axios.get("/api/studysets/get", {
                params: {
                    userUUID: userData.uuid,
                },
            });

            const returnedStudySets = studySetsResponse.data;
            dispatch(setStudySets(returnedStudySets));
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (!authenticated) {
            console.log("Checking auth state 👀");
            checkAuthState();
        }
    }, []);

    return children;
};

export default AuthProvider;