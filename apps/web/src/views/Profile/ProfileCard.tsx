import { AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import { Skeleton, Tooltip, Typography } from '@mui/material/';
import { lazy, Suspense, useState } from 'react';
import {
    ProfilePicture,
    ProfilePictureImage,
    ProfilePictureContainer,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading,
} from './ProfileStyles';
// Lazy-loaded so DiceBear (avatar generation) only downloads when the user
// opens the avatar dialog, not on every Profile page view.
const ProfilePictureDialog = lazy(() => import('./ProfilePictureDialog'));
import { useGetAllStudysets } from 'state/api/studysetsAPI';
import { User } from 'shared/types';
import { formatDateUsingPreferred } from 'utilities/general';
import { DATE_FORMATS, TIME_FORMATS } from 'shared/constants';
import { useTranslation } from 'react-i18next';

type Props = {
    userData: User;
};

const ProfileCard = ({ userData }: Props) => {
    const { t } = useTranslation();
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data: studysetsResponse, isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysets();
    const studysets = studysetsResponse?.studysets ?? [];

    const totalCards = studysets.reduce(
        (sum, set) => sum + (set.cards?.length ?? 0),
        0
    );
    const labelsCount = userData.labels?.length ?? 0;

    const handleOpenDialog = () => setDialogOpen(true);
    const handleCloseDialog = () => setDialogOpen(false);

    const avatarSrc = userData.metadata.avatar?.value;
    const hasAvatar = !!avatarSrc;

    return (
        <>
            <StyledProfileCard elevation={6}>
                <ProfilePictureContainer>
                    <Tooltip title="Change profile picture">
                        <ProfilePicture onClick={handleOpenDialog}>
                            {isGetAllStudysetsLoading ? (
                                <Skeleton
                                    variant="circular"
                                    width="100%"
                                    height="100%"
                                />
                            ) : hasAvatar ? (
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
                    </Tooltip>
                    <Tooltip title="Change profile picture">
                        <UploadImageButton onClick={handleOpenDialog}>
                            <AddPhotoIcon />
                        </UploadImageButton>
                    </Tooltip>
                </ProfilePictureContainer>
                {isGetAllStudysetsLoading ? (
                    <>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <UserInfoContainer key={i}>
                                <Skeleton width="60%" />
                                <Skeleton width="40%" />
                            </UserInfoContainer>
                        ))}
                    </>
                ) : (
                    <>
                        <UserInfoContainer>
                            <UserInfoHeading>
                                {t('profile.username')}
                            </UserInfoHeading>
                            <Typography>
                                {userData?.username ?? 'N/A'}
                            </Typography>
                        </UserInfoContainer>
                        <UserInfoContainer>
                            <UserInfoHeading>
                                {t('profile.studySetsCreated')}
                            </UserInfoHeading>
                            <Typography>{studysets.length}</Typography>
                        </UserInfoContainer>
                        <UserInfoContainer>
                            <UserInfoHeading>
                                {t('profile.totalCards')}
                            </UserInfoHeading>
                            <Typography>{totalCards}</Typography>
                        </UserInfoContainer>
                        <UserInfoContainer>
                            <UserInfoHeading>
                                {t('profile.labelsCreated')}
                            </UserInfoHeading>
                            <Typography>{labelsCount}</Typography>
                        </UserInfoContainer>
                        <UserInfoContainer>
                            <UserInfoHeading>
                                {t('profile.accountCreated')}
                            </UserInfoHeading>
                            <Typography>
                                {formatDateUsingPreferred(
                                    userData.createdAt,
                                    userData.metadata.preferredDateFormat ??
                                        DATE_FORMATS.MDY,
                                    userData.metadata.preferredTimeFormat ??
                                        TIME_FORMATS.TWELVE_HOUR,
                                    userData.metadata.showSeconds ?? false
                                )}
                            </Typography>
                        </UserInfoContainer>
                    </>
                )}
            </StyledProfileCard>
            {dialogOpen && (
                <Suspense fallback={null}>
                    <ProfilePictureDialog
                        open={dialogOpen}
                        onClose={handleCloseDialog}
                        userData={userData}
                    />
                </Suspense>
            )}
        </>
    );
};

export default ProfileCard;
