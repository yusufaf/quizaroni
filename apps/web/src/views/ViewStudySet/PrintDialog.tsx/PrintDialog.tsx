import { useState, useRef } from 'react';
import { Dialog, CircularProgress } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import SettingsToggle from 'components/SettingsToggle/SettingsToggle';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import { Studyset, PrintConfig } from 'shared/types';
import {
    PRINT_LAYOUT_OPTIONS,
    PRINT_INCLUDE_NOTES_OPTIONS,
    PRINT_INCLUDE_FILES_OPTIONS,
    PRINT_INCLUDE_CATEGORIES_OPTIONS,
    PRINT_SHOW_COLORS_OPTIONS,
    PRINT_IMPORTANT_ONLY_OPTIONS,
    PRINT_LAYOUTS,
} from 'shared/constants';
import {
    StyledDialogContent,
    PreviewPanel,
    SettingsPanel,
    PrintButton,
    PrintPreviewContainer,
} from './styles';
import PrintPreview from './PrintPreview';
import { getPdfGenerator } from './pdfGenerators';

type Props = {
    open: boolean;
    onClose: () => void;
    studyset: Studyset | undefined;
};

const PrintDialog = ({ open, onClose, studyset }: Props) => {
    const { mutate: updateStudySet } = useUpdateStudyset();
    const printRef = useRef<HTMLDivElement>(null);

    const defaultPrintConfig: PrintConfig = {
        layout: studyset?.metadata?.printConfig?.layout ?? PRINT_LAYOUTS.LIST,
        includeNotes: studyset?.metadata?.printConfig?.includeNotes ?? true,
        includeFiles: studyset?.metadata?.printConfig?.includeFiles ?? true,
        includeCategories:
            studyset?.metadata?.printConfig?.includeCategories ?? true,
        showColors: studyset?.metadata?.printConfig?.showColors ?? false,
        importantOnly:
            studyset?.metadata?.printConfig?.importantOnly ?? false,
    };

    const [printSettings, setPrintSettings] =
        useState<PrintConfig>(defaultPrintConfig);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSettingChange = (
        _event: React.MouseEvent<HTMLElement, MouseEvent>,
        value: any,
        property?: string
    ) => {
        if (!property || !studyset?.studysetUUID) {
            return;
        }

        const newPrintConfig = { ...printSettings, [property]: value };
        setPrintSettings(newPrintConfig);

        updateStudySet({
            studysetUUID: studyset.studysetUUID,
            updates: { printConfig: newPrintConfig },
            isMetadataUpdate: true,
        });
    };

    const handleDownloadPdf = async () => {
        if (!studyset) return;

        setIsGenerating(true);

        try {
            const generator = getPdfGenerator(printSettings.layout);
            const cards = printSettings.importantOnly
                ? studyset.cards.filter((c) => c.important)
                : studyset.cards;

            const doc = await generator.generate(studyset, cards, printSettings);

            const filename = `${studyset.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullScreen>
            <StandardDialogTitle title="Download PDF" onClose={onClose} />
            <StyledDialogContent>
                <PreviewPanel>
                    <PrintPreviewContainer ref={printRef}>
                        <PrintPreview
                            studyset={studyset}
                            settings={printSettings}
                        />
                    </PrintPreviewContainer>
                </PreviewPanel>

                <SettingsPanel>
                    <SettingsToggle
                        label="Layout Style"
                        options={PRINT_LAYOUT_OPTIONS}
                        selectedValue={printSettings.layout}
                        property="layout"
                        onChange={handleSettingChange}
                    />
                    <SettingsToggle
                        label="Include Notes"
                        options={PRINT_INCLUDE_NOTES_OPTIONS}
                        selectedValue={printSettings.includeNotes}
                        property="includeNotes"
                        onChange={handleSettingChange}
                    />
                    <SettingsToggle
                        label="Include File Attachments"
                        options={PRINT_INCLUDE_FILES_OPTIONS}
                        selectedValue={printSettings.includeFiles}
                        property="includeFiles"
                        onChange={handleSettingChange}
                    />
                    <SettingsToggle
                        label="Include Categories"
                        options={PRINT_INCLUDE_CATEGORIES_OPTIONS}
                        selectedValue={printSettings.includeCategories}
                        property="includeCategories"
                        onChange={handleSettingChange}
                    />
                    <SettingsToggle
                        label="Show Card Colors"
                        options={PRINT_SHOW_COLORS_OPTIONS}
                        selectedValue={printSettings.showColors}
                        property="showColors"
                        onChange={handleSettingChange}
                    />
                    <SettingsToggle
                        label="Cards to Print"
                        options={PRINT_IMPORTANT_ONLY_OPTIONS}
                        selectedValue={printSettings.importantOnly}
                        property="importantOnly"
                        onChange={handleSettingChange}
                    />

                    <PrintButton
                        variant="contained"
                        startIcon={
                            isGenerating ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <DownloadIcon />
                            )
                        }
                        onClick={handleDownloadPdf}
                        disabled={isGenerating || !studyset}
                    >
                        {isGenerating ? 'Generating PDF...' : 'Download PDF'}
                    </PrintButton>
                </SettingsPanel>
            </StyledDialogContent>
        </Dialog>
    );
};

export default PrintDialog;
