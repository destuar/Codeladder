import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Check } from "lucide-react";
import { cn } from "@/lib/utils"; 
import { Link } from "react-router-dom";

interface PricingTierProps {
  title: string;
  subtitle?: string;
  price: string;
  priceDetail?: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  isAnnual?: boolean;
  isComingSoon?: boolean;
  linkTo?: string;
}

const PricingTier = ({ title, subtitle, price, priceDetail, features, buttonText, isPopular = false, isComingSoon = false, linkTo }: PricingTierProps) => (
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
          <li key={index} className="flex items-start">
            <span className="mr-2 font-semibold">-</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      {/* Apply brand blue style to ALL buttons, disable if coming soon, link if linkTo provided */}
      {isComingSoon ? (
        <Button
          className="w-full text-white bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
          disabled
        >
          Coming Soon
        </Button>
      ) : linkTo ? (
        <Button className="w-full bg-[#5b5bf7] hover:bg-[#4a4af0] text-white" asChild>
          <Link to={linkTo}>{buttonText} &rarr;</Link>
        </Button>
      ) : (
        // Fallback for a button that's not coming soon and has no link
        <Button className="w-full bg-[#5b5bf7] hover:bg-[#4a4af0] text-white">
          {buttonText} &rarr;
        </Button>
      )}
    </CardFooter>
  </Card>
);

export const Pricing = () => {
  const tiers: PricingTierProps[] = [
    {
      title: "CodeLadder Free",
      subtitle: "Try It Yourself",
      price: "$0",
      features: [
        "Basic Problem Collections", 
        "Limited Company Profiles", 
        "Full Review Dashboard"
      ],
      buttonText: "Get Started Free",
      linkTo: "/register",
    },
    {
      title: "CodeLadder Pro",
      subtitle: "Best Value",
      price: "$15", 
      priceDetail: "$180 billed annually", 
      features: [
        "All Problem Collections",
        "Complete Company Profiles",
        "10+ DSA Concept Courses",
        "Learning Dashboard",
        "Review Dashboard", 
      ],
      buttonText: "Go Pro (Annual)", 
      isPopular: true,
      isAnnual: true,
      isComingSoon: true,
    },
    {
      title: "CodeLadder Pro",
      subtitle: "Monthly Plan", 
      price: "$25", 
      features: [
        "All Problem Collections",
        "Complete Company Profiles",
        "10+ DSA Concept Courses",
        "Learning Dashboard",
        "Review Dashboard", 
      ],
      buttonText: "Go Pro (Monthly)", 
      isComingSoon: true,
    },
  ];

  return (
    <section id="pricing" className="py-16 text-foreground">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pricing</h2>
          <p className="mt-2 text-lg text-muted-foreground">
            An investment into climbing the career ladder
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