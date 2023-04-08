import { useEffect } from "react";
import { Dispatch, SetStateAction, useState } from "react";
import { PWD_REGEX } from "src/utilities/constants";
import {
    PasswordPolicyBox,
    PasswordPolicyPaper,
    RequirementText,
} from "./styles";
import { BoldHeading } from "src/AppStyles";

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
};

const initialRequirementState: RequirementState = {
    length: false,
    lowercase: false,
    number: false,
    special: false,
    uppercase: false,
};

const PasswordValidator = (props: Props) => {
    const { setIsPasswordValid, password } = props;

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

    return (
        <PasswordPolicyBox>
            <PasswordPolicyPaper elevation={6}>
                <BoldHeading variant="subtitle1" sx={{ textAlign: "center" }}>
                    Password Policy:
                </BoldHeading>
                <RequirementText isSatisfied={requirementState.length}>
                    &bull; Must be at least 8 characters long
                </RequirementText>
                <RequirementText isSatisfied={requirementState.uppercase}>
                    &bull; Must contain at least one uppercase letter
                </RequirementText>
                <RequirementText isSatisfied={requirementState.special}>
                    &bull; Must contain at least one special character
                </RequirementText>
                <RequirementText isSatisfied={requirementState.lowercase}>
                    &bull; Must contain at least one lowercase letter
                </RequirementText>
                <RequirementText isSatisfied={requirementState.number}>
                    &bull; Must contain at least one number
                </RequirementText>
            </PasswordPolicyPaper>
        </PasswordPolicyBox>
    );
};

export default PasswordValidator;
