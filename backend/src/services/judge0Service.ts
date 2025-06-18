/**
 * @file backend/src/services/judge0Service.ts
 * 
 * Judge0 Service
 * Provides an interface to the Judge0 API for code execution.
 * Handles submission of code to the Judge0 API and processing of results.
 */

import axios from 'axios';
import env from '../config/env';
import { Request } from 'express';
import { LANGUAGE_IDS } from '../shared/languageIds';

// Add a timeout for Judge0 requests
const JUDGE0_TIMEOUT = Number(env.JUDGE0_TIMEOUT) || 10000;

// Define the Judge0 API URL and auth token
const JUDGE0_API = env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_AUTH_TOKEN = env.JUDGE0_AUTH_TOKEN;
const JUDGE0_HOST = env.JUDGE0_HOST || 'judge0-ce.p.rapidapi.com';

// Backup mapping for Judge0 Extra CE (if needed)
const EXTRA_LANGUAGE_IDS: Record<string, number> = {
  'python': 28,    // Python 3.10 (PyPy 7.3.12)
  'python3': 28,   // Python 3.10 (PyPy 7.3.12)
  'java': 4,       // Java (OpenJDK 14.0.1)
  'cpp': 2,        // C++ (Clang 10.0.1)
  'c': 1,          // C (Clang 10.0.1)
  'c#': 29,        // C# (.NET Core SDK 7.0.400)
  'cs': 29         // C# alias
};

// Submission request interface
interface SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  wall_time_limit?: number;
}

interface BatchSubmissionRequest {
  submissions: SubmissionRequest[];
}

// Submission response interface
interface SubmissionResponse {
  token: string;
}

// Result response interface
interface ResultResponse {
  stdout: string;
  stderr: string;
  status: {
    id: number;
    description: string;
  };
  time: string;
  memory: number;
  compile_output: string;
  exit_code: number;
  error?: string;
  message?: string;
}

// Status codes according to Judge0 documentation
const STATUS_CODES = {
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 7,
  INTERNAL_ERROR: 8,
  EXEC_FORMAT_ERROR: 9,
  PROCESSING: 1,
  IN_QUEUE: 2
};

// Processed result interface for the client
export interface ProcessedResult {
  passed: boolean;
  output: string;
  error?: string;
  compilationOutput?: string;
  statusDescription: string;
  statusId: number;
  executionTime?: number;
  memory?: number;
  exitCode?: number;
  input?: any;
  expected?: any;
}

/**
 * Submits a batch of code submissions to Judge0 for execution.
 *
 * @param submissions - An array of submission requests.
 * @returns A promise that resolves to an array of processed results.
 */
export async function submitCodeBatch(
  submissions: SubmissionRequest[],
): Promise<ProcessedResult[]> {
  // 1. Create batch submission
  const response = await axios.post<SubmissionResponse[]>(
    `${JUDGE0_API}/submissions/batch?base64_encoded=true`,
    { submissions },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
        'X-RapidAPI-Host': JUDGE0_HOST,
      },
      timeout: JUDGE0_TIMEOUT,
    },
  );

  const submissionTokens = response.data.map(item => {
    if ('token' in item) {
      return item.token;
    }
    // Handle potential errors for individual submissions in the batch
    // For now, we'll filter out invalid responses
    return null;
  }).filter(token => token !== null) as string[];

  // 2. Poll for batch results
  return await getBatchSubmissionResult(submissionTokens);
}

/**
 * Get the result of a submission using its token
 *
 * @param token Submission token
 * @returns Processed result of the execution
 */
async function getBatchSubmissionResult(
  tokens: string[],
): Promise<ProcessedResult[]> {
  const MAX_RETRIES = 20; // Increased retries for batch
  const RETRY_DELAY = 1500; // Increased delay for batch

  for (let i = 0; i < MAX_RETRIES; i++) {
    const response = await axios.get<{ submissions: ResultResponse[] }>(
      `${JUDGE0_API}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true&fields=*`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
          'X-RapidAPI-Host': JUDGE0_HOST,
        },
        timeout: JUDGE0_TIMEOUT,
      },
    );

    const results = response.data.submissions;
    const allDone = results.every(
      result => result.status.id > 2, // Not "In Queue" or "Processing"
    );

    if (allDone) {
      return results.map(processResult);
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }

  throw new Error('Batch submission processing timed out.');
}

