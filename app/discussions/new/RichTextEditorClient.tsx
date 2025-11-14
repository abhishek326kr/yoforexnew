'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Quote, 
  Code, 
  Undo, 
  Redo,
  ImageIcon,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface RichTextEditorClientProps {
  initialContent?: string;
  onUpdate: (html: string, text: string) => void;
  isDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
}

export function RichTextEditorClient({
  initialContent = '',
  onUpdate,
  isDragging = false,
  onDragStateChange
}: RichTextEditorClientProps) {
  const { toast } = useToast();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Use ref to store the latest onUpdate callback to avoid infinite loops
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Image upload handler
  const handleImageUpload = async (file: File, editorInstance: any) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('files', file); // Changed from 'file' to 'files' to match endpoint

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // API returns array of files, get the first URL
        const imageUrl = data.urls?.[0] || data.files?.[0]?.url || data.url || data.imageUrl;
        
        if (imageUrl && editorInstance) {
          editorInstance.chain()
            .focus()
            .setImage({ 
              src: imageUrl,
              alt: file.name,
              title: file.name,
            })
            .run();
          toast({
            title: "Image uploaded!",
            description: "Image inserted at cursor position",
          });
        } else {
          throw new Error("No image URL returned");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: false,
        gapcursor: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image max-w-full h-auto rounded-lg my-4 mx-auto block cursor-move hover:shadow-lg transition-shadow',
          style: 'max-height: 500px; object-fit: contain;',
          loading: 'lazy',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your amazing content...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));
          
          if (imageFiles.length > 0) {
            event.preventDefault();
            onDragStateChange?.(false);
            
            imageFiles.forEach(async (file) => {
              if (editor) {
                await handleImageUpload(file, editor);
              }
            });
            
            return true;
          }
        }
        return false;
      },
      handleDOMEvents: {
        dragover: (view, event) => {
          event.preventDefault();
          if (!isDragging && event.dataTransfer?.types.includes('Files')) {
            onDragStateChange?.(true);
          }
          return false;
        },
        dragleave: (view, event) => {
          if (isDragging) {
            const rect = view.dom.getBoundingClientRect();
            if (
              event.clientX <= rect.left ||
              event.clientX >= rect.right ||
              event.clientY <= rect.top ||
              event.clientY >= rect.bottom
            ) {
              onDragStateChange?.(false);
            }
          }
          return false;
        },
        drop: () => {
          onDragStateChange?.(false);
          return false;
        },
        paste: (view, event) => {
          const items = event.clipboardData?.items;
          if (items) {
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file && editor) {
                  handleImageUpload(file, editor);
                }
                return true;
              }
            }
          }
          return false;
        },
      },
    },
  });

  // Update parent when editor content changes
  // Use ref to avoid infinite loops caused by onUpdate changing on every render
  useEffect(() => {
    if (editor) {
      const updateContent = () => {
        // Use optional chaining in case callback is undefined
        onUpdateRef.current?.(editor.getHTML(), editor.getText());
      };
      editor.on('update', updateContent);
      return () => {
        editor.off('update', updateContent);
      };
    }
  }, [editor]); // Only depend on editor, not onUpdate

  // Trigger image upload from file input
  const triggerImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && editor) {
        handleImageUpload(file, editor);
      }
    };
    input.click();
  };

  if (!mounted || !editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border rounded-lg bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border rounded-lg bg-muted/30">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          data-active={editor.isActive('heading', { level: 1 })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-h1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          data-active={editor.isActive('heading', { level: 2 })}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-h2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          data-active={editor.isActive('bulletList')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-bullet-list"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          data-active={editor.isActive('orderedList')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-ordered-list"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          data-active={editor.isActive('blockquote')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-quote"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          data-active={editor.isActive('codeBlock')}
          className="h-8 w-8 p-0 data-[active=true]:bg-accent"
          data-testid="button-format-code"
        >
          <Code className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={triggerImageUpload}
          disabled={isUploadingImage}
          className="h-8 w-8 p-0"
          data-testid="button-upload-image"
        >
          {isUploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
          data-testid="button-redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <div 
        className={`relative border rounded-lg transition-all ${
          isDragging 
            ? 'border-primary border-2 bg-primary/5' 
            : 'border-border bg-background'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10 pointer-events-none">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-primary">Drop image here</p>
            </div>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
