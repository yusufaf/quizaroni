import {
    Dispatch,
    ReactNode,
    SetStateAction,
    useEffect,
    useState,
    SyntheticEvent,
} from "react";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material/";
import { TABS } from "./constants";
import {
    StyledDialog,
    StyledDialogContent,
} from "./styles"


type Props = {
    open: boolean;
    onClose: Dispatch<SetStateAction<boolean>>;
};
const ManageLabelsDialog = (props: Props) => {
    const {
        createNewLabel,
        open,
        setCreateLabelName,
        onClose
    } = props;

    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    return (
        <StyledDialog
            open={open}
            onClose={onClose}
        >
            <DialogTitle>
                Labels
                {/* {TAB_PROPERTIES[selectedTab].title} */}
            </DialogTitle>
            <DialogContent>
                <div>
                    <Tabs
                        value={selectedTab}
                        onChange={onTabChange}
                    >
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                </div>

                <DialogContentText>
                    Please enter the name of the label you want to create.
                </DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Label Name"
                    type="email"
                    fullWidth
                    variant="standard"
                    onChange={(e) => setCreateLabelName(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    variant="outlined"
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => createNewLabel()}
                    variant="contained"
                >
                    Create
                </Button>
            </DialogActions>
        </StyledDialog>
    );
};

export default ManageLabelsDialog;