/**
 * Submit code to Judge0 for execution
 * 
 * @param code Source code to execute
 * @param language Programming language of the source code
 * @param stdin Standard input for the program (optional)
 * @param expectedOutput Expected output for comparison (optional)
 * @returns Processed result of the execution
 */
export async function submitCode(
  code: string,
  language: string,
  stdin: string = '',
  expectedOutput: string = '',
): Promise<ProcessedResult> {
  // Get the language ID from the language mapping
  const languageId = LANGUAGE_IDS[language.toLowerCase()];
  if (!languageId) {
    console.error(`Unsupported language for Judge0 CE: ${language}. Attempted ID lookup in LANGUAGE_IDS.`);
    throw new Error(`Unsupported language for current Judge0 configuration: ${language}`);
  }

  // Prepare the submission request
  const submission: SubmissionRequest = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: languageId,
    stdin: stdin ? Buffer.from(stdin).toString('base64') : undefined,
    expected_output: expectedOutput ? Buffer.from(expectedOutput).toString('base64') : undefined,
    cpu_time_limit: 2, // 2 seconds
    wall_time_limit: 5, // 5 seconds
    memory_limit: 128000, // 128MB
  };

  try {
    // Submit the code to Judge0
    const response = await axios.post<SubmissionResponse>(
      `${JUDGE0_API}/submissions?base64_encoded=true`, 
      submission, 
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
          'X-RapidAPI-Host': JUDGE0_HOST
        },
        timeout: JUDGE0_TIMEOUT,
      }
    );

    // Get the submission token
    const token = response.data.token;
    
    // Get the result using the token
    return await getSubmissionResult(token);
  } catch (error) {
    console.error('Judge0 submission error:', error);

    // Check if it's an Axios error and specifically a 429
    if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
      return {
        passed: false,
        output: '',
        error: 'Server is busy (rate limit exceeded). Please try again in a few minutes.',
        statusDescription: 'Rate Limit Exceeded',
        statusId: 429, // Using HTTP status code for clarity, or a custom one
      };
    }
    
    // For other errors, return a generic error response
    return {
      passed: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred during code execution',
      statusDescription: 'Error',
      statusId: STATUS_CODES.INTERNAL_ERROR, // Or some other appropriate status
    };
  }
}

/**
 * Get the result of a submission using its token
 * 
 * @param token Submission token
 * @returns Processed result of the execution
 */
async function getSubmissionResult(token: string): Promise<ProcessedResult> {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 1000; // 1 second

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // Get the submission result
      const response = await axios.get<ResultResponse>(
        `${JUDGE0_API}/submissions/${token}`, 
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_AUTH_TOKEN,
            'X-RapidAPI-Host': JUDGE0_HOST
          },
          params: {
            base64_encoded: 'true',
            fields: 'stdout,stderr,status,time,memory,compile_output,message,exit_code',
          },
          timeout: JUDGE0_TIMEOUT,
        }
      );

      // Check if the submission is still processing or in queue
      if (response.data.status.id === STATUS_CODES.PROCESSING || 
          response.data.status.id === STATUS_CODES.IN_QUEUE) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      // Process and return the result
      return processResult(response.data);
    } catch (error) {
      console.error('Error fetching submission result:', error);

      // Check if it's an Axios error and specifically a 429
      if (axios.isAxiosError(error) && error.response && error.response.status === 429) {
        return {
          passed: false,
          output: '',
          error: 'Server is busy (rate limit exceeded while fetching results). Please try again.',
          statusDescription: 'Rate Limit Exceeded',
          statusId: 429, // Using HTTP status code for clarity
        };
      }
      
      // For other errors, return a generic error response
      return {
        passed: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred while fetching results',
        statusDescription: 'Error',
        statusId: STATUS_CODES.INTERNAL_ERROR,
      };
    }
  }

  // If we've exhausted all retries, return a timeout error
  return {
    passed: false,
    output: '',
    error: 'Code execution timed out after multiple retries',
    statusDescription: 'Timeout',
    statusId: STATUS_CODES.TIME_LIMIT_EXCEEDED,
  };
}

/**
 * Process the raw result from Judge0 into a more usable format
 * 
 * @param result Raw result from Judge0
 * @returns Processed result
 */
