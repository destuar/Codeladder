import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SocialAuthButton } from '@/components/ui/social-auth-button';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/features/admin/AdminContext';
import { useLogoSrc } from '@/features/landingpage/hooks/useLogoSrc';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, error, isLoading, loginWithProvider, user } = useAuth();
  const { canAccessAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const standaloneLogoSrc = useLogoSrc('single');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (user) {
      console.log('[RegisterPage] User state updated, navigating. User:', user);
      const targetPath = canAccessAdmin ? '/dashboard' : '/collections';
      navigate(targetPath, { replace: true });
    }
  }, [user, navigate, canAccessAdmin]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.name);
    } catch (err) {
      console.error('[RegisterPage] Email registration failed:', err);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    try {
      await loginWithProvider(provider);
    } catch (err) {
      console.error(`[RegisterPage] ${provider} login failed:`, err);
    }
  };

  return (
    <div className="font-mono h-[calc(100vh-4rem)] flex items-center justify-center relative bg-background px-4">
      {/* Dot pattern background layer */}
      <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      {/* Low-opacity logo background layer */}
      <img
        src={standaloneLogoSrc}
        alt=""
        className="absolute inset-0 m-auto w-1/2 h-1/2 max-w-lg max-h-lg object-contain opacity-[0.02] pointer-events-none z-0 select-none"
      />

      {/* Form Card - lifted above background layers */}
      <div className="relative z-10 w-full max-w-md space-y-6 p-8 bg-background/80 dark:bg-neutral-900/80 backdrop-blur-md rounded-xl border border-[#5271FF]/30 shadow-2xl shadow-[#5271FF]/10 dark:shadow-[#5271FF]/20">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#5271FF] to-[#6B8EFF]">Create an account</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Enter your details to get started</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name (optional)
            </label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full gap-2 bg-[#5271FF] hover:bg-[#415ACC] text-white dark:bg-[#5271FF] dark:hover:bg-[#415ACC] dark:text-white relative overflow-hidden group shadow-md shadow-[#5271FF]/5 py-3 text-base font-medium transition-all duration-300 ease-in-out hover:scale-105"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Creating account...
              </>
            ) : (
              'Sign up with Email'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 text-muted-foreground bg-background/80 dark:bg-neutral-900/80">
              Or continue with
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <SocialAuthButton
            provider="google"
            onClick={() => handleSocialAuth('google')}
            isLoading={isLoading}
          />
          <SocialAuthButton
            provider="github"
            onClick={() => handleSocialAuth('github')}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
} 