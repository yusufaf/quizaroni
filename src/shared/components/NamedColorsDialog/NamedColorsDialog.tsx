import { Button, Tabs, Tab } from '@mui/material';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import { BoldTypography, SimpleFlexContainer } from 'styles/AppStyles';
import { ChangeEvent, ReactNode, SyntheticEvent, useState } from 'react';
import {
    ColorsListColumn,
    DownloadListButton,
    StyledDialog,
    StyledDialogActions,
    StyledDialogContent,
} from './styles';
import CreateTabView from './CreateTabView';
import NamedColorPicker from './NamedColorPicker';
import { LoadingButton } from '@mui/lab';
import {
    useGetUserQuery,
    useUpdateUserMetadataMutation,
} from 'state/api/usersAPI';
import ManageTabView from './ManageTabView';
import { ACTIONS, TABS } from './constants';
import NamedColorsList from './NamedColorsList';
import { Download } from '@mui/icons-material';
import { downloadObjectAsJSON } from 'shared/utilities/general';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGlobalStore } from 'state/stores/global';

type Props = {};
const NamedColorsDialog = (props: Props) => {
    const { namedColorsDialogProps, setNamedColorsDialogProps } =
        useGlobalStore();

    const {
        data: {
            user: {
                metadata: { namedColors = [] },
                userUUID = '',
            },
        } = DEFAULT_USER_RESPONSE,
    } = useGetUserQuery();

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    const [color, setColor] = useState<string>(
        namedColorsDialogProps.color ? namedColorsDialogProps.color : '#000000'
    );
    const [selectedTab, setSelectedTab] = useState<string>(TABS.CREATE);
    const [colorName, setColorName] = useState<string>(''); // From Create/Edit page
    const [errorInfo, setErrorInfo] = useState<any>(null);

    const [editColorName, setEditColorName] = useState<string>('');
    const [editErrorInfo, setEditErrorInfo] = useState<any>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [deleteIndices, setDeleteIndices] = useState<number[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    console.log({ namedColorsDialogProps });

    const isCreateTab = selectedTab === TABS.CREATE;
    const isManageTab = selectedTab === TABS.MANAGE;
    const isImportTab = selectedTab === TABS.IMPORT;
    const isAssignTab = selectedTab === TABS.ASSIGN;

    const closeNamedColorsDialog = () => {
        setNamedColorsDialogProps({
            open: false,
        });
    };

    const onTabChange = (_e: SyntheticEvent, newTab: string) => {
        setSelectedTab(newTab);
    };

    /* Create Tab */
    const handleCreateNamedColor = async () => {
        if (!userUUID) {
            return;
        }
        const newColorObject = {
            color,
            name: colorName,
        };
        const newNamedColors = [...namedColors, newColorObject];
        updateUserMetadata({
            updates: {
                namedColors: newNamedColors,
            },
        });
    };

    const onCreateColorChange = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        console.log({ namedColors });
        const isDuplicate = namedColors.some(
            (colorObject) => colorObject.name === name
        );
        setColorName(name);
        const localErrorInfo = isDuplicate
            ? {
                  helperText: 'Color with that name already exists',
              }
            : null;
        setErrorInfo(localErrorInfo);
    };

    const onColorChange = (e) => {
        // hex, hsl, hsv, rgb
        const { hex } = e;
        console.log('e in onColorChange = ', { e });
        setColor(hex);
    };

    const onEditColorChange = (e: ChangeEvent<HTMLInputElement>) => {
        const newNamedColorName = e.target.value;
        const allOtherNamedColors = [...namedColors].filter(
            (_, index) => index != editIndex
        );
        const isDuplicate = allOtherNamedColors.some(
            (value) => value.name === newNamedColorName
        );
        setEditColorName(newNamedColorName);
        if (isDuplicate) {
            setEditErrorInfo({
                helperText: 'Color with that name already exists',
            });
        } else if (!newNamedColorName) {
            setEditErrorInfo({
                helperText: "Color name can't be empty",
            });
        } else {
            setEditErrorInfo(null);
        }
    };

    const handleEditClick = (index: number) => {
        setDeleteIndices([]);
        setSelectedAction(ACTIONS.EDIT);
        setEditIndex(index);
        setEditColorName(namedColors[index].name);
    };

    const handleDeleteClick = (index: number) => {
        setEditIndex(null);
        setEditColorName('');
        setEditErrorInfo(null);

        setSelectedAction(ACTIONS.DELETE);
        if (deleteIndices.includes(index)) {
            setDeleteIndices(deleteIndices.filter((value) => value !== index));
        } else {
            setDeleteIndices(deleteIndices.concat(index));
        }
    };

    const handleEditOrDelete = async () => {
        if (!userUUID) {
            return;
        }

        try {
            if (selectedAction === ACTIONS.EDIT && editIndex !== null) {
                const selectedColor = namedColors[editIndex];
                /* Don't make network call if it's unchanged */
                if (editColorName === selectedColor.name) {
                    return;
                }

                let newNamedColors = [...namedColors];
                newNamedColors[editIndex] = {
                    color,
                    name: editColorName,
                };
                updateUserMetadata({
                    uuid: userUUID,
                    property: 'namedColors',
                    newValue: newNamedColors,
                });
            }
            if (selectedAction === ACTIONS.DELETE) {
                const newNamedColors = [...namedColors].filter(
                    (_value, index) => deleteIndices.includes(index)
                );
                updateUserMetadata({
                    uuid: userUUID,
                    property: 'namedColors',
                    newValue: newNamedColors,
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSelectedAction(null);
        }
    };

    const downloadNamedColorsList = () => {
        downloadObjectAsJSON(namedColors, 'Quizaroni_NamedColors.json');
    };

    const renderDialogButtons = (): ReactNode => {
        switch (selectedTab) {
            case TABS.CREATE:
                return (
                    <LoadingButton
                        variant="contained"
                        onClick={handleCreateNamedColor}
                        disabled={!colorName || Boolean(errorInfo)}
                        loading={isUpdateMetadataLoading}
                    >
                        Create
                    </LoadingButton>
                );
            case TABS.MANAGE:
                const isEditAction = selectedAction === ACTIONS.EDIT;
                const disabled =
                    (isEditAction && editErrorInfo) ||
                    (selectedAction === ACTIONS.DELETE &&
                        !deleteIndices.length);
                const buttonText = isEditAction
                    ? 'Save Edit'
                    : `Delete (${deleteIndices.length})`;
                return (
                    selectedAction && (
                        <Button
                            variant="contained"
                            onClick={handleEditOrDelete}
                            disabled={disabled}
                        >
                            {buttonText}
                        </Button>
                    )
                );
            // case TABS.IMPORT:
            //     return (
            //         <LoadingButton
            //             variant="contained"
            //             onClick={handleImport}
            //             disabled={!selectedStudysetUUID}
            //             loading={isCreatingCategory}
            //         >
            //             Import Categories
            //         </LoadingButton>
            //     );
        }
    };

    return (
        <StyledDialog
            open={namedColorsDialogProps.open}
            onClose={closeNamedColorsDialog}
            fullWidth
            maxWidth="lg"
        >
            <StandardDialogTitle
                title="Named Colors"
                onClose={closeNamedColorsDialog}
            />
            <StyledDialogContent>
                <div>
                    <Tabs
                        value={selectedTab}
                        onChange={onTabChange}
                        scrollButtons="auto"
                    >
                        {[...Object.values(TABS)].map((tab, index) => (
                            <Tab key={index} label={tab} value={tab} />
                        ))}
                    </Tabs>
                    {isCreateTab && (
                        <CreateTabView
                            colorName={colorName}
                            errorInfo={errorInfo}
                            onCreateColorChange={onCreateColorChange}
                        />
                    )}
                    {isManageTab && (
                        <ManageTabView
                            editErrorInfo={editErrorInfo}
                            editColorName={editColorName}
                            editIndex={editIndex}
                            onEditColorChange={onEditColorChange}
                        />
                    )}
                    {/*
                    {isImportTab && (
                        <ImportTabView
                            selectedStudysetUUID={selectedStudysetUUID}
                            studysets={studysets}
                            selectedStudyset={selectedStudyset}
                            setSelectedStudysetUUID={setSelectedStudysetUUID}
                        />
                    )}
                    {isAssignTab && (
                        <AssignTabView
                            selectedCardUUID={selectedCardUUID}
                            setSelectedCardUUID={setSelectedCardUUID}
                            selectedStudyset={selectedStudyset}
                            onAssignedCategoriesChange={
                                onAssignedCategoriesChange
                            }
                            isAssigningCategories={isAssigningCategories}
                        />
                    )} */}
                </div>
                <NamedColorPicker color={color} onChange={onColorChange} />
                <ColorsListColumn>
                    <SimpleFlexContainer style={{ alignItems: 'baseline' }}>
                        <BoldTypography>Named Colors</BoldTypography>
                        <DownloadListButton
                            variant="outlined"
                            startIcon={<Download />}
                            onClick={downloadNamedColorsList}
                        >
                            Download
                        </DownloadListButton>
                    </SimpleFlexContainer>
                    <NamedColorsList
                        namedColors={namedColors}
                        selectedTab={selectedTab}
                        editIndex={editIndex}
                        deleteIndices={deleteIndices}
                        handleEditClick={handleEditClick}
                        handleDeleteClick={handleDeleteClick}
                    />
                </ColorsListColumn>
            </StyledDialogContent>
            <StyledDialogActions>{renderDialogButtons()}</StyledDialogActions>
        </StyledDialog>
    );
};

export default NamedColorsDialog;
