"use client";

import { useEffect, useRef, useState } from "react";
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
let Placeholder: any;

if (typeof window !== 'undefined') {
  const tiptapReact = require("@tiptap/react");
  const tiptapStarterKit = require("@tiptap/starter-kit");
  const tiptapUnderline = require("@tiptap/extension-underline");
  const tiptapImage = require("@tiptap/extension-image");
  const tiptapLink = require("@tiptap/extension-link");
  const tiptapPlaceholder = require("@tiptap/extension-placeholder");
  
  useEditor = tiptapReact.useEditor;
  StarterKit = tiptapStarterKit.default;
  Underline = tiptapUnderline.default;
  Image = tiptapImage.default;
  TiptapLink = tiptapLink.default;
  Placeholder = tiptapPlaceholder.default;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string, plainText: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  className?: string;
  error?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Share your thoughts, analysis, or questions with the community...",
  minLength = 20,
  maxLength = 50000,
  className,
  error = false
}: RichTextEditorProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [textLength, setTextLength] = useState(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

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
      Image?.configure({
        inline: true,
        allowBase64: false,
      }),
      TiptapLink?.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      Placeholder?.configure({
        placeholder,
      })
    ].filter(Boolean),
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose dark:prose-invert focus:outline-none min-h-[300px] max-h-[500px] overflow-y-auto px-4 py-3',
          className
        ),
      },
      handleDrop: (view: any, event: any, slice: any, moved: any) => {
        // Handle image drops
        const files = Array.from(event.dataTransfer?.files || []) as File[];
        const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          event.preventDefault();
          imageFiles.forEach((file: File) => handleImageUpload(file));
          return true;
        }
        return false;
      },
      handlePaste: (view: any, event: any, slice: any) => {
        // Handle image pastes
        const files = Array.from(event.clipboardData?.files || []) as File[];
        const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          event.preventDefault();
          imageFiles.forEach((file: File) => handleImageUpload(file));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      // Debounce updates to form
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        const html = editor.getHTML();
        
        // Extract plain text
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        
        // Update parent form
        onChange(html, plainText);
        
        // Update local state
        setTextLength(plainText.length);
        
        // Count images
        const images = editor.getJSON().content?.filter((node: any) => 
          node.type === 'paragraph' && node.content?.some((child: any) => child.type === 'image')
        ) || [];
        const totalImages = images.reduce((count: number, node: any) => {
          return count + (node.content?.filter((child: any) => child.type === 'image').length || 0);
        }, 0);
        setImageCount(totalImages);
      }, 100); // 100ms debounce
    },
    onBlur: () => {
      onBlur?.();
    },
  }, [placeholder]) : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (editor) {
        editor.destroy();
      }
    };
  }, [editor]);

  // Sync content when value changes externally (but not when editor is focused)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
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
    if (imageCount >= 10) {
      toast({
        title: "Image limit reached",
        description: "Maximum 10 inline images allowed per thread",
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
      const formData = new FormData();
      formData.append('files', file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[ImageUpload] Failed to parse response:', responseText);
        throw new Error("Failed to parse server response");
      }

      if (res.ok) {
        const url = data.urls?.[0];
        
        if (!url) {
          throw new Error("Server did not return image URL");
        }
        
        if (editor) {
          editor.chain().focus().setImage({ src: url }).run();
          toast({
            title: "Image inserted",
            description: "Image added successfully",
          });
        }
      } else {
        let errorMessage = "Upload failed";
        
        if (res.status === 401) {
          errorMessage = "Please log in to upload images";
        } else if (res.status === 400) {
          errorMessage = data.error || "Invalid image file";
        } else if (res.status === 413) {
          errorMessage = "Image size too large (max 5MB)";
        } else if (res.status === 500) {
          errorMessage = data.error || "Server error - please try again";
        } else if (data.error) {
          errorMessage = data.error;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageButtonClick = () => {
    if (imageCount >= 10) {
      toast({
        title: "Image limit reached",
        description: "Maximum 10 inline images allowed per thread",
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
    if (textLength < minLength) return 'text-destructive';
    if (textLength > maxLength) return 'text-destructive';
    if (textLength > maxLength * 0.9) return 'text-yellow-600 dark:text-yellow-500';
    return 'text-green-600 dark:text-green-500';
  };

  const isImageLimitReached = imageCount >= 10;

  return (
    <div className={cn(
      "border-2 rounded-lg overflow-hidden transition-colors",
      error ? "border-destructive" : "border-input focus-within:border-primary"
    )} data-testid="rich-text-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* Toolbar */}
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

          {/* Links & Code */}
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
                  ? `${imageCount}/10 images (limit reached)` 
                  : `Insert Image (${imageCount}/10)`}
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Editor Content */}
      <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Character Counter */}
      <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
        <span className={cn("text-sm font-medium", getCharCountColor())} data-testid="character-counter">
          {textLength.toLocaleString()} / {maxLength.toLocaleString()} characters
          {textLength < minLength && (
            <span className="ml-2 text-destructive">• Need {minLength - textLength} more</span>
          )}
        </span>
        {uploadingImage && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Uploading image...
          </span>
        )}
      </div>
    </div>
  );
}
