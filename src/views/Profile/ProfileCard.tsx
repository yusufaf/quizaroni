import { AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import { Typography } from '@mui/material/';
import { useState } from 'react';
import {
    ProfilePicture,
    ProfilePictureImage,
    ProfilePictureContainer,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading,
} from './ProfileStyles';
import ProfilePictureDialog from './ProfilePictureDialog';
import { useGetAllStudysets } from 'state/api/studysetsAPI';
import { User } from 'shared/types';

type Props = {
    userData: User;
};

const ProfileCard = ({ userData }: Props) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data: studysetsResponse, isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysets();
    const studysets = studysetsResponse?.studysets ?? [];

    const handleOpenDialog = () => setDialogOpen(true);
    const handleCloseDialog = () => setDialogOpen(false);

    const avatarSrc = userData.metadata.avatar?.value;
    const hasAvatar = !!avatarSrc;

    return (
        <>
            <StyledProfileCard elevation={6}>
                <ProfilePictureContainer>
                    <ProfilePicture onClick={handleOpenDialog}>
                        {hasAvatar ? (
                            <ProfilePictureImage
                                src={avatarSrc}
                                alt="Profile"
                            />
                        ) : (
                            <Typography variant="h3" sx={{ color: '#fff' }}>
                                {userData.username.charAt(0).toUpperCase()}
                            </Typography>
                        )}
                    </ProfilePicture>
                    <UploadImageButton onClick={handleOpenDialog}>
                        <AddPhotoIcon />
                    </UploadImageButton>
                </ProfilePictureContainer>
                <UserInfoContainer>
                    <UserInfoHeading>Username</UserInfoHeading>
                    <Typography>{userData?.username ?? 'N/A'}</Typography>
                </UserInfoContainer>
                <UserInfoContainer>
                    <UserInfoHeading># of Study Sets Created</UserInfoHeading>
                    <Typography>{studysets.length ?? 0}</Typography>
                </UserInfoContainer>
                <UserInfoContainer>
                    <UserInfoHeading>Account Created</UserInfoHeading>
                    <Typography>
                        {new Date(userData.createdAt).toLocaleDateString() ??
                            'N/A'}
                    </Typography>
                </UserInfoContainer>
            </StyledProfileCard>
            <ProfilePictureDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                userData={userData}
            />
        </>
    );
};

export default ProfileCard;
