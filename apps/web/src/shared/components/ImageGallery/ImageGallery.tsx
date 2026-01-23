import { BrokenImage, Close as CloseIcon } from '@mui/icons-material';
import { Dialog, IconButton, Typography } from '@mui/material';
import { CardFileMetadata } from 'shared/types';
import { useState } from 'react';
import { styled } from '@mui/system';

const GalleryGrid = styled('div')<{ columns: number }>(({ columns }) => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginTop: '0.75rem',
    marginBottom: '0.75rem',
}));

const GalleryImage = styled('div')<{ maxHeight: string }>(({ theme, maxHeight }) => ({
    position: 'relative',
    width: '10rem',
    height: '7rem',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: theme.palette.grey[100],
    border: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    '&:hover': {
        transform: 'scale(1.02)',
        boxShadow: theme.shadows[4],
    },
}));

const StyledImage = styled('img')({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
});

const BrokenImageContainer = styled('div')(({ theme }) => ({
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: theme.palette.text.secondary,
    padding: '1rem',
}));

const LightboxContent = styled('div')({
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
});

const LightboxImage = styled('img')({
    maxWidth: '90%',
    maxHeight: '90%',
    objectFit: 'contain',
});

const CloseButton = styled(IconButton)({
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
});

const ImageCaption = styled(Typography)(({ theme }) => ({
    position: 'absolute',
    bottom: '1rem',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    maxWidth: '80%',
    textAlign: 'center',
}));

interface ImageGalleryProps {
    files: CardFileMetadata[];
    maxHeight?: string;
    onImageClick?: (file: CardFileMetadata) => void;
    onLightboxChange?: (isOpen: boolean) => void;
}

const ImageGallery = ({
    files,
    maxHeight = '18.75rem',
    onImageClick,
    onLightboxChange,
}: ImageGalleryProps) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<CardFileMetadata | null>(null);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const handleImageClick = (file: CardFileMetadata) => {
        setSelectedImage(file);
        setLightboxOpen(true);
        onLightboxChange?.(true);
        onImageClick?.(file);
    };

    const handleCloseLightbox = (e?: React.MouseEvent | React.SyntheticEvent) => {
        e?.stopPropagation();
        setLightboxOpen(false);
        setSelectedImage(null);
        onLightboxChange?.(false);
    };

    const handleImageError = (fileKey: string) => {
        setImageErrors(prev => new Set(prev).add(fileKey));
    };

    if (!files || files.length === 0) {
        return null;
    }

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
        >
            <GalleryGrid columns={files.length === 1 ? 1 : 2}>
                {files.map(file => (
                    <GalleryImage
                        key={file.key}
                        maxHeight={maxHeight}
                        onClick={() => handleImageClick(file)}
                    >
                        {imageErrors.has(file.key) ? (
                            <BrokenImageContainer>
                                <BrokenImage fontSize="large" />
                                <Typography variant="caption">
                                    Failed to load image
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: '0.625rem' }}>
                                    {file.name}
                                </Typography>
                            </BrokenImageContainer>
                        ) : (
                            <StyledImage
                                src={file.signedURL}
                                alt={file.name}
                                loading="lazy"
                                onError={() => handleImageError(file.key)}
                            />
                        )}
                    </GalleryImage>
                ))}
            </GalleryGrid>

            {/* Lightbox Modal */}
            <Dialog
                open={lightboxOpen}
                onClose={handleCloseLightbox}
                maxWidth={false}
                fullWidth
                onClick={(e) => e.stopPropagation()}
                PaperProps={{
                    style: {
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        maxWidth: '95vw',
                        maxHeight: '95vh',
                    },
                }}
                slotProps={{
                    backdrop: {
                        onClick: (e) => e.stopPropagation(),
                    },
                }}
            >
                {selectedImage && (
                    <LightboxContent
                        onClick={handleCloseLightbox}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <CloseButton
                            onClick={handleCloseLightbox}
                            onMouseDown={(e) => e.stopPropagation()}
                            size="large"
                        >
                            <CloseIcon />
                        </CloseButton>
                        <LightboxImage
                            src={selectedImage.signedURL}
                            alt={selectedImage.name}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <ImageCaption variant="body2" onClick={(e) => e.stopPropagation()}>
                            {selectedImage.name}
                        </ImageCaption>
                    </LightboxContent>
                )}
            </Dialog>
        </div>
    );
};

export default ImageGallery;
