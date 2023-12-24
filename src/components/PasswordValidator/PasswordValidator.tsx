import { useEffect } from "react";
import { Dispatch, SetStateAction, useState } from "react";
import { PWD_REGEX } from "utilities/constants";
import {
    PasswordPolicyContainer,
    PasswordPolicyPaper,
    RequirementText,
} from "./styles";
import { BoldTypography } from "common/AppStyles";

type RequirementState = {
    length: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    uppercase: boolean;
};

type Props = {
    isPasswordValid?: boolean;
    setIsPasswordValid: Dispatch<SetStateAction<boolean>>;
    password: string;
    style?: Object;
};

const initialRequirementState: RequirementState = {
    length: false,
    lowercase: false,
    number: false,
    special: false,
    uppercase: false,
};

const PasswordValidator = (props: Props) => {
    const { setIsPasswordValid, password, style = {} } = props;

    const [requirementState, setRequirementState] = useState<RequirementState>({
        ...initialRequirementState,
    });

    const checkPasswordValidity = () => {
        const newReqState = { ...requirementState };
        Object.keys(PWD_REGEX).forEach((key) => {
            newReqState[key] = PWD_REGEX[key].test(password);
        });
        setRequirementState(newReqState);

        const allReqsSatisfied = Object.values(newReqState).every(Boolean);
        setIsPasswordValid(allReqsSatisfied);
    };

    useEffect(() => {
        checkPasswordValidity();
    }, [password]);

    const booleanToString = (value) => {
        return `${Boolean(value)}`;
    };

    return (
        <PasswordPolicyContainer style={style}>
            <PasswordPolicyPaper elevation={6}>
                <BoldTypography
                    variant="subtitle1"
                    sx={{ textAlign: "center" }}
                >
                    Password Policy:
                </BoldTypography>
                <RequirementText
                    isSatisfied={booleanToString(requirementState.length)}
                >
                    &bull; Must be at least 8 characters long
                </RequirementText>
                <RequirementText
                    isSatisfied={booleanToString(requirementState.uppercase)}
                >
                    &bull; Must contain at least one uppercase letter
                </RequirementText>
                <RequirementText
                    isSatisfied={booleanToString(requirementState.special)}
                >
                    &bull; Must contain at least one special character
                </RequirementText>
                <RequirementText
                    isSatisfied={booleanToString(requirementState.lowercase)}
                >
                    &bull; Must contain at least one lowercase letter
                </RequirementText>
                <RequirementText
                    isSatisfied={booleanToString(requirementState.number)}
                >
                    &bull; Must contain at least one number
                </RequirementText>
            </PasswordPolicyPaper>
        </PasswordPolicyContainer>
    );
};

export default PasswordValidator;
