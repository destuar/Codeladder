import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";

interface SocialAuthButtonProps {
  provider: 'google' | 'github' | 'apple';
  onClick: () => void;
  isLoading?: boolean;
}

const providerIcons = {
  google: FcGoogle,
  github: Github,
  apple: FaApple
};

const providerNames = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple'
};

export function SocialAuthButton({ provider, onClick, isLoading }: SocialAuthButtonProps) {
  const Icon = providerIcons[provider];
  
  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      onClick={onClick}
      className="flex-1 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 font-medium h-10 px-4"
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{providerNames[provider]}</span>
        </>
      )}
    </Button>
  );
} 