import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAuthenticated,
    setAuthenticated,
    setCognitoUser,
} from "state/slices/globalSlice";

type Props = {
    children: any;
};

const AuthProvider = ({ children }: Props) => {
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);

    const checkAuthState = async () => {
        try {
            const currentUser = await getCurrentUser();
            console.log("Testing current auth user = ", currentUser);

            // TODO: Review existence of CognitoUser object with switch to Amplify v6
            /* Removing unneeded properties to make the CognitoUser object serializable in redux */
            // const modifiedCognitoUser = { ...currentUser };
            // const propertiesToRemove = [
            //     "signInUserSession",
            //     "pool",
            //     "storage",
            //     "client",
            // ];
            // propertiesToRemove.forEach(
            //     (property) => delete modifiedCognitoUser[property]
            // );

            dispatch(setAuthenticated(true));
            dispatch(setCognitoUser({
                username: currentUser.username
            }));
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
