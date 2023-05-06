import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    MenuItem,
    Select,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material/";
import { Card, Studyset } from "lib/types";
import { Dispatch, SetStateAction } from "react";
import { DOWNLOAD_FILE_TYPES, MIME_TYPES } from "utilities/constants";

const downloadTypeItems = Object.values(DOWNLOAD_FILE_TYPES).map(
    (value, index) => {
        return (
            <MenuItem key={index} value={value}>
                {value}
            </MenuItem>
        );
    }
);

type Props = {
    downloadFileType: string;
    handleClose: () => void;
    open: boolean;
    setDownloadFileType: Dispatch<SetStateAction<string>>;
    studySet: Studyset;
};

const DownloadSetModal = (props: Props) => {
    const {
        open,
        handleClose,
        downloadFileType,
        setDownloadFileType,
        studySet,
    } = props;

    const handleDownloadSet = () => {
        const { description, label, title, cards } = studySet;
        const anchor = document.createElement("a");
        const fileExtension = downloadFileType.toLowerCase();
        const mimeType = MIME_TYPES[downloadFileType];
        const fileName = `${title}_Studyset.${fileExtension}`
        anchor.download = fileName;

        let url = "";

        const downloadTimestamp = new Date().toLocaleString().replace(',','')

        switch (downloadFileType) {
            case DOWNLOAD_FILE_TYPES.CSV:
                break;
            case DOWNLOAD_FILE_TYPES.TXT: {
                const metadataText = `Title: ${title}\nDescription: ${description}\nLabel: ${label}\nDownloaded on: ${downloadTimestamp} \n\n`;
                const cardText = cards.map((card: Card, index: number) => {
                    const { definition, term } = card;
                    const termString = `Term: ${term}`;
                    const definitionString = `Definition: ${definition}`;
                    return `Card ${
                        index + 1
                    }:\n\t ${termString} \n\t ${definitionString} \n`;
                });
                const text = `${metadataText}${cardText.join("\n")}`;
                const blob = new Blob([text], {
                    type: mimeType,
                });
                url = URL.createObjectURL(blob);
                break;
            }
            case DOWNLOAD_FILE_TYPES.JSON: {
                const metadata = {
                    title,
                    description,
                    label,
                    downloadedOn: downloadTimestamp,
                };
                const mappedCards = cards.map((card: Card, index: number) => {
                    const { definition, term } = card;
                    return {
                        [`Card ${index + 1}`]: {
                            term,
                            definition,
                        },
                    };
                });
                const cleanedCards = Object.assign({}, ...mappedCards);
                const studysetJson = {
                    metadata,
                    cards: cleanedCards,
                }
                const blobParts = [JSON.stringify(studysetJson, null, 4)];
                const blob = new Blob(blobParts, {
                    type: mimeType,
                });
                url = URL.createObjectURL(blob);
                break;
            }
            default:
                break;
        }

        anchor.href = url;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Download Study Set</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Choose what format you'd like to download the study set as:
                </DialogContentText>
                <FormControl 
                    sx={{
                        marginTop: "1rem",
                    }}
                >
                    <Select
                        onChange={(e) => setDownloadFileType(e.target.value)}
                        value={downloadFileType}
                    >
                        {downloadTypeItems}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} variant="outlined">
                    Cancel
                </Button>
                <Button onClick={handleDownloadSet} variant="contained">
                    Download
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DownloadSetModal;
