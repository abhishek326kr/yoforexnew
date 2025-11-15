"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link, 
  Image as ImageIcon,
  Code,
  Quote,
  Heading2,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// Lazy load TipTap components
const EditorContent = dynamic(
  () => import("@tiptap/react").then(mod => mod.EditorContent),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading editor...</span>
        </div>
      </div>
    )
  }
);

// Import TipTap modules only on client-side
let useEditor: any;
let StarterKit: any;
let Underline: any;
let Image: any;
let TiptapLink: any;
let CodeBlock: any;

if (typeof window !== 'undefined') {
  const tiptapReact = require("@tiptap/react");
  const tiptapStarterKit = require("@tiptap/starter-kit");
  const tiptapUnderline = require("@tiptap/extension-underline");
  const tiptapImage = require("@tiptap/extension-image");
  const tiptapLink = require("@tiptap/extension-link");
  
  useEditor = tiptapReact.useEditor;
  StarterKit = tiptapStarterKit.default;
  Underline = tiptapUnderline.default;
  Image = tiptapImage.default;
  TiptapLink = tiptapLink.default;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  className?: string;
  editable?: boolean;
  showCharCount?: boolean;
  allowImages?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  minLength = 0,
  maxLength = 5000,
  className,
  editable = true,
  showCharCount = true,
  allowImages = true
}: RichTextEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [textLength, setTextLength] = useState(0);

  // Initialize editor
  const editor = typeof window !== 'undefined' && useEditor ? useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit?.configure({
        heading: {
          levels: [2, 3, 4]
        }
      }),
      Underline,
      allowImages && Image?.configure({
        inline: true,
        allowBase64: false,
      }),
      TiptapLink?.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      })
    ].filter(Boolean),
    content: value || '',
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl dark:prose-invert focus:outline-none min-h-[200px] max-h-[400px] overflow-y-auto px-4 py-3',
          className
        ),
      },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Calculate text length (excluding HTML tags)
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      setTextLength(textContent.length);
      
      // Count images
      if (allowImages) {
        const images = editor.getJSON().content?.filter((node: any) => 
          node.type === 'paragraph' && node.content?.some((child: any) => child.type === 'image')
        ) || [];
        const totalImages = images.reduce((count: number, node: any) => {
          return count + (node.content?.filter((child: any) => child.type === 'image').length || 0);
        }, 0);
        setImageCount(totalImages);
      }
    },
  }, [editable, allowImages]) : null;

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Sync content with value prop
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || '');
      
      // Update character count
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = value || '';
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      setTextLength(textContent.length);
    }
  }, [editor, value]);

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    if (imageCount >= 5) {
      toast({
        title: "Image limit reached",
        description: "Maximum 5 inline images allowed",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum image size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    
    try {
      // Create a temporary URL for the image
      // In production, upload to server/cloud storage
      const imageUrl = URL.createObjectURL(file);
      
      if (editor) {
        editor.chain().focus().setImage({ src: imageUrl }).run();
        toast({
          title: "Image inserted",
          description: "Image added to description",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageButtonClick = () => {
    if (!allowImages) return;
    
    if (imageCount >= 5) {
      toast({
        title: "Image limit reached",
        description: "Maximum 5 inline images allowed",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    e.target.value = '';
  };

  const addLink = () => {
    if (!editor) return;
    
    const url = prompt('Enter URL:');
    if (url) {
      if (editor.state.selection.empty) {
        const text = prompt('Enter link text:') || url;
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
      } else {
        editor.chain().focus().toggleLink({ href: url }).run();
      }
    }
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Initializing editor...</span>
        </div>
      </div>
    );
  }

  const getCharCountColor = () => {
    if (minLength && textLength < minLength) return 'text-destructive';
    if (textLength > maxLength) return 'text-destructive';
    if (textLength > maxLength * 0.9) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-green-600 dark:text-green-500';
  };

  const isImageLimitReached = imageCount >= 5;

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="rich-text-editor">
      {allowImages && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
      
      {/* Toolbar */}
      {editable && (
        <div className="bg-muted/50 border-b p-2 flex flex-wrap gap-1" data-testid="editor-toolbar">
          <TooltipProvider>
            {/* Text formatting */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('bold') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold (Ctrl+B)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('italic') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic (Ctrl+I)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('underline') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-underline"
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Underline (Ctrl+U)</TooltipContent>
              </Tooltip>
            </div>

            <div className="w-px bg-border" />

            {/* Headings */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-heading"
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-quote"
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quote</TooltipContent>
              </Tooltip>
            </div>

            <div className="w-px bg-border" />

            {/* Lists */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-bullet-list"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-ordered-list"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>
            </div>

            <div className="w-px bg-border" />

            {/* Links & Images */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('link') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={addLink}
                    className="h-8 w-8 p-0"
                    data-testid="button-link"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className="h-8 w-8 p-0"
                    data-testid="button-code"
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>

              {allowImages && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleImageButtonClick}
                      disabled={isImageLimitReached || uploadingImage}
                      className="h-8 w-8 p-0"
                      data-testid="button-insert-image"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isImageLimitReached 
                      ? `${imageCount}/5 images (limit reached)` 
                      : `Insert Image (${imageCount}/5)`}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Editor Content */}
      <div className={cn("min-h-[200px] max-h-[400px] overflow-y-auto", !editable && "bg-muted/10")}>
        <EditorContent editor={editor} />
      </div>

      {/* Character Counter */}
      {showCharCount && (
        <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
          <span className={cn("text-sm", getCharCountColor())} data-testid="character-counter">
            {textLength} / {maxLength} characters
            {minLength > 0 && textLength < minLength && (
              <span className="ml-2">• Need {minLength - textLength} more</span>
            )}
          </span>
          {uploadingImage && (
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading image...
            </span>
          )}
        </div>
      )}
    </div>
  );
}