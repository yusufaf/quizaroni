import { AddPhotoAlternateRounded, UploadRounded } from "@mui/icons-material";
import {
    FileUploadContainer,
    FileUploadTypeText,
    HiddenInput,
} from "common/AppStyles";
import { useRef, DragEvent, ChangeEvent } from "react";

const FILE_UPLOAD_ICONS = new Map([
    ["IMAGE", <AddPhotoAlternateRounded />],
    ["FILE", <UploadRounded />],
]);

type Props = {
    style?: Object;
    type?: string;
    handleFiles: (files: any) => {};
};
const FileUpload = (props: Props) => {
    const { handleFiles, style, type = "IMAGE"} = props;

    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleInputClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (!e.target.files || !e.target.files[0]) {
            return;
        }
        handleFiles(e.target.files);
    };

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            // setDragActive(true);
        } else if (e.type === "dragleave") {
            // setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // setDragActive(false);
        if (!e.dataTransfer.files || !e.dataTransfer.files[0]) {
            return;
        }
        handleFiles(e.dataTransfer.files);
    };

    return (
        <FileUploadContainer
            style={style}
            onClick={handleInputClick}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <HiddenInput type="file" ref={inputRef} onChange={handleChange} />
            {FILE_UPLOAD_ICONS.get(type)}
            <FileUploadTypeText variant="subtitle1">{type}</FileUploadTypeText>
        </FileUploadContainer>
    );
};

export default FileUpload;
