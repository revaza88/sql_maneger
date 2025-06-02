'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Settings, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { profileApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;
type PasswordUpdateForm = z.infer<typeof passwordUpdateSchema>;

export default function ProfilePage() {
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const queryClient = useQueryClient();
  const { user, setAuth } = useAuthStore();

  // Fetch profile data
  const { data: profileData, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
    enabled: !!user,
  });

  const profile = profileData?.data;

  // Profile update mutation
  const profileMutation = useMutation({
    mutationFn: (data: ProfileUpdateForm) => 
      profileApi.updateProfile(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Update auth store with new user data
      if (user && data.data) {
        setAuth({ ...user, ...data.data }, useAuthStore.getState().token!);
      }
      toast.success('Profile updated successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError.response?.data?.message || 'Failed to update profile');
    },
  });

  // Password update mutation
  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
      toast.success('Password updated successfully');
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } }
      toast.error(apiError.response?.data?.message || 'Failed to update password');
    },
  });

  const profileForm = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
    },
    values: {
      name: profile?.name || '',
      email: profile?.email || '',
    },
  });

  const passwordForm = useForm<PasswordUpdateForm>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onProfileSubmit = (data: ProfileUpdateForm) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordUpdateForm) => {
    passwordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="container mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading profile...</div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <main className="container mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-red-500">Error loading profile. Please try again.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <main className="container mx-auto space-y-6 p-6">
        <div className="flex items-center space-x-2">
          <User className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Profile Settings</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Settings className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Profile Information</h2>
            </div>

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          disabled={profileMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Enter your email"
                            className="pl-10"
                            disabled={profileMutation.isPending}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={profileMutation.isPending || !profileForm.formState.isDirty}
                    className="w-full"
                  >
                    {profileMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Security Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Unknown'}
                </div>
              </div>

              <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPassword ? 'text' : 'password'}
                                  placeholder="Enter current password"
                                  disabled={passwordMutation.isPending}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-0 h-full"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showNewPassword ? 'text' : 'password'}
                                  placeholder="Enter new password"
                                  disabled={passwordMutation.isPending}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-0 h-full"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="Confirm new password"
                                  disabled={passwordMutation.isPending}
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-2 top-0 h-full"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPasswordDialogOpen(false)}
                          disabled={passwordMutation.isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={passwordMutation.isPending}
                        >
                          {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium">Account Information</p>
                  <p>Role: <span className="capitalize">{profile?.role}</span></p>
                  <p>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
