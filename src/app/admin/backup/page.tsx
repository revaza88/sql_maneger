'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, Database, Download, Plus, Search, RefreshCw } from 'lucide-react';
import { backupApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';

interface BackupConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  databases: string[];
  retentionDays: number;
  createdAt: string;
  lastBackup?: string;
}

interface BackupFile {
  id: string;
  database: string;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: string;
  type: 'manual' | 'scheduled';
  owner?: {
    userId: number;
    userEmail: string;
  };
}

const CRON_PRESETS = [
  { label: 'ყოველდღე 2 საათზე', value: '0 2 * * *' },
  { label: 'ყოველ კვირას', value: '0 2 * * 0' },
  { label: 'ყოველ თვეში', value: '0 2 1 * *' },
  { label: 'ყოველ 6 საათში', value: '0 */6 * * *' },
  { label: 'სასურველი...', value: 'custom' }
];

export default function BackupManagement() {
  const [backupConfigs, setBackupConfigs] = useState<BackupConfig[]>([]);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<BackupFile | null>(null);
  
  const { user, token, clearAuth } = useAuthStore();
  const router = useRouter();

  // Authorization check
  useEffect(() => {
    if (!token || !user || user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/login');
      return;
    }
  }, [token, user, router]);

  // Form states
  const [newConfig, setNewConfig] = useState({
    name: '',
    schedule: '',
    databases: [] as string[],
    retentionDays: 30,
    enabled: true
  });

  const [restoreForm, setRestoreForm] = useState({
    newDatabaseName: '',
    connectionId: '1'
  });

  useEffect(() => {
    if (user?.role?.toLowerCase() === 'admin') {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // Debug auth state
    const authState = useAuthStore.getState();
    console.log('Current auth state:', { 
      user: authState.user,
      hasToken: !!authState.token,
      userRole: authState.user?.role 
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, filesRes, databasesRes] = await Promise.all([
        backupApi.getConfigs(),
        backupApi.getFiles(),
        backupApi.getDatabases('1') // Default connection
      ]);

      setBackupConfigs(configsRes);
      setBackupFiles(filesRes);
      setDatabases(databasesRes);
    } catch (error) {
      toast.error('მონაცემების ჩატვირთვის შეცდომა');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };
  const createBackupConfig = async () => {
    try {
      console.log('Creating backup config with data:', newConfig);
      await backupApi.createConfig(newConfig);
      toast.success('ბექაპის კონფიგურაცია შეიქმნა');
      setIsCreateDialogOpen(false);
      setNewConfig({
        name: '',
        schedule: '',
        databases: [],
        retentionDays: 30,
        enabled: true
      });
      loadData();
    } catch (error: any) {
      console.error('Full error details:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error('კონფიგურაციის შექმნის შეცდომა');
      console.error('Error creating config:', error);
    }
  };
  const toggleConfig = async (id: string, enabled: boolean) => {
    try {
      await backupApi.updateConfig(id, { enabled });
      toast.success(enabled ? 'კონფიგურაცია ჩაირთო' : 'კონფიგურაცია გამოირთო');
      loadData();
    } catch (error) {
      toast.error('კონფიგურაციის განახლების შეცდომა');
      console.error('Error updating config:', error);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ კონფიგურაციის წაშლა?')) return;
    
    try {
      await backupApi.deleteConfig(id);
      toast.success('კონფიგურაცია წაიშალა');
      loadData();
    } catch (error) {
      toast.error('კონფიგურაციის წაშლის შეცდომა');
      console.error('Error deleting config:', error);
    }
  };

  const runConfigBackup = async (id: string, name: string) => {
    if (!confirm(`ნამდვილად გსურთ "${name}" კონფიგურაციისთვის ახლავე ბექაპის გაშვება?`)) return;
    
    try {
      setLoading(true);
      const result = await backupApi.runConfigBackup(id);
      toast.success(`${result.configName} - ${result.message}`);
      loadData();
    } catch (error) {
      toast.error('ბექაპის გაშვების შეცდომა');
      console.error('Error running config backup:', error);
    } finally {
      setLoading(false);
    }
  };

  const createManualBackup = async (database: string) => {
    try {
      await backupApi.createManualBackup(database, '1');
      toast.success(`${database} ბაზის ბექაპი შეიქმნა`);
      loadData();
    } catch (error) {
      toast.error('ბექაპის შექმნის შეცდომა');
      console.error('Error creating backup:', error);
    }
  };

  const restoreFromBackup = async () => {
    if (!selectedBackupFile) return;
    
    try {
      await backupApi.restoreFromBackup(
        selectedBackupFile.id,
        restoreForm.newDatabaseName || undefined,
        restoreForm.connectionId
      );
      
      toast.success('ბაზა წარმატებით აღდგა');
      setIsRestoreDialogOpen(false);
      setSelectedBackupFile(null);
      setRestoreForm({ newDatabaseName: '', connectionId: '1' });
    } catch (error) {
      toast.error('ბაზის აღდგენის შეცდომა');
      console.error('Error restoring backup:', error);
    }
  };

  const deleteBackupFile = async (id: string) => {
    if (!confirm('ნამდვილად გსურთ ამ ბექაპის წაშლა?')) return;
    
    try {
      await backupApi.deleteFile(id);
      toast.success('ბექაპი წაიშალა');
      loadData();
    } catch (error) {
      toast.error('ბექაპის წაშლის შეცდომა');
      console.error('Error deleting backup:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ka-GE');
  };

  // Show loading if user is not authenticated or not admin
  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <LoadingSpinner />;
  }

  if (loading) {
    return <div className="flex justify-center p-8">იტვირთება...</div>;
  }
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ბექაპების მართვა
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">მართეთ ავტომატური და ხელით ბექაპები</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              ახალი ბექაპის კონფიგურაცია
            </Button>
          </DialogTrigger>          <DialogContent className="max-w-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-blue-600" />
                ახალი ბექაპის კონფიგურაცია
              </DialogTitle>
              <DialogDescription>
                შექმენით ავტომატური ბექაპის რეჟიმი თქვენი მონაცემთა ბაზების უსაფრთხოებისთვის
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">კონფიგურაციის დასახელება</Label>
                <Input
                  id="name"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="მაგ: ყოველდღიური ბექაპი"
                  className="w-full"
                />
              </div>              <div className="space-y-2">
                <Label htmlFor="schedule">განრიგი</Label>
                <Select 
                  value={newConfig.schedule} 
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setNewConfig({ ...newConfig, schedule: '' });
                    } else {
                      setNewConfig({ ...newConfig, schedule: value });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="აირჩიეთ განრიგი" />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(newConfig.schedule === '' || !CRON_PRESETS.find(p => p.value === newConfig.schedule)) && (
                  <Input
                    className="mt-3"
                    value={newConfig.schedule}
                    onChange={(e) => setNewConfig({ ...newConfig, schedule: e.target.value })}
                    placeholder="CRON ფორმატი (მაგ: 0 2 * * *)"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="retentionDays">შენახვის ვადა (დღე)</Label>
                <Input
                  id="retentionDays"
                  type="number"
                  value={newConfig.retentionDays}
                  onChange={(e) => setNewConfig({ ...newConfig, retentionDays: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  გაუქმება
                </Button>
                <Button onClick={createBackupConfig} className="min-w-[100px]">
                  შექმნა
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>      <Tabs defaultValue="configs" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="configs">კონფიგურაციები</TabsTrigger>
          <TabsTrigger value="files">ბექაპ ფაილები</TabsTrigger>
          <TabsTrigger value="manual">ხელით ბექაპი</TabsTrigger>
        </TabsList>

        <TabsContent value="configs">
          <Card>
            <CardHeader>              <CardTitle>ბექაპის კონფიგურაციები</CardTitle>
              <CardDescription>
                ავტომატური ბექაპის პარამეტრები და განრიგი
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>დასახელება</TableHead>
                    <TableHead>განრიგი</TableHead>
                    <TableHead>სტატუსი</TableHead>
                    <TableHead>ბოლო ბექაპი</TableHead>
                    <TableHead>მოქმედებები</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>{config.schedule}</TableCell>
                      <TableCell>
                        <Badge variant={config.enabled ? "default" : "secondary"}>
                          {config.enabled ? 'ჩართული' : 'გამორთული'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {config.lastBackup ? formatDate(config.lastBackup) : 'არ ყოფილა'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={config.enabled ? "outline" : "default"}
                            onClick={() => toggleConfig(config.id, !config.enabled)}
                            title={config.enabled ? 'კონფიგურაციის გამორთვა' : 'კონფიგურაციის ჩართვა'}
                          >
                            {config.enabled ? 'გამორთვა' : 'ჩართვა'}
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => runConfigBackup(config.id, config.name)}
                            disabled={loading}
                            title="ბექაპის ახლავე გაშვება"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            გაშვება
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteConfig(config.id)}
                            title="კონფიგურაციის წაშლა"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            წაშლა
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>ბექაპ ფაილები</CardTitle>
              <CardDescription>
                არსებული ბექაპ ფაილები და აღდგენის ოპციები
              </CardDescription>
            </CardHeader>
            <CardContent><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ბაზა</TableHead>
                    <TableHead>მფლობელი</TableHead>
                    <TableHead>ფაილის სახელი</TableHead>
                    <TableHead>ზომა</TableHead>
                    <TableHead>შექმნის თარიღი</TableHead>
                    <TableHead>ტიპი</TableHead>
                    <TableHead>მოქმედებები</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.database}</TableCell>
                      <TableCell>
                        {file.owner ? (
                          <span className="text-sm text-gray-600">
                            {file.owner.userEmail}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            უცნობი
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{file.fileName}</TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>{formatDate(file.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={file.type === 'manual' ? "outline" : "default"}>
                          {file.type === 'manual' ? 'ხელით' : 'ავტომატური'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedBackupFile(file);
                              setIsRestoreDialogOpen(true);
                            }}
                          >
                            აღდგენა
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBackupFile(file.id)}
                          >
                            წაშლა
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>ხელით ბექაპის შექმნა</CardTitle>
              <CardDescription>
                შექმენით ცალკეული ბაზების ბექაპები
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {databases.map((database) => (
                  <Card key={database} className="p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{database}</h3>
                      <Button
                        size="sm"
                        onClick={() => createManualBackup(database)}
                      >
                        ბექაპი
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              ბაზის აღდგენა
            </DialogTitle>
            <DialogDescription>
              აღადგინეთ მონაცემთა ბაზა შერჩეული ბექაპიდან
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">ბექაპ ფაილი</Label>
              <p className="text-sm text-gray-900 dark:text-white font-medium mt-1">
                {selectedBackupFile?.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                მონაცემთა ბაზა: {selectedBackupFile?.database}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newDatabaseName">ახალი ბაზის სახელი (არასავალდებულო)</Label>
              <Input
                id="newDatabaseName"
                value={restoreForm.newDatabaseName}
                onChange={(e) => setRestoreForm({ ...restoreForm, newDatabaseName: e.target.value })}
                placeholder="ცარიელი ნიშნავს ორიგინალური სახელის გამოყენებას"
                className="w-full"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsRestoreDialogOpen(false)}>
                გაუქმება
              </Button>
              <Button onClick={restoreFromBackup} className="min-w-[100px]">
                აღდგენა
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
