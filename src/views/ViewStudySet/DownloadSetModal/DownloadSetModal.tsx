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
} from '@mui/material/';
import { Card, Studyset } from 'shared/types';
import { useState } from 'react';
import {
    DOWNLOAD_FILE_TYPES,
    MIME_TYPES,
    DOWNLOAD_FILE_TITLES,
    DEFAULT_CSV_HEADERS,
    METADATA_CSV_HEADERS,
    DEFAULT_USER_RESPONSE,
} from 'shared/constants';
import { DownloadDialogContent } from '../styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGetUser } from 'state/api/usersAPI';

export const downloadTypeItems = Object.values(DOWNLOAD_FILE_TYPES).map(
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

const DownloadSetModal = ({ open, onClose, studyset }: Props) => {
    const {
        data: {
            user: {
                metadata: { defaultDownloadFormat },
            },
        } = DEFAULT_USER_RESPONSE,
    } = useGetUser();

    const [downloadFileType, setDownloadFileType] = useState<string>(
        defaultDownloadFormat ?? DOWNLOAD_FILE_TYPES.JSON
    );
    const [includeMetadata, setIncludeMetadata] = useState<boolean>(false);

    const downloadFile = ({ data, fileName, fileType }: DownloadFileParams) => {
        const blob = new Blob([data], { type: MIME_TYPES[fileType] });
        const anchor = document.createElement('a');
        anchor.download = fileName;
        anchor.href = window.URL.createObjectURL(blob);
        anchor.click();
        anchor.remove();
    };

    const handleDownloadSet = () => {
        const { description, label, title, cards } = studyset;
        const fileExtension = downloadFileType.toLowerCase();
        const fileName = `${title}_Studyset.${fileExtension}`;
        const downloadTimestamp = new Date().toLocaleString().replace(',', '');

        let blobData: any = null;

        const metadata = {
            title,
            description,
            label,
            downloadedOn: downloadTimestamp,
        };

        switch (downloadFileType) {
            case DOWNLOAD_FILE_TYPES.CSV: {
                const headers: string = includeMetadata
                    ? `${METADATA_CSV_HEADERS}, ${DEFAULT_CSV_HEADERS}`
                    : DEFAULT_CSV_HEADERS;

                const studysetCSV: string[] = cards.reduce(
                    (acc: string[], card: Card, index) => {
                        const { term, definition } = card;

                        let startString = '';
                        if (includeMetadata && index === 0) {
                            startString = Object.values(metadata).join(',');
                        } else if (includeMetadata) {
                            startString = [
                                ...Array(Object.values(metadata).length).keys(),
                            ]
                                .map(() => '#')
                                .join(',');
                        }
                        const csvStrings = [term, definition];
                        if (startString) {
                            csvStrings.unshift(startString);
                        }
                        acc.push(csvStrings.join(','));
                        return acc;
                    },
                    []
                );
                const csvData = [headers, ...studysetCSV].join('\n');
                blobData = csvData;
                break;
            }
            case DOWNLOAD_FILE_TYPES.TXT: {
                const cardText = cards.map((card: Card, index: number) => {
                    const { definition, term } = card;
                    const termString = `Term: ${term}`;
                    const definitionString = `Definition: ${definition}`;
                    return `Card ${
                        index + 1
                    }:\n\t ${termString} \n\t ${definitionString} \n`;
                });

                const newLineSeparatedCardText = `${cardText.join('\n')}`;
                let textData: string = `${newLineSeparatedCardText}`;
                if (includeMetadata) {
                    const metadataText = `Title: ${title}\nDescription: ${description}\nLabel: ${label}\nDownloaded on: ${downloadTimestamp} \n\n`;
                    textData = `${metadataText}${newLineSeparatedCardText}`;
                }
                blobData = textData;
                break;
            }
            case DOWNLOAD_FILE_TYPES.JSON: {
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
                const studysetJSON: { cards: any; metadata?: Object } = {
                    cards: cleanedCards,
                };
                if (includeMetadata) {
                    studysetJSON.metadata = metadata;
                }

                blobData = JSON.stringify(studysetJSON, null, 4);
                break;
            }
            case DOWNLOAD_FILE_TYPES.MD: {
                const cardText = cards.map((card: Card, index: number) => {
                    const { definition, term } = card;
                    return `## Card ${
                        index + 1
                    }\n\n**Term:** ${term}\n\n**Definition:** ${definition}\n\n`;
                });
                const cardsMarkdownText = `${cardText.join('\n')}`;
                let mdData = cardsMarkdownText;
                if (includeMetadata) {
                    const metadataText = `# ${title}\n\n## Description\n${description}\n\n## Label\n${label}\n\n## Downloaded on\n${downloadTimestamp}\n\n`;
                    mdData = `${metadataText}${mdData}`;
                }

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
            <StandardDialogTitle title="Download Study Set" onClose={onClose} />
            <DownloadDialogContent>
                <DialogContentText>
                    Choose what format you'd like to download the study set as:
                </DialogContentText>
                <FormControl
                    sx={{
                        marginTop: '1rem',
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
                            onChange={(e) =>
                                setIncludeMetadata(e.target.checked)
                            }
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
