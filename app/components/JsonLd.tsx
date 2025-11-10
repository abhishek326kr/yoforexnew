/**
 * JSON-LD Component
 * 
 * Renders Schema.org structured data as JSON-LD script tag
 * Follows Google Rich Results best practices 2025
 * 
 * Usage:
 *   <JsonLd schema={generateOrganizationSchema()} />
 *   <JsonLd schema={{ '@graph': [schema1, schema2] }} />
 */

interface JsonLdProps {
  schema: Record<string, any> | Record<string, any>[];
}

export default function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 0),
      }}
    />
  );
}
