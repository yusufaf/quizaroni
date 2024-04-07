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
            dispatch(setAuthenticated(true));
            dispatch(
                setCognitoUser({
                    username: currentUser.username,
                })
            );
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (!authenticated) {
            checkAuthState();
        }
    }, []);

    return children;
};

export default AuthProvider;
