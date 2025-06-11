import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { LoadingButton } from "@/components/ui/loading-spinner";

interface SocialAuthButtonProps {
  provider: 'google' | 'github';
  onClick: () => void;
  isLoading?: boolean;
}

const providerIcons = {
  google: FcGoogle,
  github: Github,
};

const providerNames = {
  google: 'Google',
  github: 'GitHub',
};

export function SocialAuthButton({ provider, onClick, isLoading }: SocialAuthButtonProps) {
  const Icon = providerIcons[provider];
  const hoverClasses = {
    github: "hover:border-primary/50 hover:bg-[#5271FF]/10 dark:hover:bg-[#6B8EFF]/10 text-foreground hover:text-[#5271FF] dark:hover:text-[#6B8EFF]",
    google: "hover:border-primary/50 hover:bg-[#5271FF]/10 dark:hover:bg-[#6B8EFF]/10 text-foreground hover:text-[#5271FF] dark:hover:text-[#6B8EFF]",
  };
  
  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      onClick={onClick}
      className={`w-full flex-1 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 dark:text-neutral-200 font-medium h-10 px-4 ${hoverClasses[provider]}`}
    >
      {isLoading ? (
        <LoadingButton size="sm" />
      ) : (
        <>
          <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
          <span>{providerNames[provider]}</span>
        </>
      )}
    </Button>
  );
} 