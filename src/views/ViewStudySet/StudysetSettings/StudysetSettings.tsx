import {
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import { Studyset } from "lib/types";
import { STUDYSET_TERMINOLOGIES } from "utilities/constants";

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const StudysetSettings = (props: Props) => {
    const { open, onClose, studyset } = props;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Studyset Settings</DialogTitle>
            <DialogContent>
                <div>
                    <FormControl>
                        <FormLabel id="terminology-radio-group-label">
                            Terminology
                        </FormLabel>
                        <RadioGroup
                            aria-labelledby="terminology-radio-group-label"
                            defaultValue={
                                STUDYSET_TERMINOLOGIES.TERM_DEFINITION
                            }
                            name="terminology-radio-group"
                        >
                            {Object.values(STUDYSET_TERMINOLOGIES).map(
                                (value) => (
                                    <FormControlLabel
                                        key={value}
                                        value={value}
                                        control={<Radio />}
                                        label={value}
                                    />
                                )
                            )}
                        </RadioGroup>
                    </FormControl>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default StudysetSettings;
