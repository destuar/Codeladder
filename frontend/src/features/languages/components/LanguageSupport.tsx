import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import React from "react";

// Supported language types
export type SupportedLanguage = 'python' | 'javascript' | 'java' | 'cpp';

// Data structure for each language
export type LanguageData = {
  enabled: boolean;
  template: string;
  reference: string;
};

export type LanguageSupportProps = { 
  supportedLanguages: Record<SupportedLanguage, LanguageData>;
  setSupportedLanguages: React.Dispatch<React.SetStateAction<Record<SupportedLanguage, LanguageData>>>;
  defaultLanguage: string;
  setDefaultLanguage: React.Dispatch<React.SetStateAction<string>>;
};

// Utility function to prepare language support for API submission
export const prepareLanguageSupport = (
  defaultLanguage: string,
  supportedLanguages: Record<string, any>
): any => {
  // Create result object
  const result: Record<string, any> = {};
  
  // Add each enabled language
  Object.entries(supportedLanguages).forEach(([lang, data]) => {
    if (data.enabled) {
      result[lang] = {
        template: data.template || '',
        reference: data.reference || null
      };
    }
  });
  
  // If no languages are enabled, add the default
  if (Object.keys(result).length === 0 && defaultLanguage) {
    // Handle case where supportedLanguages doesn't have the default language
    if (supportedLanguages[defaultLanguage]) {
      result[defaultLanguage] = {
        template: supportedLanguages[defaultLanguage].template || '',
        reference: null
      };
    } else {
      result[defaultLanguage] = {
        template: '',
        reference: null
      };
    }
  }
  
  return result;
};

// Initial default state for supported languages
export const defaultSupportedLanguages: Record<SupportedLanguage, LanguageData> = {
  python: { enabled: true, template: '', reference: '' },
  javascript: { enabled: false, template: '', reference: '' },
  java: { enabled: false, template: '', reference: '' },
  cpp: { enabled: false, template: '', reference: '' }
};

export const LanguageSupport: React.FC<LanguageSupportProps> = ({ 
  supportedLanguages, 
  setSupportedLanguages,
  defaultLanguage,
  setDefaultLanguage
}) => {
  // Language display names
  const languageNames: Record<SupportedLanguage, string> = {
    'python': 'Python',
    'javascript': 'JavaScript',
    'java': 'Java',
    'cpp': 'C++'
  };
  
  // Get array of enabled languages
  const enabledLanguages = Object.entries(supportedLanguages)
    .filter(([_, data]) => data.enabled)
    .map(([lang]) => lang);
  
  // Handle toggling a language
  const toggleLanguage = (language: SupportedLanguage) => {
    setSupportedLanguages(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        enabled: !prev[language].enabled
      }
    }));
    
    // If we're disabling the default language, change default to another enabled one
    if (language === defaultLanguage && supportedLanguages[language].enabled) {
      // Find first enabled language that's not this one
      const newDefault = Object.entries(supportedLanguages)
        .filter(([lang, data]) => lang !== language && data.enabled)
        .map(([lang]) => lang)[0];
        
      if (newDefault) {
        setDefaultLanguage(newDefault);
      }
    }
    
    // If we're enabling a language and there's no default yet, make this the default
    if (!supportedLanguages[language].enabled && !defaultLanguage) {
      setDefaultLanguage(language);
    }
  };
  
  // Handle changing a template
  const handleTemplateChange = (language: SupportedLanguage, template: string) => {
    setSupportedLanguages(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        template
      }
    }));
  };
  
  // Handle changing a reference implementation
  const handleReferenceChange = (language: SupportedLanguage, reference: string) => {
    setSupportedLanguages(prev => ({
      ...prev,
      [language]: {
        ...prev[language],
        reference
      }
    }));
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Supported Languages</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(languageNames).map(([lang, name]) => (
            <div key={lang} className="flex items-center space-x-2">
              <Checkbox 
                id={`lang-${lang}`}
                checked={supportedLanguages[lang as SupportedLanguage]?.enabled || false}
                onCheckedChange={() => toggleLanguage(lang as SupportedLanguage)}
              />
              <Label htmlFor={`lang-${lang}`}>{name}</Label>
            </div>
          ))}
        </div>
      </div>
      
      {enabledLanguages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Default Language</h3>
            <Select 
              value={defaultLanguage} 
              onValueChange={setDefaultLanguage}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {enabledLanguages.map(lang => (
                  <SelectItem key={lang} value={lang}>
                    {languageNames[lang as SupportedLanguage]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {enabledLanguages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Language Templates</h3>
          <Tabs 
            value={defaultLanguage || enabledLanguages[0]} 
            onValueChange={setDefaultLanguage}
            className="w-full"
          >
            <TabsList className="mb-2 grid w-full grid-cols-none justify-start sm:grid-cols-auto">
              {enabledLanguages.map(lang => (
                <TabsTrigger key={lang} value={lang}>
                  {languageNames[lang as SupportedLanguage]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {enabledLanguages.map(lang => (
              <TabsContent key={lang} value={lang} className="space-y-4">
                <div>
                  <Label htmlFor={`template-${lang}`}>Code Template</Label>
                  <Textarea 
                    id={`template-${lang}`}
                    value={supportedLanguages[lang as SupportedLanguage]?.template || ''}
                    onChange={(e) => handleTemplateChange(lang as SupportedLanguage, e.target.value)}
                    className="font-mono text-sm h-40"
                    placeholder={`Enter ${languageNames[lang as SupportedLanguage]} code template`}
                  />
                </div>
                
                <div>
                  <Label htmlFor={`reference-${lang}`}>Reference Implementation (Optional)</Label>
                  <Textarea 
                    id={`reference-${lang}`}
                    value={supportedLanguages[lang as SupportedLanguage]?.reference || ''}
                    onChange={(e) => handleReferenceChange(lang as SupportedLanguage, e.target.value)}
                    className="font-mono text-sm h-40"
                    placeholder={`Enter ${languageNames[lang as SupportedLanguage]} reference implementation`}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}; 