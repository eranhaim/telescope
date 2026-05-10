import type { Profile } from "../api/client";

interface Props {
  profile: Profile;
  onClick: () => void;
}

export default function ProfileCard({ profile, onClick }: Props) {
  const imageUrl = profile.profileImageThumbUrl || profile.profileImageUrl || "/placeholder.svg";

  return (
    <button
      onClick={onClick}
      className="relative aspect-[3/4] overflow-hidden rounded-xl group cursor-pointer border-0 p-0 bg-transparent w-full"
    >
      <img
        src={imageUrl}
        alt={profile.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-white font-semibold text-sm leading-tight drop-shadow-md">
            {profile.name}
          </span>
          {profile.isVerified && (
            <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}
