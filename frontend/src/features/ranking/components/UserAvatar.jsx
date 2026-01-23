/**
 * UserAvatar Component
 * Displays GitHub user avatar with username
 */

export function UserAvatar({ username, size = 32 }) {
  // GitHub avatar URL - simple and reliable
  const avatarUrl = `https://github.com/${username}.png?size=${size}`;
  
  return (
    <div className="flex items-center gap-2">
      <img
        src={avatarUrl}
        alt={username}
        className="rounded-full border border-[#e8eaed]"
        style={{ width: `${size}px`, height: `${size}px` }}
        onError={(e) => {
          // Fallback to a default avatar if image fails to load
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&size=${size}&background=random`;
        }}
      />
      <span className="font-medium text-[#202124]">{username}</span>
    </div>
  );
}
