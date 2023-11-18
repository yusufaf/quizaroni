import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    FormControl,
    FormControlLabel,
    MenuItem,
    Select,
} from "@mui/material/";
import { Card, Studyset } from "lib/types";
import { useState } from "react";
import {
    DOWNLOAD_FILE_TYPES,
    MIME_TYPES,
    DOWNLOAD_FILE_TITLES,
} from "utilities/constants";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { DownloadDialogContent } from "../styles";

const downloadTypeItems = Object.values(DOWNLOAD_FILE_TYPES).map(
    (value, index) => {
        return (
            <MenuItem
                key={index}
                value={value}
                title={DOWNLOAD_FILE_TITLES[value]}
            >
                {value}
            </MenuItem>
        );
    }
);

type DownloadFileParams = {
    data: any;
    fileName: string;
    fileType: string;
};

type Props = {
    onClose: () => void;
    open: boolean;
    studyset: Studyset;
};

const DownloadSetModal = (props: Props) => {
    const { open, onClose, studyset } =
        props;

    const [downloadFileType, setDownloadFileType] = useState<string>(
        DOWNLOAD_FILE_TYPES.TXT
    );
    const [includeMetadata, setIncludeMetadata] = useState<boolean>(false);
    
    const downloadFile = ({ data, fileName, fileType }: DownloadFileParams) => {
        const blob = new Blob([data], { type: MIME_TYPES[fileType] });
        const anchor = document.createElement("a");
        anchor.download = fileName;
        anchor.href = window.URL.createObjectURL(blob);
        anchor.click();
        anchor.remove();
    };

    const handleDownloadSet = () => {
        const { description, label, title, cards } = studyset;
        const fileExtension = downloadFileType.toLowerCase();
        const fileName = `${title}_Studyset.${fileExtension}`;
        const downloadTimestamp = new Date().toLocaleString().replace(",", "");

        let blobData: any = null;

        switch (downloadFileType) {
            case DOWNLOAD_FILE_TYPES.CSV: {
                const headers = ["Term, Definition"];
                const cardsCSV = cards.reduce((acc: string[], card: Card) => {
                    const { term, definition } = card;
                    acc.push([term, definition].join(","));
                    return acc;
                }, []);
                const csvData = [...headers, ...cardsCSV].join("\n");
                blobData = csvData;
                break;
            }
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
                const textData = `${metadataText}${cardText.join("\n")}`;
                blobData = textData;
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
                };
                blobData = JSON.stringify(studysetJson, null, 4);
                break;
            }
            case DOWNLOAD_FILE_TYPES.MD: {
                const metadataText = `# ${title}\n\n## Description\n${description}\n\n## Label\n${label}\n\n## Downloaded on\n${downloadTimestamp}\n\n`;
                const cardText = cards.map((card: Card, index: number) => {
                    const { definition, term } = card;
                    return `## Card ${
                        index + 1
                    }\n\n**Term:** ${term}\n\n**Definition:** ${definition}\n\n`;
                });
                const mdData = `${metadataText}${cardText.join("\n")}`;
                blobData = mdData;
                break;
            }
            default:
                break;
        }

        downloadFile({ data: blobData, fileName, fileType: downloadFileType });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <StyledDialogTitle>
                Download Study Set
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <DownloadDialogContent>
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
                <FormControlLabel
                    label="Include metadata?"
                    control={
                        <Checkbox
                        checked={includeMetadata}
                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                        />
                    }
                />
            </DownloadDialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">
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
