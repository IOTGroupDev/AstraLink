import React from 'react';
import ProfileSVG from '@assets/tabs/profile-icon.svg';

interface ProfileSvgProps {
  size?: number;
  color?: any;
}

const ProfileSvg: React.FC<ProfileSvgProps> = ({ size = 32, color }) => {
  return <ProfileSVG width={size} height={size} fill={color} />;
};

export default ProfileSvg;
