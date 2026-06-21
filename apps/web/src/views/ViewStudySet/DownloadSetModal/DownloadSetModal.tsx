import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    FormControl,
    FormControlLabel,
    Select,
    TextField,
} from '@mui/material/';
import { Card, Studyset } from 'shared/types';
import { useState } from 'react';
import {
    DOWNLOAD_FILE_TYPES,
    MIME_TYPES,
    DEFAULT_CSV_HEADERS,
    METADATA_CSV_HEADERS,
    DEFAULT_USER_RESPONSE,
} from 'shared/constants';
import { DownloadDialogContent } from '../styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGetUser } from 'state/api/usersAPI';
import { useTranslation } from 'react-i18next';
import { downloadTypeItems } from 'shared/components/downloadTypeItems';

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
    const { t } = useTranslation();
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
    const [includeNotes, setIncludeNotes] = useState<boolean>(false);
    const [customFileName, setCustomFileName] = useState<string>(
        `${studyset.title}_Studyset`
    );

    const downloadFile = ({ data, fileName, fileType }: DownloadFileParams) => {
        const blob = new Blob([data], { type: MIME_TYPES[fileType] });
        const anchor = document.createElement('a');
        anchor.download = fileName;
        anchor.href = window.URL.createObjectURL(blob);
        anchor.click();
        anchor.remove();
    };

    const handleDownloadSet = () => {
        const { description, labels, title, cards } = studyset;
        const label = labels?.join(', ') ?? '';
        const fileExtension = downloadFileType.toLowerCase();
        const fileName = `${customFileName || title + '_Studyset'}.${fileExtension}`;
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
                    ? `${METADATA_CSV_HEADERS}, ${DEFAULT_CSV_HEADERS}${includeNotes ? ', Notes' : ''}`
                    : `${DEFAULT_CSV_HEADERS}${includeNotes ? ', Notes' : ''}`;

                const studysetCSV: string[] = cards.reduce(
                    (acc: string[], card: Card, index) => {
                        const { term, definition, notes } = card;

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

                        if (includeNotes) {
                            const notesText =
                                notes.length > 0
                                    ? notes.map((n) => n.text).join('; ')
                                    : '';
                            csvStrings.push(notesText);
                        }

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
                    const { definition, term, notes } = card;
                    const termString = `Term: ${term}`;
                    const definitionString = `Definition: ${definition}`;

                    let cardContent = `Card ${
                        index + 1
                    }:\n\t ${termString} \n\t ${definitionString}`;

                    if (includeNotes && notes.length > 0) {
                        const notesString = notes
                            .map((n) => `\t\t- ${n.text}`)
                            .join('\n');
                        cardContent += `\n\t Notes:\n${notesString}`;
                    }

                    return cardContent + ' \n';
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
                    const { definition, term, notes } = card;
                    const cardData: any = {
                        term,
                        definition,
                    };

                    if (includeNotes) {
                        cardData.notes = notes;
                    }

                    return {
                        [`Card ${index + 1}`]: cardData,
                    };
                });
                const cleanedCards = Object.assign({}, ...mappedCards);
                const studysetJSON: { cards: any; metadata?: object } = {
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
                    const { definition, term, notes } = card;

                    let cardMarkdown = `## Card ${
                        index + 1
                    }\n\n**Term:** ${term}\n\n**Definition:** ${definition}`;

                    if (includeNotes && notes.length > 0) {
                        const notesMarkdown = notes
                            .map((n) => `- ${n.text}`)
                            .join('\n');
                        cardMarkdown += `\n\n**Notes:**\n${notesMarkdown}`;
                    }

                    return cardMarkdown + '\n\n';
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
            case DOWNLOAD_FILE_TYPES.ANKI: {
                // Anki CSV format: Front (Term), Back (Definition), Tags (Categories)
                const ankiHeaders = 'Front,Back,Tags';

                const ankiCards: string[] = cards.map((card: Card) => {
                    const { term, definition, categories } = card;
                    // Escape quotes and handle multiline for CSV compatibility
                    const front = term.replace(/"/g, '""').replace(/\n/g, ' ');
                    const back = definition
                        .replace(/"/g, '""')
                        .replace(/\n/g, ' ');
                    const tags = categories?.join(' ') || '';
                    return `"${front}","${back}","${tags}"`;
                });

                let ankiData = [ankiHeaders, ...ankiCards].join('\n');

                if (includeMetadata) {
                    const metadataComment = `# Anki Deck: ${title}\n# Description: ${description.replace(/\n/g, ' ')}\n# Created from Quizaroni on ${downloadTimestamp}\n`;
                    ankiData = `${metadataComment}${ankiData}`;
                }

                blobData = ankiData;
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
            <StandardDialogTitle
                title={t('dialogs.download.title')}
                onClose={onClose}
            />
            <DownloadDialogContent>
                <DialogContentText>
                    {t('dialogs.download.chooseFormat')}
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
                <TextField
                    label={t('dialogs.download.fileName', {
                        defaultValue: 'File Name',
                    })}
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <FormControlLabel
                    label={t('dialogs.download.includeMetadata')}
                    control={
                        <Checkbox
                            checked={includeMetadata}
                            onChange={(e) =>
                                setIncludeMetadata(e.target.checked)
                            }
                        />
                    }
                />
                <FormControlLabel
                    label={t('dialogs.download.includeNotes')}
                    control={
                        <Checkbox
                            checked={includeNotes}
                            onChange={(e) => setIncludeNotes(e.target.checked)}
                        />
                    }
                />
            </DownloadDialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined">
                    {t('buttons.cancel')}
                </Button>
                <Button onClick={handleDownloadSet} variant="contained">
                    {t('buttons.download')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DownloadSetModal;
