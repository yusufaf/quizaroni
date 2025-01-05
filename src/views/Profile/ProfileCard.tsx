import { AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import { Typography } from '@mui/material/';
import { useEffect, useRef } from 'react';
import {
    ProfilePicture,
    StyledProfileCard,
    UploadImageButton,
    UserInfoContainer,
    UserInfoHeading,
} from './ProfileStyles';
import { useGetAllStudysetsQuery } from 'state/api/studysetsAPI';
import { User } from 'shared/types';

type Props = {
    userData: User;
};
const ProfileCard = ({ userData }: Props) => {
    const { data: studysetsResponse, isLoading: isGetAllStudysetsLoading } =
        useGetAllStudysetsQuery({});
    const studysets = studysetsResponse?.studysets ?? [];

    useEffect(() => {}, []);

    const handleProfilePicture = () => {};

    return (
        <>
            <StyledProfileCard elevation={6}>
                <ProfilePicture></ProfilePicture>
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
        </>
    );
};

export default ProfileCard;
