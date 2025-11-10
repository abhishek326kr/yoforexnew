"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";

// UI Components
import Header from "@/components/Header";
import EnhancedFooter from "@/components/EnhancedFooter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle, 
  FileCode, 
  Image as ImageIcon, 
  DollarSign, 
  Eye, 
  Sparkles,
  Save,
  Send,
  FileText,
  Settings,
  Coins,
  Info,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Trophy,
  TrendingUp,
  Shield,
  Clock,
  Target,
  Users
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthPrompt } from "@/hooks/useAuthPrompt";
import { cn } from "@/lib/utils";

// Lazy load rich editor to prevent SSR issues
const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

// Constants
const EA_CATEGORIES = [
  { value: "scalping", label: "⚡ Scalping", description: "Quick trades, small profits" },
  { value: "day_trading", label: "☀️ Day Trading", description: "Intraday positions" },
  { value: "swing", label: "📈 Swing Trading", description: "Multi-day positions" },
  { value: "grid", label: "🔲 Grid Trading", description: "Grid-based strategies" },
  { value: "martingale", label: "🎲 Martingale", description: "Progressive lot sizing" },
  { value: "hedging", label: "🛡️ Hedging", description: "Risk mitigation" },
  { value: "news", label: "📰 News Trading", description: "Event-based trading" },
  { value: "trend", label: "📊 Trend Following", description: "Follows market trends" },
  { value: "arbitrage", label: "💹 Arbitrage", description: "Price discrepancies" },
  { value: "neural", label: "🧠 Neural Networks", description: "AI-powered trading" },
  { value: "multi_currency", label: "🌍 Multi-Currency", description: "Multiple pairs" },
  { value: "other", label: "📦 Other", description: "Other strategies" }
];

const TRADING_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", 
  "USD/CAD", "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY",
  "XAU/USD", "XAG/USD", "US30", "NAS100", "SPX500"
];

const TIMEFRAMES = [
  { value: "M1", label: "M1 - 1 Minute" },
  { value: "M5", label: "M5 - 5 Minutes" },
  { value: "M15", label: "M15 - 15 Minutes" },
  { value: "M30", label: "M30 - 30 Minutes" },
  { value: "H1", label: "H1 - 1 Hour" },
  { value: "H4", label: "H4 - 4 Hours" },
  { value: "D1", label: "D1 - Daily" },
  { value: "W1", label: "W1 - Weekly" },
  { value: "MN", label: "MN - Monthly" }
];

const RISK_LEVELS = [
  { value: "low", label: "Low Risk", color: "text-green-600" },
  { value: "medium", label: "Medium Risk", color: "text-yellow-600" },
  { value: "high", label: "High Risk", color: "text-orange-600" },
  { value: "very_high", label: "Very High Risk", color: "text-red-600" }
];

// Form Steps Configuration
const FORM_STEPS = [
  { id: 1, title: "Basic Information", icon: FileText, description: "EA details and description" },
  { id: 2, title: "Files & Media", icon: Upload, description: "Upload EA files and screenshots" },
  { id: 3, title: "Trading Settings", icon: Settings, description: "Configure trading parameters" },
  { id: 4, title: "Pricing & Terms", icon: DollarSign, description: "Set price and terms" },
  { id: 5, title: "Preview & Publish", icon: Eye, description: "Review and publish" }
];

