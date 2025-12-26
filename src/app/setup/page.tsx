'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, Loader2, Shield, Database, 
  CreditCard, Globe, Key, User, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'current' | 'complete' | 'error';
}

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  
  // Form data
  const [adminData, setAdminData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [siteData, setSiteData] = useState({
    siteName: 'Vonix Network',
    siteDescription: 'The Ultimate Minecraft Community',
  });

  const [stripeData, setStripeData] = useState({
    enabled: false,
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: 'Get started with Vonix Network',
      icon: Globe,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'complete' : 'pending',
    },
    {
      id: 'admin',
      title: 'Admin Account',
      description: 'Create your administrator account',
      icon: User,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'pending',
    },
    {
      id: 'site',
      title: 'Site Settings',
      description: 'Configure your site details',
      icon: Database,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'complete' : 'pending',
    },
    {
      id: 'payments',
      title: 'Payment Setup',
      description: 'Configure Stripe (optional)',
      icon: CreditCard,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'complete' : 'pending',
    },
  ];

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const res = await fetch('/api/setup/status');
      if (res.ok) {
        const data = await res.json();
        if (data.isCompleted) {
          setSetupCompleted(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to check setup status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateAdminStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!adminData.username || adminData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (!adminData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminData.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!adminData.password || adminData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (adminData.password !== adminData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSiteStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (!siteData.siteName) {
      newErrors.siteName = 'Site name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateAdminStep()) return;
    if (currentStep === 2 && !validateSiteStep()) return;
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleComplete = async () => {
    if (currentStep === 1 && !validateAdminStep()) return;
    if (currentStep === 2 && !validateSiteStep()) return;

    setIsCompleting(true);
    setErrors({});

    try {
      const res = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin: adminData,
          site: siteData,
          stripe: stripeData.enabled ? stripeData : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSetupCompleted(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setErrors({ general: data.error || 'Setup failed. Please try again.' });
      }
    } catch (err: any) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  if (setupCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card variant="neon-glow" className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 border-4 border-success mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold gradient-text mb-4">
              Setup Complete!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your Vonix Network site is ready. Redirecting to login...
            </p>
            <Button variant="gradient" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Welcome to Vonix Network
          </h1>
          <p className="text-muted-foreground">
            Let&apos;s get your Minecraft community set up
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.status === 'complete' 
                        ? 'bg-success border-success' 
                        : step.status === 'current'
                        ? 'bg-neon-cyan/20 border-neon-cyan'
                        : 'bg-secondary border-border'
                    }`}
                  >
                    {step.status === 'complete' ? (
                      <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                      <step.icon 
                        className={`w-6 h-6 ${
                          step.status === 'current' ? 'text-neon-cyan' : 'text-muted-foreground'
                        }`} 
                      />
                    )}
                  </div>
                  <p className={`text-xs mt-2 text-center ${
                    step.status === 'current' ? 'text-foreground font-medium' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={`h-0.5 flex-1 mx-2 ${
                      index < currentStep ? 'bg-success' : 'bg-border'
                    }`} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Welcome Step */}
            {currentStep === 0 && (
              <div className="space-y-4 text-center py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-cyan/20 border-2 border-neon-cyan/50 mb-4">
                  <Globe className="w-10 h-10 text-neon-cyan" />
                </div>
                <h3 className="text-2xl font-bold">Let&apos;s Build Your Community</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This setup wizard will guide you through creating your admin account, 
                  configuring site settings, and setting up payment processing.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <div className="p-4 rounded-lg bg-secondary/50 text-left">
                    <Shield className="w-8 h-8 text-neon-purple mb-2" />
                    <h4 className="font-medium mb-1">Secure Setup</h4>
                    <p className="text-sm text-muted-foreground">
                      All sensitive data is stored securely in your database
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50 text-left">
                    <Key className="w-8 h-8 text-neon-orange mb-2" />
                    <h4 className="font-medium mb-1">Environment-Free</h4>
                    <p className="text-sm text-muted-foreground">
                      Minimal .env configuration required
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Account Step */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username *</label>
                  <Input
                    value={adminData.username}
                    onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                    placeholder="admin"
                    className={errors.username ? 'border-error' : ''}
                  />
                  {errors.username && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.username}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="admin@vonix.network"
                    className={errors.email ? 'border-error' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password *</label>
                  <Input
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="••••••••"
                    className={errors.password ? 'border-error' : ''}
                  />
                  {errors.password && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.password}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password *</label>
                  <Input
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className={errors.confirmPassword ? 'border-error' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Site Settings Step */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Name *</label>
                  <Input
                    value={siteData.siteName}
                    onChange={(e) => setSiteData({ ...siteData, siteName: e.target.value })}
                    placeholder="Vonix Network"
                    className={errors.siteName ? 'border-error' : ''}
                  />
                  {errors.siteName && (
                    <p className="text-xs text-error flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.siteName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Description</label>
                  <Input
                    value={siteData.siteDescription}
                    onChange={(e) => setSiteData({ ...siteData, siteDescription: e.target.value })}
                    placeholder="The Ultimate Minecraft Community"
                  />
                </div>
              </div>
            )}

            {/* Payment Setup Step */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <ToggleSwitch
                    checked={stripeData.enabled}
                    onChange={(checked) => setStripeData({ ...stripeData, enabled: checked })}
                    label="Enable Stripe Payments"
                    description="Accept donations and rank purchases"
                  />
                </div>

                {stripeData.enabled && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Secret Key</label>
                      <Input
                        type="password"
                        value={stripeData.secretKey}
                        onChange={(e) => setStripeData({ ...stripeData, secretKey: e.target.value })}
                        placeholder="sk_test_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Publishable Key</label>
                      <Input
                        value={stripeData.publishableKey}
                        onChange={(e) => setStripeData({ ...stripeData, publishableKey: e.target.value })}
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Webhook Secret</label>
                      <Input
                        type="password"
                        value={stripeData.webhookSecret}
                        onChange={(e) => setStripeData({ ...stripeData, webhookSecret: e.target.value })}
                        placeholder="whsec_..."
                      />
                      <p className="text-xs text-muted-foreground">
                        You can add this later in Admin Settings
                      </p>
                    </div>
                  </>
                )}

                {!stripeData.enabled && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    You can skip this for now and configure payments later in the admin panel
                  </p>
                )}
              </div>
            )}

            {errors.general && (
              <div className="p-4 rounded-lg bg-error/10 border border-error/50 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-error mt-0.5" />
                <p className="text-sm text-error">{errors.general}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0 || isCompleting}
              >
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button variant="gradient" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button 
                  variant="gradient" 
                  onClick={handleComplete}
                  disabled={isCompleting}
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

