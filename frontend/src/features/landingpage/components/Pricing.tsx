import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils"; 

interface PricingTierProps {
  title: string;
  subtitle?: string;
  price: string;
  priceDetail?: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  isAnnual?: boolean;
}

const PricingTier = ({ title, subtitle, price, priceDetail, features, buttonText, isPopular = false }: PricingTierProps) => (
  // Use brand blue for border, add glow effect via shadow
  <Card className={cn(
    "flex flex-col", 
    isPopular ? "border-[#5b5bf7]/50 border-2 shadow-lg shadow-[#5b5bf7]/30 relative dark:shadow-[#5b5bf7]/50" : "border"
  )}>
    {isPopular && (
      // Use brand blue for popular badge background, white check
      <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-[#5b5bf7] rounded-full p-1.5 z-10">
        <Check className="h-5 w-5 text-white" /> 
      </div>
    )}
    <CardHeader className="flex-grow-0">
      <CardTitle>{title}</CardTitle>
      {subtitle && <CardDescription>{subtitle}</CardDescription>}
    </CardHeader>
    <CardContent className="flex flex-col flex-grow space-y-4">
      <div className="text-4xl font-bold">{price}<span className="text-sm font-normal text-muted-foreground"> / month</span></div>
      {priceDetail && <p className="text-xs text-muted-foreground">{priceDetail}</p>}
      <ul className="space-y-2 text-sm flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            {/* Keep check green for feature list */}
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      {/* Apply brand blue style to ALL buttons */}
      <Button className="w-full bg-[#5b5bf7] hover:bg-[#4a4af0] text-white">{buttonText} &rarr;</Button>
    </CardFooter>
  </Card>
);

export const Pricing = () => {
  const tiers: PricingTierProps[] = [
    {
      title: "CodeLadder Free",
      subtitle: "Try it and see",
      price: "$0",
      features: [
        "Access to Level 1", 
        "Basic Problem Sets", 
        "Standard AI Assistance"
      ],
      buttonText: "Get Started Free",
    },
    {
      title: "CodeLadder Pro",
      subtitle: "Best Value",
      price: "$15", 
      priceDetail: "$180 billed annually", 
      features: [
        "Full Access to All Levels",
        "Complete Problem Library",
        "Advanced AI Debugging & Explanations",
        "Personalized Spaced Repetition",
        "Priority Support", 
      ],
      buttonText: "Go Pro (Annual)", 
      isPopular: true,
      isAnnual: true,
    },
    {
      title: "CodeLadder Pro",
      subtitle: "Monthly Plan", 
      price: "$25", 
      features: [
        "Full Access to All Levels",
        "Complete Problem Library",
        "Advanced AI Debugging & Explanations",
        "Personalized Spaced Repetition",
        "Priority Support", 
      ],
      buttonText: "Go Pro (Monthly)", 
    },
  ];

  return (
    <section id="pricing" className="py-16 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Simple and transparent pricing for everyone.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <PricingTier key={tier.title + (tier.isAnnual ? '-annual' : '')} {...tier} />
          ))}
        </div>
      </div>
    </section>
  );
}; 