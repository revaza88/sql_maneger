'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Download, Upload, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { databaseApi } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider 
} from '@/components/ui/tooltip';

const createDatabaseSchema = z.object({
  name: z.string().min(1, 'Database name is required')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Invalid database name format'),
  collation: z.string().optional(),
});

const backupDatabaseSchema = z.object({
  backupPath: z.string().optional(),
});

const restoreDatabaseSchema = z.object({
  backupPath: z.string().min(1, 'Backup path is required'),
});

type CreateDatabaseForm = z.infer<typeof createDatabaseSchema>;
type BackupDatabaseForm = z.infer<typeof backupDatabaseSchema>;
type RestoreDatabaseForm = z.infer<typeof restoreDatabaseSchema>;

interface Database {
  name: string;
  size_mb: number;
  create_date: string;
  state_desc: string;
}

export default function DatabasesPage() {
  // State for backup history
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Query for fetching backup history when needed
  const fetchBackupHistory = async (databaseName: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await databaseApi.getBackupHistory(databaseName);
      setBackupHistory(response.data || []);
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
      toast.error('Unable to load backup history');
      setBackupHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: databases, isLoading, isError } = useQuery({
    queryKey: ['databases'],
    queryFn: databaseApi.list
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDatabaseForm) => 
      databaseApi.create(data.name, data.collation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setIsCreateOpen(false);
      toast.success('Database created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create database');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: databaseApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      toast.success('Database deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete database');
    },
  });

  const backupMutation = useMutation({
    mutationFn: ({ name, backupPath }: { name: string, backupPath?: string }) => 
      databaseApi.backup(name, backupPath),
    onSuccess: (data) => {
      setIsBackupOpen(false);
      setSelectedDatabase(null);
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      
      // Show detailed success message with path
      const backupPath = data.backupPath || 'default location';
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Database backup successful</p>
          <p className="text-xs opacity-90">Path: {backupPath}</p>
        </div>
      );
    },
    onError: (error: any) => {
      console.error('Backup error:', error);
      
      // Extract error details for better user feedback
      const errorMessage = error.response?.data?.message || 'Failed to backup database';
      const errorDetails = error.response?.data?.details || '';
      const errorType = error.response?.data?.errorType || 'unknown';
      
      let helpText = 'Please check if the path is valid and SQL Server has write permissions.';
      
      if (errorType === 'permission') {
        helpText = 'SQL Server does not have permission to write to the specified location.';
      } else if (errorType === 'path') {
        helpText = 'The backup path is invalid or does not exist.';
      } else if (errorType === 'database') {
        helpText = 'The selected database does not exist or is not accessible.';
      }
      
      toast.error(
        <div className="space-y-1">
          <p className="font-medium">{errorMessage}</p>
          {errorDetails && <p className="text-xs opacity-90">{errorDetails}</p>}
          <p className="text-xs mt-1">{helpText}</p>
        </div>,
        { duration: 5000 }
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ name, backupPath }: { name: string, backupPath: string }) =>
      databaseApi.restore(name, backupPath),
    onSuccess: () => {
      setIsRestoreOpen(false);
      setSelectedDatabase(null);
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Database restored successfully</p>
          <p className="text-xs opacity-90">The database has been restored and is ready to use.</p>
        </div>
      );
    },
    onError: (error: any) => {
      console.error('Restore error:', error);
      
      // Extract error details for better user feedback
      const errorMessage = error.response?.data?.message || 'Failed to restore database';
      const errorDetails = error.response?.data?.details || '';
      const errorType = error.response?.data?.errorType || 'unknown';
      
      let helpText = 'Please check if the backup file exists and is accessible.';
      
      if (errorType === 'permission') {
        helpText = 'SQL Server does not have permission to read the backup file.';
      } else if (errorType === 'file_not_found') {
        helpText = 'The backup file was not found. Please verify the path is correct.';
      } else if (errorType === 'database') {
        helpText = 'The selected database does not exist or is not accessible.';
      } else if (errorType === 'invalid_backup') {
        helpText = 'The backup file appears to be corrupted or is not a valid SQL Server backup.';
      }
      
      toast.error(
        <div className="space-y-1">
          <p className="font-medium">{errorMessage}</p>
          {errorDetails && <p className="text-xs opacity-90">{errorDetails}</p>}
          <p className="text-xs mt-1">{helpText}</p>
        </div>,
        { duration: 5000 }
      );
    },
  });

  const form = useForm<CreateDatabaseForm>({
    resolver: zodResolver(createDatabaseSchema),
    defaultValues: {
      name: '',
      collation: '',
    },
  });

  const backupForm = useForm<BackupDatabaseForm>({
    resolver: zodResolver(backupDatabaseSchema),
    defaultValues: {
      backupPath: '',
    },
  });

  const restoreForm = useForm<RestoreDatabaseForm>({
    resolver: zodResolver(restoreDatabaseSchema),
    defaultValues: {
      backupPath: '',
    },
  });

  const onSubmit = (data: CreateDatabaseForm) => {
    createMutation.mutate(data);
  };

  const onBackupSubmit = (data: BackupDatabaseForm) => {
    if (selectedDatabase) {
      backupMutation.mutate({ 
        name: selectedDatabase, 
        backupPath: data.backupPath || undefined 
      });
    }
  };

  const onRestoreSubmit = (data: RestoreDatabaseForm) => {
    if (selectedDatabase) {
      if (window.confirm(`Are you sure you want to restore database "${selectedDatabase}"? This will replace all current data.`)) {
        restoreMutation.mutate({ 
          name: selectedDatabase, 
          backupPath: data.backupPath 
        });
      }
    }
  };

  const handleDelete = async (name: string) => {
    if (window.confirm(`Are you sure you want to delete database "${name}"?`)) {
      deleteMutation.mutate(name);
    }
  };

  const handleBackup = (name: string) => {
    setSelectedDatabase(name);
    setIsBackupOpen(true);
    backupForm.reset();
  };

  const handleRestore = (name: string) => {
    setSelectedDatabase(name);
    setIsRestoreOpen(true);
    restoreForm.reset();
    // Fetch backup history for this database
    fetchBackupHistory(name);
  };

  const safeDatabases = databases || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-muted-foreground">Loading databases...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-500">Error loading databases. Please try again.</div>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Databases</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Database
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Database</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Database Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter database name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="collation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collation (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="SQL_Latin1_General_CP1_CI_AS"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Database'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Backup Dialog */}
        <Dialog open={isBackupOpen} onOpenChange={(open) => !backupMutation.isPending && setIsBackupOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Backup Database {selectedDatabase}</DialogTitle>
            </DialogHeader>
            <Form {...backupForm}>
              <form onSubmit={backupForm.handleSubmit(onBackupSubmit)} className="space-y-4">
                <FormField
                  control={backupForm.control}
                  name="backupPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup Path (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Leave empty for default backup path"
                          disabled={backupMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        If left empty, the database will be backed up to the SQL Server's default backup location.
                        <br />
                        Example path: C:\SQLBackups\{selectedDatabase}_backup.bak
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Info box */}
                <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Database className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Backup Information</h3>
                      <div className="mt-2 text-sm text-blue-700 space-y-1">
                        <p>This will create a full backup of the database which can be used for restoration later.</p>
                        <p>SQL Server must have write permissions to the target location.</p>
                        <p>For network paths, use UNC format (\\server\share\path).</p>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsBackupOpen(false)}
                    type="button"
                    disabled={backupMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={backupMutation.isPending}
                  >
                    {backupMutation.isPending ? 
                      <><span className="mr-2">Backing up...</span><span className="animate-spin">⏳</span></> : 
                      'Backup Database'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Restore Dialog */}
        <Dialog open={isRestoreOpen} onOpenChange={(open) => !restoreMutation.isPending && setIsRestoreOpen(open)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Restore Database {selectedDatabase}</DialogTitle>
            </DialogHeader>
            <Form {...restoreForm}>
              <form onSubmit={restoreForm.handleSubmit(onRestoreSubmit)} className="space-y-4">
                <FormField
                  control={restoreForm.control}
                  name="backupPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Backup File Path</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="C:\SQLBackups\database.bak"
                          disabled={restoreMutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide the full path to the backup file (.bak) you want to restore from.
                        <br />
                        <span className="text-amber-500">Warning: This operation will replace the current database contents.</span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Recent backups section */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Recent Backups</h3>
                  
                  {isLoadingHistory ? (
                    <div className="text-center py-4">
                      <div className="animate-spin inline-block w-6 h-6 border-2 border-t-blue-600 border-blue-200 rounded-full" />
                      <p className="text-sm text-muted-foreground mt-2">Loading backup history...</p>
                    </div>
                  ) : backupHistory.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Date</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backupHistory.slice(0, 5).map((backup, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{new Date(backup.startTime).toLocaleString()}</TableCell>
                              <TableCell>{backup.sizeInMB.toFixed(2)} MB</TableCell>
                              <TableCell>{backup.backupType}</TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => restoreForm.setValue('backupPath', backup.backupFile)}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center border rounded-md p-4 bg-muted/20">
                      <p className="text-muted-foreground">No recent backups found for this database.</p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsRestoreOpen(false)}
                    type="button"
                    disabled={restoreMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={restoreMutation.isPending || !restoreForm.formState.isValid}
                  >
                    {restoreMutation.isPending ? 
                      <><span className="mr-2">Restoring...</span><span className="animate-spin">⏳</span></> : 
                      'Restore Database'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size (MB)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeDatabases.map((db: Database) => (
                <TableRow key={db.name}>
                  <TableCell className="font-medium">{db.name}</TableCell>
                  <TableCell>{db.size_mb.toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(db.create_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{db.state_desc}</TableCell>
                  <TableCell className="flex justify-end space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleBackup(db.name)}
                          className="hover:bg-blue-50 text-blue-600"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Backup Database</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(db.name)}
                          className="hover:bg-amber-50 text-amber-600"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Restore Database</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(db.name)}
                          className="hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Delete Database</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </TooltipProvider>
  );
}
