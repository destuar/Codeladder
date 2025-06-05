import { z } from 'zod';
import { Difficulty, ProblemType } from '@/features/problems/types';
import { NewProblem, TestCase, FunctionParameter } from '../components/LearningPathAdmin';
import { SupportedLanguage, LanguageData } from '@/features/languages/components/LanguageSupport';

// Interface for the JSON structure to be imported
export interface ProblemJSONImport {
  name: string;
  slug?: string;
  content: string;
  difficulty: "BEGINNER" | "EASY" | "MEDIUM" | "HARD";
  problemType: "INFO" | "CODING";
  required: boolean;
  reqOrder: number;
  estimatedTime?: number;
  collectionIds?: string[];
  topicId?: string;

  coding?: {
    functionName: string;
    returnType: string;
    timeLimit: number;
    memoryLimit?: number;
    parameters: Array<{
      name: string;
      type: string;
      description?: string;
    }>;
    languages: {
      defaultLanguage: SupportedLanguage;
      supported: Partial<Record<SupportedLanguage, { template: string; reference?: string; solution?: string }>>;
    };
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
  };
}

// Zod schema for validation
const FunctionParameterSchemaInternal = z.object({
  name: z.string().min(1, "Parameter name is required"),
  type: z.string().min(1, "Parameter type is required"),
  description: z.string().optional(),
});

const LanguageDetailSchema = z.object({
  template: z.string(),
  reference: z.string().optional(),
  solution: z.string().optional(),
});

const CodingSchema = z.object({
  functionName: z.string().min(1, "Function name is required"),
  returnType: z.string().min(1, "Return type is required"),
  timeLimit: z.number().positive("Time limit must be positive"),
  memoryLimit: z.number().positive("Memory limit must be positive").optional(),
  parameters: z.array(FunctionParameterSchemaInternal),
  languages: z.object({
    defaultLanguage: z.enum(['python', 'javascript', 'java', 'cpp']),
    supported: z.object({
        python: LanguageDetailSchema.optional(),
        javascript: LanguageDetailSchema.optional(),
        java: LanguageDetailSchema.optional(),
        cpp: LanguageDetailSchema.optional(),
    }).refine(obj => Object.values(obj).some(val => val !== undefined), "At least one supported language definition is required in 'supported' object if 'languages' object is present")
  }),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isHidden: z.boolean(),
  })).min(1, "At least one test case is required for coding problems"),
});

export const ProblemJSONSchema = z.object({
  name: z.string().min(1, "Problem name is required"),
  slug: z.string().optional(),
  content: z.string().min(1, "Problem content is required"),
  difficulty: z.enum(["BEGINNER", "EASY", "MEDIUM", "HARD"]),
  problemType: z.enum(["INFO", "CODING"]),
  required: z.boolean().optional(),
  reqOrder: z.number().int().positive("Request order must be a positive integer").optional(),
  estimatedTime: z.number().int().positive("Estimated time must be a positive integer").optional(),
  collectionIds: z.array(z.string()).optional(),
  topicId: z.string().cuid("Invalid topic ID format").optional(),
  coding: CodingSchema.optional(),
}).refine((data) => {
  if (data.problemType === "CODING" && !data.coding) {
    return false;
  }
  if (data.problemType === "CODING" && data.coding) {
    const defaultLang = data.coding.languages.defaultLanguage;
    if (!data.coding.languages.supported[defaultLang]) {
        return false;
    }
  }
  return true;
}, {
  message: "For CODING problems, the 'coding' object is required, and its 'defaultLanguage' must be defined within the 'supported' languages list.",
  path: ["coding"], 
});

// Interface for validation results
export interface ValidationResult {
  isValid: boolean;
  errors: { path: (string | number)[]; message: string }[];
  warnings: string[];
  parsedData?: ProblemJSONImport;
}

// Function to generate warnings (example)
function generateWarnings(data: ProblemJSONImport): string[] {
  const warnings: string[] = [];
  if (data.problemType === "CODING" && data.coding) {
    if (!data.coding.memoryLimit) {
      warnings.push("Coding problem is missing an optional memoryLimit. Consider adding one.");
    }
    const supportedLangsCount = Object.values(data.coding.languages.supported).filter(lang => lang !== undefined).length;
    if (supportedLangsCount === 0) {
        warnings.push("No languages are explicitly defined in the 'supported' section. The default language template will be used if available, or an empty template otherwise.");
    }
  }
  if (!data.slug) {
    warnings.push("Slug is not provided and will be auto-generated from the name.");
  }
  return warnings;
}

// Function to validate and parse JSON
export function validateAndParseProblemJSON(jsonString: string): ValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    const result = ProblemJSONSchema.safeParse(parsed);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
        warnings: generateWarnings(result.data as ProblemJSONImport), 
        parsedData: result.data as ProblemJSONImport, 
      };
    } else {
      return {
        isValid: false,
        errors: result.error.issues.map(issue => ({ path: issue.path, message: issue.message })),
        warnings: [],
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [{ path: ["json"], message: "Invalid JSON format. " + (error instanceof Error ? error.message : String(error)) }],
      warnings: [],
    };
  }
}

// Function to map parsed JSON to form state
export function mapJSONToFormState(json: ProblemJSONImport): {
  basicFields: NewProblem;
  languageSupport: Record<SupportedLanguage, LanguageData>;
  defaultLanguage: SupportedLanguage;
} {
  const basicFields: NewProblem = {
    name: json.name,
    content: json.content,
    difficulty: json.difficulty as Difficulty,
    required: json.required,
    reqOrder: json.reqOrder,
    problemType: json.problemType as ProblemType, 
    estimatedTime: json.estimatedTime,
    slug: json.slug || '',
    collectionIds: json.collectionIds || [],
    
    language: json.coding?.languages.defaultLanguage || 'python', 
    functionName: json.coding?.functionName || '',
    timeLimit: json.coding?.timeLimit || 5000,
    memoryLimit: json.coding?.memoryLimit,
    return_type: json.coding?.returnType || '',
    // Map parameters for NewProblem (which expects FunctionParameter[])
    params: json.coding?.parameters.map(p => ({ 
        name: p.name, 
        type: p.type, 
        description: p.description 
    })) || [], 
    codeTemplate: '', 
    // Map testCases for NewProblem (which expects TestCase[])
    testCases: json.coding?.testCases.map(tc => ({
      input: tc.input,
      expected: tc.expectedOutput, 
      isHidden: tc.isHidden,
    })) || [],
  };

  const languageSupportResult: Record<SupportedLanguage, LanguageData> = {
    python: { enabled: false, template: '', reference: '', solution: '' },
    javascript: { enabled: false, template: '', reference: '', solution: '' },
    java: { enabled: false, template: '', reference: '', solution: '' },
    cpp: { enabled: false, template: '', reference: '', solution: '' },
  };

  let finalDefaultLanguage: SupportedLanguage = 'python';

  if (json.coding?.languages.supported) {
    finalDefaultLanguage = json.coding.languages.defaultLanguage;
    Object.entries(json.coding.languages.supported).forEach(([lang, data]) => {
      if (lang in languageSupportResult && data) { 
        languageSupportResult[lang as SupportedLanguage] = {
          enabled: true,
          template: data.template,
          reference: data.reference || '',
          solution: (data as any).solution || '',
        };
      }
    });
  }
  
  if (json.coding && languageSupportResult[finalDefaultLanguage]?.enabled) {
      basicFields.codeTemplate = languageSupportResult[finalDefaultLanguage].template;
  }

  return {
    basicFields,
    languageSupport: languageSupportResult,
    defaultLanguage: finalDefaultLanguage,
  };
} 