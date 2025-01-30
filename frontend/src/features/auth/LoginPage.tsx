import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SocialAuthButton } from '@/components/ui/social-auth-button';
import { Separator } from '@/components/ui/separator';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, error, isLoading, loginWithProvider } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github' | 'apple') => {
    try {
      await loginWithProvider(provider);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Signing in...
              </>
            ) : (
              'Sign in with Email'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="flex gap-3">
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
          <SocialAuthButton
            provider="apple"
            onClick={() => handleSocialAuth('apple')}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
} 