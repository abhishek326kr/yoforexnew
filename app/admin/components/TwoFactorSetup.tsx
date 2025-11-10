'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Copy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

interface TwoFactorSetupProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function TwoFactorSetup({ userId, open, onClose }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate 2FA secret and QR code
  const generateSecretMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/2fa/generate', {});
    },
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setStep('setup');
    },
    onError: () => {
      toast({
        title: 'Failed to generate 2FA secret',
        description: 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Enable 2FA
  const enableTwoFactorMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('POST', '/api/auth/2fa/enable', {
        secret,
        code,
      });
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      toast({
        title: 'Two-factor authentication enabled',
        description: 'Please save your backup codes in a safe place',
      });
    },
    onError: () => {
      toast({
        title: 'Invalid verification code',
        description: 'Please check the code and try again',
        variant: 'destructive',
      });
    },
  });

  // Disable 2FA
  const disableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/2fa/disable', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      onClose();
      toast({
        title: 'Two-factor authentication disabled',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to disable 2FA',
        variant: 'destructive',
      });
    },
  });

  // Check 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['/api/auth/2fa/status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/2fa/status');
      if (!response.ok) throw new Error('Failed to fetch 2FA status');
      return response.json();
    },
    enabled: open,
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    toast({
      title: 'Backup codes copied',
      description: 'Paste them in a secure location',
    });
  };

  const handleStartSetup = () => {
    generateSecretMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (verificationCode.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-digit code',
        variant: 'destructive',
      });
      return;
    }
    enableTwoFactorMutation.mutate(verificationCode);
  };

  const handleComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {twoFactorStatus?.enabled
              ? 'Manage your two-factor authentication settings'
              : 'Enhance your account security with 2FA'}
          </DialogDescription>
        </DialogHeader>

        {twoFactorStatus?.enabled ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is currently enabled for your account.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => disableTwoFactorMutation.mutate()}
                disabled={disableTwoFactorMutation.isPending}
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        ) : (
          <>
            {step === 'setup' && (
              <div className="space-y-4">
                {!qrCodeUrl ? (
                  <div className="text-center py-8">
                    <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Use an authenticator app like Google Authenticator or Authy to scan the QR code.
                    </p>
                    <Button onClick={handleStartSetup} disabled={generateSecretMutation.isPending}>
                      Generate QR Code
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Manual Entry Code</Label>
                      <div className="flex gap-2">
                        <Input value={secret} readOnly className="font-mono text-xs" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyCode(secret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button onClick={() => setStep('verify')} className="w-full">
                      Next: Verify Setup
                    </Button>
                  </>
                )}
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Enter the 6-digit code from your authenticator app to verify the setup.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-2xl font-mono"
                    data-testid="input-2fa-code"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleVerifyCode}
                    disabled={enableTwoFactorMutation.isPending || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            )}

            {step === 'backup' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Two-factor authentication has been enabled successfully!
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>Backup Codes</Label>
                  <p className="text-sm text-muted-foreground">
                    Save these codes in a secure place. Each code can be used once to sign in if you lose access to your authenticator app.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                    {backupCodes.map((code) => (
                      <div
                        key={code}
                        className="font-mono text-sm flex items-center gap-2 cursor-pointer hover:bg-background p-2 rounded"
                        onClick={() => handleCopyCode(code)}
                      >
                        {code}
                        {copiedCode === code && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCopyAllCodes}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Codes
                  </Button>
                </div>
                <Button onClick={handleComplete} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}