function processResult(result: ResultResponse): ProcessedResult {
  const {
    stdout, stderr, status, time, memory, compile_output, message, exit_code
  } = result;

  // Decode base64 encoded data
  const decodedOutput = stdout ? Buffer.from(stdout, 'base64').toString() : '';
  const decodedError = stderr ? Buffer.from(stderr, 'base64').toString() : '';
  const decodedCompileOutput = compile_output ? Buffer.from(compile_output, 'base64').toString() : '';
  const decodedMessage = message ? Buffer.from(message, 'base64').toString() : '';

  // Convert execution time to milliseconds (from seconds)
  const executionTime = time ? parseFloat(time) * 1000 : undefined;

  let errorForUser: string | undefined;

  switch (status.id) {
    case STATUS_CODES.COMPILATION_ERROR:
      errorForUser = decodedCompileOutput || 'Compilation Error: No output from compiler.';
      break;
    case STATUS_CODES.RUNTIME_ERROR:
    case STATUS_CODES.TIME_LIMIT_EXCEEDED:
    case STATUS_CODES.EXEC_FORMAT_ERROR:
      errorForUser = decodedError || decodedMessage || status.description;
      break;
    case STATUS_CODES.INTERNAL_ERROR:
      errorForUser = decodedMessage || decodedError || 'An internal error occurred.';
      break;
  }

  return {
    passed: status.id === STATUS_CODES.ACCEPTED,
    output: decodedOutput,
    error: errorForUser,
    compilationOutput: decodedCompileOutput || undefined,
    statusDescription: status.description,
    statusId: status.id,
    executionTime,
    memory,
    exitCode: exit_code,
  };
}

/**
 * Format the test code based on the language
 * 
 * @param code User submitted code
 * @param language Programming language
 * @param input Test case input
 * @param functionName Main function name to test
 * @returns Formatted code with test driver
 */