// Validation Schema
const publishEASchema = z.object({
  // Step 1: Basic Information
  title: z.string()
    .min(10, "Title must be at least 10 characters")
    .max(100, "Title must be less than 100 characters")
    .regex(/^[^<>]*$/, "Title cannot contain HTML"),
  description: z.string()
    .min(100, "Description must be at least 100 characters")
    .max(5000, "Description must be less than 5000 characters"),
  category: z.string().min(1, "Please select a category"),
  tags: z.array(z.string()).min(1, "Add at least one tag").max(5, "Maximum 5 tags allowed"),
  platform: z.enum(["MT4", "MT5", "Both"]),
  version: z.string().min(1, "Version is required"),
  
  // Step 2: Files & Media
  eaFile: z.object({
    name: z.string(),
    size: z.number(),
    url: z.string(),
    type: z.string()
  }).nullable(),
  screenshots: z.array(z.object({
    name: z.string(),
    size: z.number(),
    url: z.string(),
    isPrimary: z.boolean()
  })).min(1, "At least one screenshot is required").max(5, "Maximum 5 screenshots"),
  documentation: z.object({
    name: z.string(),
    size: z.number(),
    url: z.string(),
    type: z.string()
  }).optional().nullable(),
  
  // Step 3: Trading Settings
  minBalance: z.number().min(100, "Minimum balance must be at least $100"),
  recommendedPairs: z.array(z.string()).min(1, "Select at least one trading pair"),
  timeframes: z.array(z.string()).min(1, "Select at least one timeframe"),
  riskLevel: z.enum(["low", "medium", "high", "very_high"]),
  maxSpread: z.number().min(0, "Max spread must be non-negative"),
  stopLoss: z.boolean(),
  takeProfit: z.boolean(),
  martingale: z.boolean(),
  hedging: z.boolean(),
  
  // Step 4: Pricing & Terms
  price: z.number().min(0, "Price must be non-negative").max(10000, "Price too high"),
  isFree: z.boolean(),
  installationInstructions: z.string().min(50, "Installation instructions must be at least 50 characters"),
  riskWarning: z.string().min(30, "Risk warning is required"),
  supportEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  
  // Terms acceptance
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions"
  }),
  qualityGuarantee: z.boolean().refine(val => val === true, {
    message: "You must guarantee the quality of your EA"
  })
});

type PublishEAFormData = z.infer<typeof publishEASchema>;

interface FileWithPreview extends File {
  preview?: string;
}

