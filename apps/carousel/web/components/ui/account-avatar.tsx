import { AtSign } from 'lucide-react';

const sizes = {
  sm: { container: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { container: 'w-12 h-12', icon: 'w-6 h-6' },
  lg: { container: 'w-14 h-14', icon: 'w-7 h-7' },
};

export function AccountAvatar({
  avatarUrl,
  username,
  size = 'md',
}: {
  avatarUrl: string | null;
  username: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { container, icon } = sizes[size];
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${container} rounded-full object-cover border border-border shrink-0`}
      />
    );
  }
  return (
    <div className={`${container} rounded-full bg-pink-500/10 flex items-center justify-center shrink-0`}>
      <AtSign className={`${icon} text-pink-400`} />
    </div>
  );
}
