"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ForumCategory } from "@shared/schema";

interface SimpleThreadComposeProps {
  categories: ForumCategory[];
}

export default function SimpleThreadCompose({ categories }: SimpleThreadComposeProps) {
  console.log('[SimpleThreadCompose] Rendering with categories:', categories?.length || 0);
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Create New Thread</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>New Discussion Thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Thread Title</Label>
              <Input 
                id="title" 
                placeholder="Enter your thread title..."
                data-testid="input-title"
              />
            </div>
            
            <div>
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories && categories.length > 0 ? (
                    categories.map(category => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No categories available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea 
                id="content" 
                placeholder="Write your thread content..." 
                rows={8}
                data-testid="textarea-content"
              />
            </div>
            
            <Button 
              className="w-full"
              data-testid="button-submit"
            >
              Create Thread
            </Button>
          </CardContent>
        </Card>
        
        <div className="mt-4 text-sm text-muted-foreground">
          Categories loaded: {categories?.length || 0}
        </div>
      </div>
    </div>
  );
}