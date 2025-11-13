import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  className?: string;
}

export function UserAvatar({ name, className }: UserAvatarProps) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

