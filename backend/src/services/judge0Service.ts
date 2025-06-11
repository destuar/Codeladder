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

  // Convert execution time to milliseconds (from seconds)
  const executionTime = time ? parseFloat(time) * 1000 : undefined;

  return {
    passed: status.id === STATUS_CODES.ACCEPTED,
    output: decodedOutput,
    error: decodedError || undefined,
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
  // Convert input to a string representation based on language
  const inputStr = JSON.stringify(input);
  const inputCommaSeparated = input.join(', ');
  
  switch (language.toLowerCase()) {
    case 'javascript':
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
      return `
from typing import Optional, List
import json
import sys

# Common data structure definitions
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    
    def __repr__(self):
        return f"ListNode({self.val})"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    
    def __repr__(self):
        return f"TreeNode({self.val})"

# Utility functions for data structure conversions
def array_to_linked_list(arr):
    """Convert array to linked list"""
    if not arr:
        return None
    
    head = ListNode(arr[0])
    current = head
    for val in arr[1:]:
        current.next = ListNode(val)
        current = current.next
    return head

def linked_list_to_array(head):
    """Convert linked list to array"""
    if not head:
        return []
    
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

def array_to_binary_tree(arr):
    """Convert array to binary tree (level order)"""
    if not arr or arr[0] is None:
        return None
    
    root = TreeNode(arr[0])
    queue = [root]
    i = 1
    
    while queue and i < len(arr):
        node = queue.pop(0)
        
        # Left child
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        
        # Right child
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    
    return root

def binary_tree_to_array(root):
    """Convert binary tree to array (level order)"""
    if not root:
        return []
    
    result = []
    queue = [root]
    
    while queue:
        node = queue.pop(0)
        if node:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    
    # Remove trailing None values
    while result and result[-1] is None:
        result.pop()
    
    return result

def detect_data_structure_type(func_name, param_names):
    """Detect what type of data structure based on function name and parameters"""
    func_name_lower = func_name.lower()
    
    # Linked list indicators
    if any(keyword in func_name_lower for keyword in ['list', 'reverse', 'merge', 'cycle', 'palindrome']):
        if any(param in str(param_names).lower() for param in ['head', 'l1', 'l2', 'list']):
            return 'linked_list'
    
    # Tree indicators
    if any(keyword in func_name_lower for keyword in ['tree', 'binary', 'depth', 'path', 'ancestor']):
        if any(param in str(param_names).lower() for param in ['root', 'tree', 'node']):
            return 'binary_tree'
    
    # Default to array/primitive
    return 'array'

${code}

# Test driver
def run_test():
    input_data = ${inputStr}
    
    try:
        # Detect function signature and data structure type
        import inspect
        func = globals().get('${functionName}')
        if not func:
            raise Exception(f"Function '${functionName}' not found")
        
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        data_type = detect_data_structure_type('${functionName}', param_names)
        
        # Convert input based on detected type
        if data_type == 'linked_list':
            # Handle linked list conversion
            converted_args = []
            for i, arg in enumerate(input_data):
                if i < len(param_names):
                    param_name = param_names[i].lower()
                    if any(keyword in param_name for keyword in ['head', 'l1', 'l2', 'list']):
                        converted_args.append(array_to_linked_list(arg))
                    else:
                        converted_args.append(arg)
                else:
                    converted_args.append(arg)
            
            result = func(*converted_args)
            
            # Convert result back to array if it's a linked list
            if isinstance(result, ListNode):
                result = linked_list_to_array(result)
            elif result is None and data_type == 'linked_list':
                # For linked list problems, None should become empty array
                result = []
            
        elif data_type == 'binary_tree':
            # Handle binary tree conversion
            converted_args = []
            for i, arg in enumerate(input_data):
                if i < len(param_names):
                    param_name = param_names[i].lower()
                    if any(keyword in param_name for keyword in ['root', 'tree', 'node']):
                        converted_args.append(array_to_binary_tree(arg))
                    else:
                        converted_args.append(arg)
                else:
                    converted_args.append(arg)
            
            result = func(*converted_args)
            
            # Convert result back to array if it's a tree
            if isinstance(result, TreeNode):
                result = binary_tree_to_array(result)
            elif result is None and data_type == 'binary_tree':
                # For tree problems, None should become empty array
                result = []
            
        else:
            # Handle regular arrays and primitives
            result = func(*input_data)
        
        # Handle special result types
        if isinstance(result, (list, tuple)):
            # Check if it's a list of ListNodes (multiple linked lists)
            if result and isinstance(result[0], ListNode):
                result = [linked_list_to_array(node) for node in result]
        
        # Output result
        print(json.dumps(result, default=str))
            
    except Exception as e:
        print(f"Runtime error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

run_test()
      `;
    
    case 'java':
      // Extract class name from the user's code
      const classMatch = code.match(/class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Solution';
      
      // Check if this is a linked list problem
      const isLinkedListProblem = code.includes('ListNode') || functionName.toLowerCase().includes('list');
      
      if (isLinkedListProblem) {
        return `
import java.util.*;

// Definition for singly-linked list
class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

${code}

public class Main {
    public static void main(String[] args) {
        ${className} solution = new ${className}();
        try {
            int[] inputArray = {${inputCommaSeparated}};
            ListNode head = arrayToLinkedList(inputArray);
            
            ListNode result = solution.${functionName}(head);
            
            int[] resultArray = linkedListToArray(result);
            System.out.println(Arrays.toString(resultArray));
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private static ListNode arrayToLinkedList(int[] arr) {
        if (arr.length == 0) return null;
        
        ListNode head = new ListNode(arr[0]);
        ListNode current = head;
        for (int i = 1; i < arr.length; i++) {
            current.next = new ListNode(arr[i]);
            current = current.next;
        }
        return head;
    }
    
    private static int[] linkedListToArray(ListNode head) {
        List<Integer> list = new ArrayList<>();
        while (head != null) {
            list.add(head.val);
            head = head.next;
        }
        int[] result = new int[list.size()];
        for (int i = 0; i < list.size(); i++) {
            result[i] = list.get(i);
        }
        return result;
    }
}
        `;
      } else {
        return `
import java.util.*;

${code}

public class Main {
    public static void main(String[] args) {
        ${className} solution = new ${className}();
        try {
            int[] testInput = {${inputCommaSeparated}};
            Object result = solution.${functionName}(testInput);
            
            if (result instanceof int[]) {
                System.out.println(Arrays.toString((int[])result));
            } else {
                System.out.println(result);
            }
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
        `;
      }
    
    case 'cpp':
    case 'c++':
      // Check if this is a linked list problem
      const isLinkedListProblemCpp = code.includes('ListNode') || functionName.toLowerCase().includes('list');
      
      if (isLinkedListProblemCpp) {
        return `
#include <iostream>
#include <vector>

using namespace std;

// Definition for singly-linked list
struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

${code}

ListNode* arrayToLinkedList(vector<int>& arr) {
    if (arr.empty()) return nullptr;
    
    ListNode* head = new ListNode(arr[0]);
    ListNode* current = head;
    for (size_t i = 1; i < arr.size(); i++) {
        current->next = new ListNode(arr[i]);
        current = current->next;
    }
    return head;
}

vector<int> linkedListToArray(ListNode* head) {
    vector<int> result;
    while (head) {
        result.push_back(head->val);
        head = head->next;
    }
    return result;
}

int main() {
    vector<int> inputArray = {${inputCommaSeparated}};
    ListNode* head = arrayToLinkedList(inputArray);
    
    Solution solution;
    ListNode* result = solution.${functionName}(head);
    
    vector<int> resultArray = linkedListToArray(result);
    
    cout << "[";
    for (size_t i = 0; i < resultArray.size(); i++) {
        if (i > 0) cout << ",";
        cout << resultArray[i];
    }
    cout << "]" << endl;
    
    return 0;
}
        `;
      } else {
        return `
#include <iostream>
#include <vector>
#include <algorithm>
#include <climits>

using namespace std;

${code}

int main() {
    vector<int> testInput = {${inputCommaSeparated}};
    
    auto result = ${functionName}(testInput);
    
    cout << result << endl;
    
    return 0;
}
        `;
      }
    
    default:
      throw new Error(`Unsupported language for test formatting: ${language}`);
  }
} 