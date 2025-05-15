import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LanguageSupport, 
  defaultSupportedLanguages,
  prepareLanguageSupport,
  type SupportedLanguage,
  type LanguageData
} from '../components/LanguageSupport';

export default function LanguageSupportExample() {
  // State for language configuration
  const [supportedLanguages, setSupportedLanguages] = useState<Record<SupportedLanguage, LanguageData>>(defaultSupportedLanguages);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('python');
  
  // Handler for form submission - this would typically send data to an API
  const handleSubmit = () => {
    // Process language support for API submission
    const processedLanguages = prepareLanguageSupport(defaultLanguage, supportedLanguages);
    
    // Log the result (would be sent to API in a real app)
    console.log('Prepared for API:', {
      defaultLanguage,
      supportedLanguages: processedLanguages
    });
    
    // Show an alert with the data for demonstration
    alert(
      'Prepared language support data:\n\n' + 
      JSON.stringify({
        defaultLanguage,
        supportedLanguages: processedLanguages
      }, null, 2)
    );
  };
  
  return (
    <div className="container py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Language Support Configuration</CardTitle>
          <CardDescription>
            Configure which programming languages are supported for this coding problem,
            along with code templates and reference implementations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSupport
            supportedLanguages={supportedLanguages}
            setSupportedLanguages={setSupportedLanguages}
            defaultLanguage={defaultLanguage}
            setDefaultLanguage={setDefaultLanguage}
          />
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} className="ml-auto">
            Save Configuration
          </Button>
        </CardFooter>
      </Card>
      
      {/* Display current state */}
      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Current State</CardTitle>
          <CardDescription>
            This shows the current state of the language configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
            <pre className="whitespace-pre-wrap overflow-auto text-sm">
              {JSON.stringify({
                defaultLanguage,
                supportedLanguages
              }, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 