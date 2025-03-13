import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { convertToTailwindHtml, convertToHtml } from '../utils/content-migration';
import { HtmlContent } from '@/components/ui/html-content';
import { Markdown } from '@/components/ui/markdown';
import { isMarkdown } from '@/lib/markdown-to-html';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

/**
 * A utility component for migrating content from Markdown to HTML with Tailwind
 */
export function ContentMigrationTool() {
  const [content, setContent] = useState('');
  const [convertedContent, setConvertedContent] = useState('');
  const [activeTab, setActiveTab] = useState('markdown');
  const [previewTab, setPreviewTab] = useState('original');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const handleConvert = () => {
    if (!content) return;
    
    setIsConverting(true);
    setConversionError(null);
    
    try {
      // Convert to HTML with Tailwind classes
      const html = convertToTailwindHtml(content);
      setConvertedContent(html);
      setActiveTab('html');
      setPreviewTab('converted');
    } catch (error) {
      console.error('Error converting content:', error);
      setConversionError('Error converting content. Please try again.');
      setConvertedContent('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertPlain = () => {
    if (!content) return;
    
    setIsConverting(true);
    setConversionError(null);
    
    try {
      // Convert to HTML without Tailwind classes
      const html = convertToHtml(content);
      setConvertedContent(html);
      setActiveTab('html');
      setPreviewTab('converted');
    } catch (error) {
      console.error('Error converting content:', error);
      setConversionError('Error converting content. Please try again.');
      setConvertedContent('');
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(convertedContent);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Migration Tool</CardTitle>
        <CardDescription>
          Convert Markdown content to HTML with Tailwind classes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Important Note</AlertTitle>
          <AlertDescription>
            <p className="text-sm">
              After converting your content, you should manually review and test it to ensure proper rendering.
              The preview may not show syntax highlighting for code blocks correctly.
            </p>
            <p className="text-sm mt-2">
              If your content already has HTML with classes, the tool will preserve those classes and add new ones
              only where needed.
            </p>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Input</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="markdown">Markdown</TabsTrigger>
                <TabsTrigger value="html">HTML</TabsTrigger>
              </TabsList>
              <TabsContent value="markdown" className="mt-2">
                <Textarea
                  placeholder="Paste your Markdown content here..."
                  className="min-h-[400px] font-mono text-sm"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="html" className="mt-2">
                <Textarea
                  placeholder="HTML output will appear here..."
                  className="min-h-[400px] font-mono text-sm"
                  value={convertedContent}
                  onChange={(e) => setConvertedContent(e.target.value)}
                />
              </TabsContent>
            </Tabs>
            {conversionError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{conversionError}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button 
                onClick={handleConvert} 
                disabled={isConverting || !content}
              >
                {isConverting ? 'Converting...' : 'Convert to HTML with Tailwind'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleConvertPlain} 
                disabled={isConverting || !content}
              >
                {isConverting ? 'Converting...' : 'Convert to Plain HTML'}
              </Button>
              {convertedContent && (
                <Button variant="secondary" onClick={handleCopyToClipboard}>
                  Copy to Clipboard
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Preview</h3>
            <Tabs value={previewTab} onValueChange={setPreviewTab}>
              <TabsList>
                <TabsTrigger value="original">Original</TabsTrigger>
                <TabsTrigger value="converted">Converted</TabsTrigger>
              </TabsList>
              <TabsContent value="original" className="mt-2 border rounded-md p-4">
                <ScrollArea className="h-[400px]">
                  {content && isMarkdown(content) ? (
                    <div className="prose dark:prose-invert">
                      <Markdown content={content} />
                    </div>
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="converted" className="mt-2 border rounded-md p-4">
                <ScrollArea className="h-[400px]">
                  {convertedContent && (
                    <HtmlContent content={convertedContent} />
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          This tool helps you migrate your content from Markdown to HTML with Tailwind classes.
          The converted HTML can be used directly in your info pages and problems.
        </p>
      </CardFooter>
    </Card>
  );
} 