export default function PublishEAMultiStepClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { requireAuth, AuthPrompt } = useAuthPrompt("publish your EA");
  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [tagInput, setTagInput] = useState("");

  // Form management
  const form = useForm<PublishEAFormData>({
    resolver: zodResolver(publishEASchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: [],
      platform: "MT4",
      version: "1.0.0",
      eaFile: null,
      screenshots: [],
      documentation: null,
      minBalance: 1000,
      recommendedPairs: [],
      timeframes: [],
      riskLevel: "medium",
      maxSpread: 3,
      stopLoss: true,
      takeProfit: true,
      martingale: false,
      hedging: false,
      price: 100,
      isFree: false,
      installationInstructions: "",
      riskWarning: "Trading involves substantial risk of loss. Past performance is not indicative of future results.",
      supportEmail: user?.email || "",
      termsAccepted: false,
      qualityGuarantee: false
    },
    mode: "onChange"
  });

  // Watch form values
  const watchedValues = form.watch();
  const isFree = form.watch("isFree");
  const currentTags = form.watch("tags");

  // Effect to handle free/paid logic
  useEffect(() => {
    if (isFree) {
      form.setValue("price", 0);
    }
  }, [isFree, form]);

  // File upload handlers
  const handleEAFileUpload = useCallback(async (acceptedFiles: FileWithPreview[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const validTypes = [".ex4", ".ex5", ".mq4", ".mq5", ".zip"];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
    
    if (!validTypes.includes(fileExt)) {
      toast({
        title: "Invalid file type",
        description: "Please upload EA files (.ex4, .ex5, .mq4, .mq5) or .zip",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 50MB - matching server limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive"
      });
      return;
    }

    // Start upload progress
    setUploadProgress(prev => ({ ...prev, eaFile: 0 }));
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("eaFile", file);

      // Track upload progress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, eaFile: progress }));
        }
      });

      // Upload to server
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error("Invalid response from server"));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || "Upload failed"));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        };
        
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        
        xhr.open("POST", "/api/marketplace/upload-ea");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      const response = await uploadPromise;

      // Update form with uploaded file info
      form.setValue("eaFile", {
        name: file.name,
        size: file.size,
        url: response.fileUrl,
        type: fileExt
      });
      
      toast({
        title: "File uploaded",
        description: `${file.name} uploaded successfully`
      });
      
    } catch (error) {
      console.error("EA upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload EA file",
        variant: "destructive"
      });
    } finally {
      // Clear upload progress
      setUploadProgress(prev => {
        const { eaFile, ...rest } = prev;
        return rest;
      });
    }
  }, [form, toast]);

  // Screenshot upload handler
  const handleScreenshotUpload = useCallback(async (acceptedFiles: FileWithPreview[]) => {
    const currentScreenshots = form.getValues("screenshots") || [];
    
    if (currentScreenshots.length + acceptedFiles.length > 5) {
      toast({
        title: "Too many screenshots",
        description: "Maximum 5 screenshots allowed",
        variant: "destructive"
      });
      return;
    }

    const uploadedScreenshots = [];
    
    for (const file of acceptedFiles) {
      try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append("screenshot", file);

        // Upload to server
        const response = await fetch("/api/marketplace/upload-screenshot", {
          method: "POST",
          credentials: "include",
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const result = await response.json();
        
        uploadedScreenshots.push({
          name: file.name,
          size: file.size,
          url: result.imageUrl,
          isPrimary: currentScreenshots.length === 0 && uploadedScreenshots.length === 0
        });
        
      } catch (error) {
        console.error("Screenshot upload error:", error);
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }

    if (uploadedScreenshots.length > 0) {
      form.setValue("screenshots", [...currentScreenshots, ...uploadedScreenshots]);
      
      toast({
        title: "Screenshots uploaded",
        description: `${uploadedScreenshots.length} screenshot(s) added successfully`
      });
    }
  }, [form, toast]);

  // Documentation upload handler
  const handleDocumentationUpload = useCallback(async (acceptedFiles: FileWithPreview[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF document",
        variant: "destructive"
      });
      return;
    }

    form.setValue("documentation", {
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      type: "pdf"
    });

    toast({
      title: "Documentation uploaded",
      description: `${file.name} uploaded successfully`
    });
  }, [form, toast]);

  // Dropzone configurations
  const eaFileDropzone = useDropzone({
    onDrop: handleEAFileUpload,
    accept: {
      'application/octet-stream': ['.ex4', '.ex5'],
      'text/plain': ['.mq4', '.mq5'],
      'application/zip': ['.zip']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024
  });

  const screenshotDropzone = useDropzone({
    onDrop: handleScreenshotUpload,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024
  });

  const documentationDropzone = useDropzone({
    onDrop: handleDocumentationUpload,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024
  });

  // Tag management
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;
    
    if (currentTags.length >= 5) {
      toast({
        title: "Tag limit reached",
        description: "Maximum 5 tags allowed",
        variant: "destructive"
      });
      return;
    }

    if (currentTags.includes(trimmedTag)) {
      toast({
        title: "Duplicate tag",
        description: "This tag already exists",
        variant: "destructive"
      });
      return;
    }

    form.setValue("tags", [...currentTags, trimmedTag]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  // Step validation
  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof PublishEAFormData)[] = [];

    switch (step) {
      case 1:
        fieldsToValidate = ["title", "description", "category", "tags", "platform", "version"];
        break;
      case 2:
        fieldsToValidate = ["eaFile", "screenshots"];
        break;
      case 3:
        fieldsToValidate = ["minBalance", "recommendedPairs", "timeframes", "riskLevel", "maxSpread"];
        break;
      case 4:
        fieldsToValidate = ["price", "installationInstructions", "riskWarning"];
        break;
      case 5:
        fieldsToValidate = ["termsAccepted", "qualityGuarantee"];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    
    if (!result) {
      const errors = form.formState.errors;
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive"
        });
      }
    }

    return result;
  };

  // Navigation
  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      if (currentStep === 5) {
        setShowConfirmDialog(true);
      } else {
        setCurrentStep(prev => Math.min(prev + 1, 5));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = async (step: number) => {
    // Validate all steps before the target step
    for (let i = 1; i < step; i++) {
      const isValid = await validateStep(i);
      if (!isValid) {
        toast({
          title: "Complete previous steps",
          description: `Please complete step ${i} before proceeding`,
          variant: "destructive"
        });
        return;
      }
    }
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Publishing
  const publishMutation = useMutation({
    mutationFn: async (data: PublishEAFormData) => {
      // Generate slug from title
      const slug = data.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + '-' + Date.now();

      // Format data for API
      const publishData = {
        title: data.title,
        description: data.description,
        slug,
        priceCoins: data.isFree ? 0 : data.price,
        eaFileUrl: data.eaFile?.url || '',
        imageUrls: data.screenshots?.map(s => s.url) || [],
        tags: data.tags || [],
        platform: data.platform,
        version: data.version,
        tradingPairs: data.recommendedPairs || [],
        timeframes: data.timeframes || [],
        primaryKeyword: data.tags?.[0] || data.title,
        seoExcerpt: data.description.substring(0, 160),
        hashtags: data.tags?.map(tag => '#' + tag) || []
      };

      const response = await fetch("/api/marketplace/publish-ea", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(publishData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to publish EA");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "🎉 EA Published Successfully!",
        description: "Your EA has been published. You earned 30 coins!",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      
      // Redirect to the published EA page
      setTimeout(() => {
        router.push(`/ea/${data.slug || data.id}`);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish EA. Please try again.",
        variant: "destructive"
      });
      setIsPublishing(false);
    }
  });

  const handlePublish = async () => {
    setShowConfirmDialog(false);
    setIsPublishing(true);

    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before publishing",
        variant: "destructive"
      });
      setIsPublishing(false);
      return;
    }

    const formData = form.getValues();
    publishMutation.mutate(formData);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo form={form} handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag} tagInput={tagInput} setTagInput={setTagInput} />;
      case 2:
        return <Step2FilesMedia form={form} eaFileDropzone={eaFileDropzone} screenshotDropzone={screenshotDropzone} documentationDropzone={documentationDropzone} uploadProgress={uploadProgress} />;
      case 3:
        return <Step3TradingSettings form={form} />;
      case 4:
        return <Step4PricingTerms form={form} />;
      case 5:
        return <Step5Preview form={form} formData={watchedValues} />;
      default:
        return null;
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          <div className="container max-w-5xl mx-auto px-4 py-8">
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <EnhancedFooter />
      </>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          <div className="container max-w-5xl mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto mt-12">
              <CardHeader className="text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="text-2xl">Login Required</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                  You need to be logged in to publish your Expert Advisor. Please login to continue.
                </p>
                <Button 
                  onClick={() => requireAuth(() => {})} 
                  className="w-full"
                  data-testid="button-publish-login"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Login to Publish
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <EnhancedFooter />
        <AuthPrompt />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container max-w-5xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" data-testid="heading-publish-ea">
              Publish Expert Advisor
            </h1>
            <p className="text-muted-foreground">
              Share your trading system with thousands of traders and earn coins
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {FORM_STEPS.map((step, index) => (
                <div 
                  key={step.id}
                  className={cn(
                    "flex items-center cursor-pointer",
                    index < FORM_STEPS.length - 1 && "flex-1"
                  )}
                  onClick={() => goToStep(step.id)}
                  data-testid={`step-indicator-${step.id}`}
                >
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                      currentStep === step.id 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : currentStep > step.id
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-muted text-muted-foreground border-muted-foreground/30"
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div 
                      className={cn(
                        "flex-1 h-0.5 mx-2",
                        currentStep > step.id ? "bg-green-600" : "bg-muted-foreground/30"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm">
              {FORM_STEPS.map(step => (
                <div 
                  key={step.id} 
                  className={cn(
                    "text-center cursor-pointer",
                    currentStep === step.id ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                  onClick={() => goToStep(step.id)}
                  data-testid={`step-label-${step.id}`}
                >
                  {step.title}
                </div>
              ))}
            </div>
            <Progress 
              value={(currentStep / FORM_STEPS.length) * 100} 
              className="mt-4" 
              data-testid="progress-bar"
            />
          </div>

          {/* Form Content */}
          <Form {...form}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = FORM_STEPS[currentStep - 1].icon;
                    return Icon ? <Icon className="h-5 w-5" /> : null;
                  })()}
                  {FORM_STEPS[currentStep - 1].title}
                </CardTitle>
                <CardDescription>
                  {FORM_STEPS[currentStep - 1].description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderStepContent()}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || isPublishing}
                  data-testid="button-previous"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/marketplace")}
                    disabled={isPublishing}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleNext}
                    disabled={isPublishing}
                    data-testid={currentStep === 5 ? "button-publish" : "button-next"}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publishing...
                      </>
                    ) : currentStep === 5 ? (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publish EA
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </Form>

          {/* Publish Confirmation Dialog */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Publication</DialogTitle>
                <DialogDescription>
                  Are you sure you want to publish this EA? Please review:
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 my-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">All required information provided</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">EA file and screenshots uploaded</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Terms and conditions accepted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">You'll earn 30 coins upon publication!</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                  Review Again
                </Button>
                <Button onClick={handlePublish}>
                  Confirm & Publish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <EnhancedFooter />
    </>
  );
}

// Step 1: Basic Information Component
function Step1BasicInfo({ form, handleAddTag, handleRemoveTag, tagInput, setTagInput }: any) {
  return (
    <div className="space-y-6" data-testid="step-1-content">
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>EA Title <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="e.g., Advanced Scalping EA for EUR/USD"
                data-testid="input-ea-title"
              />
            </FormControl>
            <FormDescription>
              Choose a descriptive title (10-100 characters)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="Describe your EA's features, strategy, and benefits..."
                rows={8}
                data-testid="textarea-description"
              />
            </FormControl>
            <FormDescription>
              Detailed description (100-5000 characters)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category */}
      <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category <span className="text-red-500">*</span></FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {EA_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} data-testid={`option-category-${cat.value}`}>
                    <div className="flex flex-col">
                      <span>{cat.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tags */}
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tags/Keywords <span className="text-red-500">*</span></FormLabel>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                data-testid="input-tag"
              />
              <Button 
                type="button"
                onClick={handleAddTag}
                data-testid="button-add-tag"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {field.value.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="px-3 py-1" data-testid={`tag-${index}`}>
                  {tag}
                  <X 
                    className="h-3 w-3 ml-2 cursor-pointer" 
                    onClick={() => handleRemoveTag(tag)}
                    data-testid={`remove-tag-${index}`}
                  />
                </Badge>
              ))}
            </div>
            <FormDescription>
              Add 1-5 keywords to help buyers find your EA
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Platform */}
      <FormField
        control={form.control}
        name="platform"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Platform <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex gap-4"
                data-testid="radio-platform"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MT4" id="mt4" />
                  <Label htmlFor="mt4">MetaTrader 4</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MT5" id="mt5" />
                  <Label htmlFor="mt5">MetaTrader 5</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Both" id="both" />
                  <Label htmlFor="both">Both MT4 & MT5</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Version */}
      <FormField
        control={form.control}
        name="version"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Version <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="e.g., 1.0.0"
                data-testid="input-version"
              />
            </FormControl>
            <FormDescription>
              EA version number
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Step 2: Files & Media Component
function Step2FilesMedia({ form, eaFileDropzone, screenshotDropzone, documentationDropzone, uploadProgress }: any) {
  const eaFile = form.watch("eaFile");
  const screenshots = form.watch("screenshots");
  const documentation = form.watch("documentation");

  return (
    <div className="space-y-6" data-testid="step-2-content">
      {/* EA File Upload */}
      <FormField
        control={form.control}
        name="eaFile"
        render={() => (
          <FormItem>
            <FormLabel>EA File <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <div
                {...eaFileDropzone.getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  eaFileDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  eaFile && "border-green-600 bg-green-50 dark:bg-green-950/20"
                )}
                data-testid="dropzone-ea-file"
              >
                <input {...eaFileDropzone.getInputProps()} />
                {uploadProgress.eaFile !== undefined ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm">Uploading... {uploadProgress.eaFile}%</p>
                    <Progress value={uploadProgress.eaFile} className="max-w-xs mx-auto" />
                  </div>
                ) : eaFile ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                    <p className="font-medium">{eaFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(eaFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        form.setValue("eaFile", null);
                      }}
                      data-testid="button-remove-ea-file"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p>Drag & drop your EA file here, or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supported: .ex4, .ex5, .mq4, .mq5, .zip (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Screenshots Upload */}
      <FormField
        control={form.control}
        name="screenshots"
        render={() => (
          <FormItem>
            <FormLabel>Screenshots <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <div>
                <div
                  {...screenshotDropzone.getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors mb-4",
                    screenshotDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  )}
                  data-testid="dropzone-screenshots"
                >
                  <input {...screenshotDropzone.getInputProps()} />
                  <div className="space-y-2">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p>Drag & drop screenshots here, or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Upload 1-5 screenshots (PNG, JPG, max 5MB each)
                    </p>
                  </div>
                </div>
                
                {screenshots.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {screenshots.map((screenshot: any, index: number) => (
                      <div key={index} className="relative group" data-testid={`screenshot-preview-${index}`}>
                        <img
                          src={screenshot.url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        {screenshot.isPrimary && (
                          <Badge className="absolute top-1 left-1 text-xs">Primary</Badge>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            const newScreenshots = screenshots.filter((_: any, i: number) => i !== index);
                            form.setValue("screenshots", newScreenshots);
                          }}
                          data-testid={`button-remove-screenshot-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormDescription>
              The first screenshot will be used as the primary image
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Documentation Upload */}
      <FormField
        control={form.control}
        name="documentation"
        render={() => (
          <FormItem>
            <FormLabel>Documentation (Optional)</FormLabel>
            <FormControl>
              <div
                {...documentationDropzone.getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  documentationDropzone.isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  documentation && "border-green-600 bg-green-50 dark:bg-green-950/20"
                )}
                data-testid="dropzone-documentation"
              >
                <input {...documentationDropzone.getInputProps()} />
                {documentation ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-green-600" />
                    <p className="font-medium">{documentation.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(documentation.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        form.setValue("documentation", null);
                      }}
                      data-testid="button-remove-documentation"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p>Upload user manual or documentation (PDF)</p>
                    <p className="text-sm text-muted-foreground">
                      Optional but recommended (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Step 3: Trading Settings Component
function Step3TradingSettings({ form }: any) {
  return (
    <div className="space-y-6" data-testid="step-3-content">
      {/* Minimum Balance */}
      <FormField
        control={form.control}
        name="minBalance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Account Balance ($) <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                type="number"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value))}
                placeholder="e.g., 1000"
                data-testid="input-min-balance"
              />
            </FormControl>
            <FormDescription>
              Recommended minimum balance to run this EA
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Recommended Pairs */}
      <FormField
        control={form.control}
        name="recommendedPairs"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recommended Trading Pairs <span className="text-red-500">*</span></FormLabel>
            <div className="grid grid-cols-3 gap-4">
              {TRADING_PAIRS.map(pair => (
                <div key={pair} className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value?.includes(pair)}
                    onCheckedChange={(checked) => {
                      const currentPairs = field.value || [];
                      if (checked) {
                        field.onChange([...currentPairs, pair]);
                      } else {
                        field.onChange(currentPairs.filter((p: string) => p !== pair));
                      }
                    }}
                    data-testid={`checkbox-pair-${pair.replace('/', '-')}`}
                  />
                  <Label className="text-sm">{pair}</Label>
                </div>
              ))}
            </div>
            <FormDescription>
              Select all compatible trading pairs
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Timeframes */}
      <FormField
        control={form.control}
        name="timeframes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Compatible Timeframes <span className="text-red-500">*</span></FormLabel>
            <div className="grid grid-cols-3 gap-4">
              {TIMEFRAMES.map(tf => (
                <div key={tf.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value?.includes(tf.value)}
                    onCheckedChange={(checked) => {
                      const currentTimeframes = field.value || [];
                      if (checked) {
                        field.onChange([...currentTimeframes, tf.value]);
                      } else {
                        field.onChange(currentTimeframes.filter((t: string) => t !== tf.value));
                      }
                    }}
                    data-testid={`checkbox-timeframe-${tf.value}`}
                  />
                  <Label className="text-sm">{tf.label}</Label>
                </div>
              ))}
            </div>
            <FormDescription>
              Select all compatible timeframes
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Risk Level */}
      <FormField
        control={form.control}
        name="riskLevel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risk Level <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex gap-4"
                data-testid="radio-risk-level"
              >
                {RISK_LEVELS.map(risk => (
                  <div key={risk.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={risk.value} id={risk.value} />
                    <Label htmlFor={risk.value} className={risk.color}>
                      {risk.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Max Spread */}
      <FormField
        control={form.control}
        name="maxSpread"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum Spread (pips) <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input 
                type="number"
                {...field}
                onChange={e => field.onChange(parseFloat(e.target.value))}
                placeholder="e.g., 3"
                data-testid="input-max-spread"
              />
            </FormControl>
            <FormDescription>
              Maximum spread the EA can handle
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Trading Features */}
      <div className="space-y-4">
        <Label>Trading Features</Label>
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="stopLoss"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-stop-loss"
                />
                <Label>Uses Stop Loss</Label>
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="takeProfit"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-take-profit"
                />
                <Label>Uses Take Profit</Label>
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="martingale"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-martingale"
                />
                <Label>Uses Martingale Strategy</Label>
              </div>
            )}
          />
          <FormField
            control={form.control}
            name="hedging"
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-hedging"
                />
                <Label>Uses Hedging</Label>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}

// Step 4: Pricing & Terms Component
function Step4PricingTerms({ form }: any) {
  const isFree = form.watch("isFree");

  return (
    <div className="space-y-6" data-testid="step-4-content">
      {/* Pricing */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="isFree"
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid="checkbox-is-free"
              />
              <Label>Offer this EA for free</Label>
            </div>
          )}
        />

        {!isFree && (
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (Coins) <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                      placeholder="100"
                      className="pl-10"
                      data-testid="input-price"
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Set your price in coins (1 coin ≈ $0.01)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Installation Instructions */}
      <FormField
        control={form.control}
        name="installationInstructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Installation Instructions <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea 
                {...field}
                rows={6}
                placeholder="Step-by-step instructions for installing and configuring your EA..."
                data-testid="textarea-installation"
              />
            </FormControl>
            <FormDescription>
              Provide clear installation steps (min 50 characters)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Risk Warning */}
      <FormField
        control={form.control}
        name="riskWarning"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Risk Warning <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Textarea 
                {...field}
                rows={3}
                data-testid="textarea-risk-warning"
              />
            </FormControl>
            <FormDescription>
              Important risk disclaimer for users
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Support Email */}
      <FormField
        control={form.control}
        name="supportEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Support Email (Optional)</FormLabel>
            <FormControl>
              <Input 
                type="email"
                {...field}
                placeholder="support@example.com"
                data-testid="input-support-email"
              />
            </FormControl>
            <FormDescription>
              Email for customer support inquiries
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* Terms and Conditions */}
      <div className="space-y-4">
        <h3 className="font-medium">Terms & Conditions</h3>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please read and accept the following terms before publishing
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <div className="flex items-start space-x-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
                data-testid="checkbox-terms"
              />
              <div className="text-sm">
                <Label>I accept the YoForex marketplace terms and conditions</Label>
                <p className="text-muted-foreground mt-1">
                  By publishing, you agree to our marketplace policies, revenue sharing model (70% to seller, 30% platform fee), and content guidelines.
                </p>
              </div>
            </div>
          )}
        />

        <FormField
          control={form.control}
          name="qualityGuarantee"
          render={({ field }) => (
            <div className="flex items-start space-x-2">
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-0.5"
                data-testid="checkbox-quality"
              />
              <div className="text-sm">
                <Label>I guarantee the quality and functionality of this EA</Label>
                <p className="text-muted-foreground mt-1">
                  I confirm that this EA has been thoroughly tested and functions as described. I understand that poor quality products may be removed.
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// Step 5: Preview Component
function Step5Preview({ form, formData }: any) {
  return (
    <div className="space-y-6" data-testid="step-5-content">
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Review your EA listing before publishing. You can go back to any step to make changes.
        </AlertDescription>
      </Alert>

      {/* Title and Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div data-testid="preview-title">
            <span className="text-sm text-muted-foreground">Title:</span>
            <p className="font-medium">{formData.title || "Not provided"}</p>
          </div>
          <div data-testid="preview-category">
            <span className="text-sm text-muted-foreground">Category:</span>
            <p className="font-medium">
              {EA_CATEGORIES.find(cat => cat.value === formData.category)?.label || formData.category}
            </p>
          </div>
          <div data-testid="preview-platform">
            <span className="text-sm text-muted-foreground">Platform:</span>
            <p className="font-medium">{formData.platform}</p>
          </div>
          <div data-testid="preview-version">
            <span className="text-sm text-muted-foreground">Version:</span>
            <p className="font-medium">{formData.version}</p>
          </div>
          <div data-testid="preview-tags">
            <span className="text-sm text-muted-foreground">Tags:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.tags?.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Files & Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div data-testid="preview-ea-file">
            <span className="text-sm text-muted-foreground">EA File:</span>
            <p className="font-medium">
              {formData.eaFile ? (
                <span className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  {formData.eaFile.name}
                </span>
              ) : (
                <span className="text-red-500">Not uploaded</span>
              )}
            </p>
          </div>
          <div data-testid="preview-screenshots">
            <span className="text-sm text-muted-foreground">Screenshots:</span>
            <p className="font-medium">
              {formData.screenshots?.length || 0} screenshot(s) uploaded
            </p>
          </div>
          <div data-testid="preview-documentation">
            <span className="text-sm text-muted-foreground">Documentation:</span>
            <p className="font-medium">
              {formData.documentation ? formData.documentation.name : "Not provided"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trading Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trading Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div data-testid="preview-min-balance">
              <span className="text-sm text-muted-foreground">Min Balance:</span>
              <p className="font-medium">${formData.minBalance}</p>
            </div>
            <div data-testid="preview-risk-level">
              <span className="text-sm text-muted-foreground">Risk Level:</span>
              <p className={cn("font-medium", RISK_LEVELS.find(r => r.value === formData.riskLevel)?.color)}>
                {RISK_LEVELS.find(r => r.value === formData.riskLevel)?.label}
              </p>
            </div>
            <div data-testid="preview-max-spread">
              <span className="text-sm text-muted-foreground">Max Spread:</span>
              <p className="font-medium">{formData.maxSpread} pips</p>
            </div>
            <div data-testid="preview-features">
              <span className="text-sm text-muted-foreground">Features:</span>
              <div className="flex flex-wrap gap-1">
                {formData.stopLoss && <Badge variant="outline" className="text-xs">SL</Badge>}
                {formData.takeProfit && <Badge variant="outline" className="text-xs">TP</Badge>}
                {formData.martingale && <Badge variant="outline" className="text-xs">Martingale</Badge>}
                {formData.hedging && <Badge variant="outline" className="text-xs">Hedging</Badge>}
              </div>
            </div>
          </div>
          <div data-testid="preview-pairs">
            <span className="text-sm text-muted-foreground">Trading Pairs:</span>
            <p className="font-medium text-sm">
              {formData.recommendedPairs?.join(", ") || "None selected"}
            </p>
          </div>
          <div data-testid="preview-timeframes">
            <span className="text-sm text-muted-foreground">Timeframes:</span>
            <p className="font-medium text-sm">
              {formData.timeframes?.join(", ") || "None selected"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between" data-testid="preview-price">
            <span className="text-sm text-muted-foreground">Price:</span>
            <div className="flex items-center gap-2">
              {formData.isFree ? (
                <Badge variant="secondary" className="text-lg px-4 py-2">FREE</Badge>
              ) : (
                <Badge className="text-lg px-4 py-2 bg-amber-500 hover:bg-amber-600">
                  <Coins className="h-4 w-4 mr-2" />
                  {formData.price} Coins
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Reward */}
      <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <Trophy className="h-4 w-4" />
        <AlertDescription className="font-medium">
          You'll earn 30 coins immediately upon publishing this EA!
        </AlertDescription>
      </Alert>

      {/* Final Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Final Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {formData.title && formData.title.length >= 10 ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Title provided</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-red-500" />
                <span>Title required</span>
              </div>
            )}
            
            {formData.description && formData.description.length >= 100 ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Description provided</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-red-500" />
                <span>Description required</span>
              </div>
            )}
            
            {formData.eaFile ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>EA file uploaded</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-red-500" />
                <span>EA file required</span>
              </div>
            )}
            
            {formData.screenshots && formData.screenshots.length > 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Screenshots uploaded</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-red-500" />
                <span>At least one screenshot required</span>
              </div>
            )}
            
            {formData.termsAccepted && formData.qualityGuarantee ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Terms accepted</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-4 w-4 text-red-500" />
                <span>Terms must be accepted</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}