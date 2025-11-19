"use client";

interface ThreadPreviewProps {
  title: string;
  body: string;
}

export default function ThreadPreview({ title, body }: ThreadPreviewProps) {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" data-testid="preview-title">
            {title || "Untitled Thread"}
          </h1>
          <p className="text-sm text-muted-foreground">Preview of your thread</p>
        </div>

        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          data-testid="preview-body"
          dangerouslySetInnerHTML={{
            __html: body || "<p class='text-muted-foreground italic'>Your content will appear here...</p>",
          }}
        />
      </div>
    </div>
  );
}