export function formatTestCode(
  code: string, 
  language: string, 
  input: any[],
  functionName: string
): string {
  const inputStr = JSON.stringify(input);
  const inputCommaSeparated = input.map(i => {
    if (typeof i === 'string') return `"${i}"`;
    if (i === null) return 'null';
    if (Array.isArray(i)) return `{${i.join(',')}}`; // For C-style arrays
    return i;
  }).join(', ');
  
  switch (language.toLowerCase()) {
    case 'javascript':
      // Javascript driver is likely sufficient for now.
      return `
${code}

// Test driver
function runTest() {
  const input = ${inputStr};
  try {
    const result = ${functionName}(...input);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error("Runtime error:", error.message);
    process.exit(1);
  }
}

runTest();
      `;
    
    case 'python':
    case 'python3':
      const pythonInputStr = inputStr.replace(/null/g, 'None');
      return `
from typing import Optional, List
import json
import sys
from collections import deque

# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Definition for a binary tree node.
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# Helper functions
def create_linked_list(arr, pos=-1):
    if not arr:
        return None
    nodes = [ListNode(val) for val in arr]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i+1]
    if pos != -1 and pos < len(nodes):
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def linked_list_to_array(head):
    if not head:
        return []
    arr = []
    visited = set()
    curr = head
    while curr:
        if id(curr) in visited:
            break
        visited.add(id(curr))
        arr.append(curr.val)
        curr = curr.next
    return arr

def array_to_binary_tree(arr):
    if not arr or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    q = deque([root])
    i = 1
    while q and i < len(arr):
        node = q.popleft()
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            q.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            q.append(node.right)
        i += 1
    return root

def binary_tree_to_array(root):
    if not root:
        return []
    arr = []
    q = deque([root])
    while q:
        node = q.popleft()
        if node:
            arr.append(node.val)
            q.append(node.left)
            q.append(node.right)
        else:
            arr.append(None)
    while arr and arr[-1] is None:
        arr.pop()
    return arr

${code}

# Test driver
def run_test():
    input_data = ${pythonInputStr}
    
    try:
        import inspect
        func = globals().get('${functionName}')
        if not func:
          # Check if it's a class method
          sol_class = globals().get('Solution')
          if sol_class:
            func = getattr(sol_class(), '${functionName}', None)
        
        if not func:
            raise Exception(f"Function '${functionName}' not found")
        
        sig = inspect.signature(func)
        param_names = [p for p in sig.parameters if p != 'self']

        converted_args = []
        func_name_lower = '${functionName}'.lower()

        # Heuristic-based argument conversion
        if 'cycle' in func_name_lower:
            # The input contains the list and the pos for cycle creation
            head = create_linked_list(input_data[0], input_data[1] if len(input_data) > 1 else -1)
            # The function under test, however, should only take the head unless it explicitly asks for pos
            if len(param_names) > 1 and 'pos' in param_names:
              converted_args = [head, input_data[1] if len(input_data) > 1 else -1]
            else:
              converted_args = [head]
        elif 'tree' in func_name_lower or any(p in ['root', 'treenode'] for p in param_names):
            for arg in input_data:
                converted_args.append(array_to_binary_tree(arg) if isinstance(arg, list) else arg)
        elif 'list' in func_name_lower or any(p in ['head', 'listnode'] for p in param_names):
             for arg in input_data:
                converted_args.append(create_linked_list(arg) if isinstance(arg, list) else arg)
        else:
            converted_args = input_data

        result = func(*converted_args)
        
        # Result serialization
        if isinstance(result, ListNode):
            result = linked_list_to_array(result)
        elif isinstance(result, TreeNode):
            result = binary_tree_to_array(result)
        elif result and isinstance(result, list) and len(result) > 0 and isinstance(result[0], ListNode):
            result = [linked_list_to_array(node) for node in result]
        
        print(json.dumps(result, default=str))
            
    except Exception as e:
        print(f"Runtime error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

run_test()
      `;
    
    case 'java':
      // 1. Sanitize user code
      const importRegex = /^\s*import\s+[\w\.\*]+;/gm;
      const userImports = code.match(importRegex) || [];
      const codeWithoutImports = code.replace(importRegex, '').trim();
      
      // Run checks on the original code before modification
      const javaHasUserTreeNode = /class\s+TreeNode/.test(code);
      const javaHasUserListNode = /class\s+ListNode\b/.test(code);
      
      // 2. Find the main solution class name with robust logic
      let className = 'Solution'; // Default
      const hasSolutionClass = /class\s+Solution\b/.test(codeWithoutImports);

      if (!hasSolutionClass) {
          // If no "Solution" class, find the first class that isn't a known data structure.
          const classMatches = [...codeWithoutImports.matchAll(/class\s+(\w+)/g)];
          const nonDSClass = classMatches.find(m => m[1] !== 'TreeNode' && m[1] !== 'ListNode');
          if (nonDSClass) {
              className = nonDSClass[1];
          } else if (classMatches.length > 0) {
              // Fallback to the first class if only DS classes are found
              className = classMatches[0][1];
          }
      }
 
       // 3. The generic driver logic
       let mainLogic = '';

      // Find function signature in the user's code
      const javaSignatureRegex = new RegExp(`(?:public|protected|private|static|\\s)*[\\w\\<\\>\\[\\]]+\\s+${functionName}\\s*\\(([^)]*)\\)`);
      const javaMatch = codeWithoutImports.match(javaSignatureRegex);
      let javaParamDataTypes: string[] = [];
      
      if (javaMatch && javaMatch[1]) {
          const paramsStr = javaMatch[1];
          if(paramsStr.trim() !== '') {
              const params = paramsStr.split(',').map(p => p.trim());
              javaParamDataTypes = params.map(p => {
                  // More robustly extract just the type
                  const typeMatch = p.match(/^([\w\.<>\[\]]+)/);
                  return typeMatch ? typeMatch[1] : 'unknown';
              });
          }
      }

      // Build the driver logic based on parameter types
       const javaArgs: string[] = [];
       const javaArgSetup: string[] = [];
       for (let i = 0; i < input.length; i++) {
           const arg = input[i];
           const varName = `arg${i}`;
          const type = javaParamDataTypes[i] || 'unknown';

           let argHandled = false;
          if (type !== 'unknown') {
              if (type === 'TreeNode') {
                  const arr = (Array.isArray(arg) ? arg : []);
                  const treeStr = arr.map(v => v === null ? 'null' : String(v)).join(',');
                  javaArgSetup.push(`TreeNode ${varName} = stringToTreeNode("${treeStr}");`);
                  javaArgs.push(varName);
                  argHandled = true;
              } else if (type === 'ListNode') {
                   const arr = (Array.isArray(arg) ? arg : []);
                   const listStr = `new int[]{${arr.join(',')}}`;
                   javaArgSetup.push(`ListNode ${varName} = createLinkedList(${listStr});`);
                   javaArgs.push(varName);
                   argHandled = true;
              } else if (type === 'char[]') {
                  const arr = (Array.isArray(arg) ? arg as string[] : []);
                  const arrStr = `new char[]{${arr.map(c => `'${c}'`).join(',')}}`;
                  javaArgSetup.push(`char[] ${varName} = ${arrStr};`);
                  javaArgs.push(varName);
                  argHandled = true;
              } else if (type === 'String[]') {
                  const arr = (Array.isArray(arg) ? arg as string[] : []);
                  const arrStr = `new String[]{${arr.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
                  javaArgSetup.push(`String[] ${varName} = ${arrStr};`);
                  javaArgs.push(varName);
                  argHandled = true;
              } else if (type === 'int[][]') {
                       const arr = (Array.isArray(arg) && arg.length > 0) ? arg as number[][] : [];
                       const arrStr = `new int[][]{${arr.map(sub => `new int[]{${sub.join(',')}}`).join(',')}}`;
                       javaArgSetup.push(`int[][] ${varName} = ${arrStr};`);
                       javaArgs.push(varName);
                       argHandled = true;
               } else if (type === 'int[]') {
                  const arrStr = `new int[]{${(Array.isArray(arg) ? arg as (number|null)[] : []).filter(n => n !== null).join(',')}}`;
                   javaArgSetup.push(`int[] ${varName} = ${arrStr};`);
                   javaArgs.push(varName);
                   argHandled = true;
               }
          }
          
          // Fallback to value-based guessing if type parsing fails or for simple types
           if (!argHandled) {
              if (typeof arg === 'number') {
                   javaArgs.push(String(arg));
               } else if (typeof arg === 'string') {
                   javaArgs.push(`"${String(arg).replace(/"/g, '\\"')}"`);
               } else if (Array.isArray(arg)) { // Smart fallback for arrays
                   if (arg.length > 0 && Array.isArray(arg[0])) {
                       // Assumes int[][]
                       const arr = arg as number[][];
                       const arrStr = `new int[][]{${arr.map(sub => `new int[]{${sub.join(',')}}`).join(',')}}`;
                       javaArgSetup.push(`int[][] ${varName} = ${arrStr};`);
                       javaArgs.push(varName);
                   } else {
                       // Assumes int[]
                       const arrStr = `new int[]{${(arg as (number|null)[]).filter(n => n !== null).join(',')}}`;
                       javaArgSetup.push(`int[] ${varName} = ${arrStr};`);
                       javaArgs.push(varName);
                   }
               }
           }
       }

      if (javaArgs.length > 0 || javaParamDataTypes.length === 0) { // allow zero-param functions
           mainLogic = `
               ${javaArgSetup.join('\n')}
               Object result = new ${className}().${functionName}(${javaArgs.join(', ')});
               printResult(result);
           `;
       } else {
           mainLogic = `System.out.println("Could not generate driver for this function signature.");`;
       }

  // 4. Assemble final Java file
  const allImports = new Set([
    'import java.util.*;',
    'import java.io.*;',
    ...userImports
  ]);

  return `
${[...allImports].join('\n')}

// Data structure definitions (guarded)
${!javaHasUserListNode ? `
class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; next = null; }
}` : ''}
${!javaHasUserTreeNode ? `
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int x) { val = x; }
}`: ''}

// Provided user code
${codeWithoutImports}

public class Main {
    public static void main(String[] args) {
         try {
             ${mainLogic}
         } catch(Exception e) {
              System.err.println("Error during execution: " + e.getMessage());
              e.printStackTrace();
         }
    }

    // ========= Generic Result Printer =========
    private static void printResult(Object result) {
        if (result == null) {
            System.out.println("null");
        } else if (result instanceof TreeNode) {
            System.out.println(treeNodeToString((TreeNode) result));
        } else if (result instanceof ListNode) {
            System.out.println(linkedListToString((ListNode) result));
        } else if (result instanceof int[]) {
            System.out.println(Arrays.toString((int[]) result).replace(" ", ""));
        } else if (result instanceof int[][]) {
            System.out.println(Arrays.deepToString((int[][]) result).replace(" ", ""));
        } else {
            System.out.println(result);
        }
    }

    // ========= Helper Functions for Java =========
    public static int[] stringToIntegerArray(String input) {
        if (input == null || input.isEmpty() || input.equals("[]")) return new int[0];
        String[] parts = input.replace("[", "").replace("]", "").split(",");
        int[] output = new int[parts.length];
        for(int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();
            if (!part.isEmpty()) {
                output[i] = Integer.parseInt(part);
            }
        }
        return output;
    }

    public static ListNode createLinkedList(int[] values) {
        if (values == null || values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (int val : values) {
            curr.next = new ListNode(val);
            curr = curr.next;
        }
        return dummy.next;
    }
    
    public static String linkedListToString(ListNode head) {
        if (head == null) return "null";
        List<Integer> list = new ArrayList<>();
        while(head != null) {
            list.add(head.val);
            head = head.next;
        }
        return Arrays.toString(list.toArray()).replace(" ", "");
    }

    public static ListNode createLinkedListWithCycle(int[] values, int pos) {
        if (values == null || values.length == 0) return null;
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        ListNode cycleNode = null;
        for (int i=0; i<values.length; i++) {
            curr.next = new ListNode(values[i]);
            curr = curr.next;
            if (pos == i) cycleNode = curr;
        }
        if (pos >= 0) curr.next = cycleNode;
        return dummy.next;
    }

    public static TreeNode stringToTreeNode(String input) {
        input = input.trim();
        if (input.length() == 0 || input.equals("[]")) return null;
        String[] parts = input.split(",");
        if (parts.length == 0 || parts[0].trim().equals("null")) return null;
        Queue<TreeNode> q = new LinkedList<>();
        TreeNode root = new TreeNode(Integer.parseInt(parts[0].trim()));
        q.add(root);
        int i = 1;
        while(!q.isEmpty() && i < parts.length) {
            TreeNode node = q.poll();
            if (i < parts.length && !parts[i].trim().equals("null")) {
                node.left = new TreeNode(Integer.parseInt(parts[i].trim()));
                q.add(node.left);
            }
            i++;
            if (i < parts.length && !parts[i].trim().equals("null")) {
                node.right = new TreeNode(Integer.parseInt(parts[i].trim()));
                q.add(node.right);
            }
            i++;
        }
        return root;
    }

    public static String treeNodeToString(TreeNode root) {
        if (root == null) return "null";
        List<String> list = new ArrayList<>();
        Queue<TreeNode> queue = new LinkedList<>();
        queue.offer(root);

        while (!queue.isEmpty()) {
            TreeNode node = queue.poll();
            if (node != null) {
                list.add(String.valueOf(node.val));
                queue.offer(node.left);
                queue.offer(node.right);
            } else {
                list.add("null");
            }
        }

        int lastNonNull = -1;
        for (int i = 0; i < list.size(); i++) {
            if (!list.get(i).equals("null")) {
                lastNonNull = i;
            }
        }
        if (lastNonNull == -1) return "null";

        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i <= lastNonNull; i++) {
            sb.append(list.get(i));
            if (i < lastNonNull) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }
}
      `;
    
    case 'cpp':
    case 'c++':
      // 1. Sanitize user code by extracting includes, usings, and struct/class definitions
      const includeRegex = /^\s*#include\s*<.*?>/gm;
      const usingRegex = /^\s*using\s+namespace\s+std;/gm;
      const structClassRegex = /^\s*(?:class|struct)\s+\w+(?:\s*:\s*public\s+\w+)?\s*\{[\s\S]*?};/gm;

      const userIncludes = code.match(includeRegex) || [];
      const userUsings = code.match(usingRegex) || [];
      const userStructs = code.match(structClassRegex) || [];

      const remainingCode = code
        .replace(includeRegex, '')
        .replace(usingRegex, '')
        .replace(structClassRegex, '')
        .trim();

      // Check if user has defined these structs to avoid redefinition
      const hasUserTreeNode = userStructs.some(s => s.includes('struct TreeNode'));
      const hasUserListNode = userStructs.some(s => s.includes('struct ListNode'));
      const userCodeIsClass = remainingCode.trim().startsWith('class Solution');
      
      const finalUserCode = userCodeIsClass ? remainingCode : `
class Solution {
public:
${remainingCode}
};`;
      
      // 3. Generate the main logic for the specific problem
       let cppMainLogic = '';

        // Generic handlers based on parsing the function signature
        // 1. Find function signature
        const cppSignatureRegex = new RegExp(`([\\w\\<\\>\\:\\*&\\s]+?)\\s+${functionName}\\s*\\(([^)]*)\\)`);
        const cppMatch = code.match(cppSignatureRegex);
        let cppParamDataTypes: string[] = [];

        if (cppMatch && cppMatch[2]) {
            const paramsStr = cppMatch[2];
                if(paramsStr.trim() !== '') {
                const params = paramsStr.split(',').map(p => p.trim());
                // More robustly parse types, removing references and variable names
                cppParamDataTypes = params.map(p => 
                    p.replace(/&/g, '').replace(/\b\w+\s*$/, '').trim()
                );
            }
        }
        
        // 2. Build the driver logic based on parameter types
         const cppArgs: string[] = [];
         const cppArgSetup: string[] = [];
         for (let i = 0; i < input.length; i++) {
             const arg = input[i];
             const varName = `arg${i}`;
            const type = cppParamDataTypes[i] || 'unknown';

            let argHandled = false;
            if (type !== 'unknown') {
                if (type === 'TreeNode*') {
                    const arrStr = JSON.stringify(Array.isArray(arg) ? arg : []);
                    cppArgSetup.push(`TreeNode* ${varName} = stringToTreeNode(R"(${arrStr})");`);
                    cppArgs.push(varName);
                    argHandled = true;
                } else if (type === 'ListNode*') {
                     const arr = (Array.isArray(arg) ? arg : []);
                     const arrStr = `{${arr.join(',')}}`;
                     cppArgSetup.push(`vector<int> temp_vec_${varName} = ${arrStr};`);
                     cppArgSetup.push(`ListNode* ${varName} = createLinkedListWithCycle(temp_vec_${varName}, -1);`);
                     cppArgs.push(varName);
                     argHandled = true;
                } else if (type === 'vector<char>') {
                    const arr = (Array.isArray(arg) ? arg as string[] : []);
                    const arrStr = `{${arr.map(c => `'${c}'`).join(',')}}`;
                    cppArgSetup.push(`vector<char> ${varName} = ${arrStr};`);
                    cppArgs.push(varName);
                    argHandled = true;
                } else if (type === 'vector<string>') {
                    const arr = (Array.isArray(arg) ? arg as string[] : []);
                    const arrStr = `{${arr.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
                    cppArgSetup.push(`vector<string> ${varName} = ${arrStr};`);
                    cppArgs.push(varName);
                    argHandled = true;
                } else if (type === 'vector<vector<int>>') {
                        const arr = (Array.isArray(arg) && arg.length > 0) ? arg as number[][] : [];
                        const arrStr = `{${arr.map(sub => `{${sub.join(',')}}`).join(',')}}`;
                        cppArgSetup.push(`vector<vector<int>> ${varName} = ${arrStr};`);
                        cppArgs.push(varName);
                        argHandled = true;
                } else if (type === 'vector<int>') {
                        const arrStr = `{${(Array.isArray(arg) ? arg as number[] : []).join(',')}}`;
                        cppArgSetup.push(`vector<int> ${varName} = ${arrStr};`);
                        cppArgs.push(varName);
                        argHandled = true;
                } else if (type === 'string') {
                    cppArgSetup.push(`string ${varName} = "${String(arg).replace(/"/g, '\\"')}";`);
                    cppArgs.push(varName);
                    argHandled = true;
                }
            }

            // Fallback for simple types
            if (!argHandled) {
                if (typeof arg === 'number') {
                    cppArgs.push(String(arg));
                } else if (typeof arg === 'string') {
                    // This will be used if type parsing failed but we get a string
                    cppArgSetup.push(`string ${varName} = "${String(arg).replace(/"/g, '\\"')}";`);
                    cppArgs.push(varName);
                } else if (Array.isArray(arg)) { // Smart fallback for arrays
                   if (arg.length > 0 && Array.isArray(arg[0])) {
                        // Assumes vector<vector<int>>
                        const arr = arg as number[][];
                        const arrStr = `{${arr.map(sub => `{${sub.join(',')}}`).join(',')}}`;
                        cppArgSetup.push(`vector<vector<int>> ${varName} = ${arrStr};`);
                        cppArgs.push(varName);
                    } else {
                        // Assumes vector<int>
                        const arrStr = `{${(arg as (number|null)[]).filter(n => n !== null).join(',')}}`;
                        cppArgSetup.push(`vector<int> ${varName} = ${arrStr};`);
                        cppArgs.push(varName);
                    }
                }
            }
        }

        if (cppArgs.length > 0 || cppParamDataTypes.length === 0) {
              cppMainLogic = `
                  ${cppArgSetup.join('\n')}
                  Solution sol;
                  auto result = sol.${functionName}(${cppArgs.join(', ')});
                  printResult(result);
              `;
          } else {
              cppMainLogic = `
                cout << "Could not generate driver for this function signature." << endl;
              `;
          }

      // 4. Assemble the final C++ file
       return `
#include <iostream>
#include <vector>
#include <string>
#include <queue>
#include <algorithm>
#include <sstream>
#include <limits>
#include <cctype>

${userIncludes.join('\n')}

${userUsings.length > 0 ? userUsings.join('\n') : 'using namespace std;'}

// User-provided structs take precedence
${userStructs.join('\n\n')}

// Guarded struct definitions, only if not provided by user
${!hasUserListNode ? `
#ifndef LISTNODE_DEF
#define LISTNODE_DEF
struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(NULL) {}
};
#endif
` : ''}

${!hasUserTreeNode ? `
#ifndef TREENODE_DEF
#define TREENODE_DEF
struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode(int x) : val(x), left(NULL), right(NULL) {}
};
#endif
` : ''}

// The user's functions wrapped in a class (or as is if already a class)
${finalUserCode}

// ========= Helper Functions for C++ =========
TreeNode* stringToTreeNode(string input) {
    if (input.length() <= 2) return nullptr;
    input = input.substr(1, input.length() - 2);
    if (input.empty()) return nullptr;

    stringstream ss(input);
    string item;
    
    getline(ss, item, ',');
    if (item == "null") return nullptr;

    TreeNode* root = new TreeNode(stoi(item));
    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();

        if (getline(ss, item, ',')) {
            item.erase(remove(item.begin(), item.end(), ' '), item.end());
            if (item != "null") {
                node->left = new TreeNode(stoi(item));
                q.push(node->left);
            }
        }
        if (getline(ss, item, ',')) {
            item.erase(remove(item.begin(), item.end(), ' '), item.end());
            if (item != "null") {
                node->right = new TreeNode(stoi(item));
                q.push(node->right);
            }
        }
    }
    return root;
}

string listNodeToString(ListNode* head) {
    if (!head) return "null";
    string result = "";
    while(head) {
        result += to_string(head->val) + ",";
        head = head->next;
    }
    return "[" + result.substr(0, result.length() - 1) + "]";
}

string treeNodeToString(TreeNode* root) {
    if (!root) return "null";

    string output = "";
    queue<TreeNode*> q;
    q.push(root);

    while(!q.empty()) {
        TreeNode* node = q.front();
        q.pop();

        if (node) {
            output += to_string(node->val) + ",";
            q.push(node->left);
            q.push(node->right);
        } else {
            output += "null,";
        }
    }

    // Trim trailing nulls
    size_t last_valid = output.find_last_not_of("null,");
    if(string::npos != last_valid) {
      // Find the end of the last valid number
      size_t end_of_last_num = output.find(',', last_valid);
      if (string::npos != end_of_last_num) {
        output.resize(end_of_last_num);
      }
    }
    
    if (!output.empty() && output.back() == ',') {
        output.pop_back();
    }

    return "[" + output + "]";
}

ListNode* createLinkedListWithCycle(vector<int>& values, int pos) {
    if (values.empty()) return nullptr;
    ListNode* head = new ListNode(values[0]);
    ListNode* current = head;
    ListNode* cycleNode = (pos == 0) ? head : nullptr;
    for (size_t i = 1; i < values.size(); ++i) {
        current->next = new ListNode(values[i]);
        current = current->next;
        if (pos == (int)i) cycleNode = current;
    }
    if (pos >= 0) current->next = cycleNode;
    return head;
}

void printVector(const vector<int>& vec) {
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        cout << vec[i] << (i < vec.size() - 1 ? "," : "");
    }
    cout << "]" << endl;
}

void printVectorOfVectors(const vector<vector<int>>& vec) {
    cout << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        cout << "[";
        for (size_t j = 0; j < vec[i].size(); ++j) {
            cout << vec[i][j] << (j < vec[i].size() - 1 ? "," : "");
        }
        cout << "]" << (i < vec.size() - 1 ? "," : "");
    }
    cout << "]" << endl;
}

// ========= Generic Result Printer =========
void printResult(int res) { cout << res << endl; }
void printResult(bool res) { cout << (res ? "true" : "false") << endl; }
void printResult(const std::string& res) { cout << res << endl; }
void printResult(const std::vector<int>& vec) { printVector(vec); }
void printResult(const std::vector<std::vector<int>>& vec) { printVectorOfVectors(vec); }
void printResult(TreeNode* root) { cout << treeNodeToString(root) << endl; }
void printResult(ListNode* head) { cout << listNodeToString(head) << endl; }

int main() {
     string funcName = "${functionName}";
     ${cppMainLogic}
     return 0;
}
        `;
    
    default:
      throw new Error(`Unsupported language for test formatting: ${language}`);
  }
} 