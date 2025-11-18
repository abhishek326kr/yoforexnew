"use client";

import { useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import type { Editor as TinyMCEEditor } from "tinymce";
import { useTheme } from "next-themes";

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  minHeight = 400,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="tinymce-wrapper" data-testid="editor-rich-text">
      <Editor
        onInit={(evt, editor) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(content) => onChange(content)}
        disabled={disabled}
        init={{
          height: minHeight,
          menubar: false,
          skin: isDark ? "oxide-dark" : "oxide",
          content_css: isDark ? "dark" : "default",
          placeholder: placeholder,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "code",
            "help",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks | " +
            "bold italic forecolor | alignleft aligncenter " +
            "alignright alignjustify | bullist numlist outdent indent | " +
            "removeformat | code | help",
          content_style:
            "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-size: 14px; line-height: 1.6; }",
          branding: false,
          promotion: false,
          statusbar: true,
          resize: true,
          elementpath: false,
          // Allow all HTML elements for flexibility
          extended_valid_elements: "*[*]",
          valid_children: "+body[style]",
          // Paste settings
          paste_as_text: false,
          paste_merge_formats: true,
          smart_paste: true,
          // Link settings
          link_default_target: "_blank",
          link_assume_external_targets: true,
          link_title: false,
          // Image settings
          image_caption: true,
          image_advtab: true,
          automatic_uploads: false,
          file_picker_types: "image",
        }}
      />
    </div>
  );
}
