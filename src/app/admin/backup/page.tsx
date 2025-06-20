'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, Database, Download, Plus, Search, RefreshCw, Archive, Play, AlertTriangle, FileText, HardDrive } from 'lucide-react';
import { backupApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { AdminLayout } from '@/components/admin-layout';

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

interface BatchBackup {
  id: string;
  timestamp: string;
  databases: string[];
  totalSize: string;
  status: 'in-progress' | 'completed' | 'failed';
  backupCount: number;
  createdBy?: {
    userId: number;
    userEmail: string;
  };
}

interface BatchBackupDetails extends BatchBackup {
  backupFiles: {
    database: string;
    fileName: string;
    size: string;
    createdAt: string;
  }[];
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
  const [batchBackups, setBatchBackups] = useState<BatchBackup[]>([]);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<BatchBackupDetails | null>(null);
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isBatchDetailsDialogOpen, setIsBatchDetailsDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmDialogContent, setConfirmDialogContent] = useState({ title: '', description: '', onConfirm: () => {} });

  const [selectedBackupFile, setSelectedBackupFile] = useState<BackupFile | null>(null);
  const [batchBackupInProgress, setBatchBackupInProgress] = useState(false);
  
  const { token } = useAuthStore();
  const router = useRouter();

  // Authorization check
  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
  }, [token, router]);

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
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configsRes, filesRes, databasesRes, batchBackupsRes] = await Promise.all([
        backupApi.getConfigs(),
        backupApi.getFiles(),
        backupApi.getDatabases('1'), // Default connection
        backupApi.getBatchBackups()
      ]);

      setBackupConfigs(configsRes || []);
      setBackupFiles(filesRes || []);
      setDatabases(databasesRes || []);
      setBatchBackups(batchBackupsRes || []);
    } catch (error) {
      toast.error('მონაცემების ჩატვირთვის შეცდომა');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialogContent({ title, description, onConfirm });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    confirmDialogContent.onConfirm();
    setIsConfirmDialogOpen(false);
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

  // Batch backup functions
  const createBatchBackup = () => {
    openConfirmDialog('ყველა ბაზის ბექაპი', 'ნამდვილად გსურთ ყველა ბაზის ბაჩ ბექაპის შექმნა?', async () => {
      try {
        setBatchBackupInProgress(true);
        const result = await backupApi.createBatchBackup();
        toast.success('ბაჩ ბექაპი დაიწყო');
        console.log('Batch backup started:', result);
        
        // Reload data to show the new batch backup
        setTimeout(() => {
          loadData();
        }, 2000);
      } catch (error) {
        toast.error('ბაჩ ბექაპის შექმნის შეცდომა');
        console.error('Error creating batch backup:', error);
      } finally {
        setBatchBackupInProgress(false);
      }
    });
  };

  const loadBatchDetails = async (batchId: string) => {
    try {
      console.error('Error loading batch details:', error);
    }
  };
  const restoreBatchBackup = async (batchId: string) => {
    if (!confirm('ნამდვილად გსურთ მთელი ბაჩ ბექაპის აღდგენა? ეს შეცვლის ყველა ბაზას.')) return;
    
    try {
      setLoading(true);
      
      // Start the restore operation
      const result = await backupApi.restoreBatchBackup(batchId);
      const operationId = result.operationId;
      
      toast.success(`ბაჩ ბექაპის აღდგენა დაიწყო - ${result.totalDatabases} ბაზა`);
      
      // Poll for status updates
      const pollStatus = async () => {
        try {
          const status = await backupApi.getRestoreStatus(operationId);
          
          if (status.status === 'completed') {
            toast.success(`ბაჩ ბექაპი აღდგა: ${status.successCount} წარმატებული, ${status.failedCount} ჩავარდნილი`);
            setLoading(false);
            return;
          } else if (status.status === 'failed') {
            toast.error('ბაჩ ბექაპის აღდგენა ჩავარდა');
            setLoading(false);
            return;
          } else {
            // Still in progress, show progress
            toast.info(`პროცესია: ${status.completedDatabases}/${status.totalDatabases} ბაზა დასრულდა`);
            setTimeout(pollStatus, 3000); // Poll every 3 seconds
          }
        } catch (error) {
          console.error('Error polling restore status:', error);
          setLoading(false);
          toast.error('სტატუსის შემოწმების შეცდომა');
        }
      };
      
      // Start polling after a short delay
      setTimeout(pollStatus, 2000);
      
    } catch (error: any) {
      setLoading(false);
      if (error.response?.status === 429) {
        toast.error('ძალიან ბევრი მოთხოვნა. გთხოვთ ცოტა ხანში სცადოთ');
      } else {
        toast.error('ბაჩ ბექაპის აღდგენის შეცდომა');
      }
      console.error('Error restoring batch backup:', error);
    }
  };  const restoreSingleFromBatch = async (batchId: string, database: string) => {
    if (!confirm(`ნამდვილად გსურთ "${database}" ბაზის აღდგენა ბაჩ ბექაპიდან?`)) return;
    
    try {
      setLoading(true);
      const result = await backupApi.restoreSingleFromBatch(batchId, database);
      toast.success(`ბაზა "${database}" წარმატებით აღდგა`);
      console.log('Single restore result:', result);
    } catch (error: any) {
      if (error.response?.status === 429) {
        toast.error('ძალიან ბევრი მოთხოვნა. გთხოვთ ცოტა ხანში სცადოთ');
      } else {
        toast.error(`ბაზის "${database}" აღდგენის შეცდომა`);
      }
      console.error('Error restoring single database:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBatchBackup = async (batchId: string) => {
    if (!confirm('ნამდვილად გსურთ ამ ბაჩ ბექაპის წაშლა?')) return;
    
    try {
      await backupApi.deleteBatchBackup(batchId);
      toast.success('ბაჩ ბექაპი წაიშალა');
      loadData();
    } catch (error) {
      toast.error('ბაჩ ბექაპის წაშლის შეცდომა');
      console.error('Error deleting batch backup:', error);
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

  // Handle quick backup for specific database
  const handleQuickBackup = async (database: string) => {
    if (!confirm(`ნამდვილად გსურთ "${database}" ბაზის ბექაპი?`)) return;
    
    try {
      setLoading(true);
      const result = await backupApi.createManualBackup(database, '1'); // Using default connection ID
      toast.success(`ბაზა "${database}" წარმატებით შექმნა ბექაპი`);
      loadData(); // Reload data to show new backup
    } catch (error: any) {
      if (error.response?.status === 429) {
        toast.error('ძალიან ბევრი მოთხოვნა. გთხოვთ ცოტა ხანში სცადოთ');
      } else {
        toast.error(`ბაზის "${database}" ბექაპის შეცდომა`);
      }
      console.error('Error creating quick backup:', error);
    } finally {
      setLoading(false);
    }
  };
  // Show loading if user is not authenticated or not admin
  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <LoadingSpinner />;
  }

  if (loading) {
    return (
      <AdminLayout 
        title="ბექაპების მართვა" 
        description="მართეთ ავტომატური და ხელით ბექაპები"
        icon={<Archive className="h-6 w-6 text-blue-600" />}
      >
        <div className="flex justify-center p-8">იტვირთება...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="ბექაპების მართვა" 
      description="მართეთ ავტომატური და ხელით ბექაპები"
      icon={<Archive className="h-6 w-6 text-blue-600" />}
    >
      <div className="max-w-7xl mx-auto space-y-6"><Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="space-y-3">
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-6 w-6 text-blue-600" />
                ახალი ავტომატური ბექაპის განრიგი
              </DialogTitle>
              <DialogDescription>
                შექმენით ავტომატური ბაჩ ბექაპის განრიგი ყველა ბაზისთვის
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">განრიგის დასახელება</Label>
                <Input
                  id="name"
                  value={newConfig.name}
                  onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                  placeholder="მაგ: ყოველდღიური ბაჩ ბექაპი"
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

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-900">📋 რა მოხდება:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• ავტომატურად შეიქმნება ყველა ბაზის ბაჩ ბექაპი</li>
                  <li>• ბექაპები ინახება ცალკე ფოლდერში timestamp-ით</li>
                  <li>• ძველი ბექაპები იშლება შენახვის ვადის გასვლის შემდეგ</li>
                </ul>
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
      </div>      <Tabs defaultValue="quick" className="space-y-8">        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="quick">⚡ სწრაფი ბექაპი</TabsTrigger>
          <TabsTrigger value="automatic">📦 ბაჩ ბექაპები</TabsTrigger>
          <TabsTrigger value="schedule">⚙️ განრიგი</TabsTrigger>
          <TabsTrigger value="all">📂 ყველა ბექაპი</TabsTrigger>
        </TabsList>

        <TabsContent value="quick">
          <div className="space-y-6">
            {/* სწრაფი სრული ბექაპი */}
            <Card>
              <CardHeader>
                <CardTitle>📦 ყველა ბაზის ბექაპი</CardTitle>
                <CardDescription>
                  სისტემაში არსებული ყველა ბაზის ერთდროული ბექაპი
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      შექმნის ყველა ბაზის ბექაპს ერთ ფოლდერში
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      მონაცემთა ბაზების რაოდენობა: {databases.length}
                    </p>
                  </div>
                  <Button
                    onClick={createBatchBackup}
                    disabled={batchBackupInProgress || loading}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {batchBackupInProgress ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        პროცესშია...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        ყველას ბექაპი
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* კონკრეტული ბაზის ბექაპი */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ კონკრეტული ბაზის ბექაპი</CardTitle>
                <CardDescription>
                  აირჩიეთ კონკრეტული ბაზა სწრაფი ბექაპისთვის
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {databases.map((database) => (
                      <Card key={database} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Database className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">{database}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleQuickBackup(database)}
                              disabled={loading}
                              variant="outline"
                            >
                              ბექაპი
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {databases.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      ბაზები არ მოიძებნა
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automatic">
          <Card>            <CardHeader>
              <CardTitle>📦 ყველა ბაჩ ბექაპი</CardTitle>
              <CardDescription>
                ყველა ბაზის ერთდროული ბექაპები (ხელით და ავტომატურად შექმნილი)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ბაჩ ID</TableHead>
                    <TableHead>თარიღი</TableHead>
                    <TableHead>ბაზების რაოდენობა</TableHead>
                    <TableHead>მოცულობა</TableHead>
                    <TableHead>სტატუსი</TableHead>
                    <TableHead>შემქმნელი</TableHead>
                    <TableHead>მოქმედებები</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchBackups.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-mono text-xs">{batch.id}</TableCell>
                      <TableCell>{formatDate(batch.timestamp)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.databases.length} ბაზა</Badge>
                      </TableCell>
                      <TableCell>{batch.totalSize}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            batch.status === 'completed' ? 'default' : 
                            batch.status === 'in-progress' ? 'secondary' : 'destructive'
                          }
                        >
                          {batch.status === 'completed' ? 'დასრულებული' : 
                           batch.status === 'in-progress' ? 'პროცესშია' : 'ჩავარდნილი'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          batch.createdBy?.userEmail === 'system@scheduler' ? 'secondary' :
                          batch.id.startsWith('manual_') ? 'outline' : 'default'
                        }>
                          {batch.createdBy?.userEmail === 'system@scheduler' ? 'ავტომატური' :
                           batch.id.startsWith('manual_') ? 'განრიგიდან' : 
                           batch.createdBy?.userEmail || 'ხელით'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadBatchDetails(batch.id)}
                          >
                            დეტალები
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => restoreBatchBackup(batch.id)}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            აღდგენა
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBatchBackup(batch.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {batchBackups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  ბაჩ ბექაპები არ მოიძებნა
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>⚙️ ავტომატური ბექაპის განრიგი</CardTitle>
              <CardDescription>
                ავტომატური ბაჩ ბექაპების პარამეტრები და განრიგი
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
                        <div className="flex space-x-2">                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runConfigBackup(config.id, config.name)}
                            disabled={loading}
                          >
                            გაშვება
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteConfig(config.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  ახალი განრიგი
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-6">
            {/* ყველა ბაჩ ბექაპი */}
            <Card>
              <CardHeader>
                <CardTitle>📦 ყველა ბაჩ ბექაპი</CardTitle>
                <CardDescription>
                  ხელით და ავტომატურად შექმნილი ყველა ბაჩ ბექაპი
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ბაჩ ID</TableHead>
                      <TableHead>თარიღი</TableHead>
                      <TableHead>ბაზების რაოდენობა</TableHead>
                      <TableHead>მოცულობა</TableHead>
                      <TableHead>სტატუსი</TableHead>
                      <TableHead>შემქმნელი</TableHead>
                      <TableHead>მოქმედებები</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchBackups.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-mono text-xs">{batch.id}</TableCell>
                        <TableCell>{formatDate(batch.timestamp)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.databases.length} ბაზა</Badge>
                        </TableCell>
                        <TableCell>{batch.totalSize}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              batch.status === 'completed' ? 'default' : 
                              batch.status === 'in-progress' ? 'secondary' : 'destructive'
                            }
                          >
                            {batch.status === 'completed' ? 'დასრულებული' : 
                             batch.status === 'in-progress' ? 'პროცესშია' : 'ჩავარდნილი'}
                        </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={batch.createdBy?.userEmail === 'system@scheduler' ? 'secondary' : 'default'}>
                            {batch.createdBy?.userEmail === 'system@scheduler' ? 'ავტომატური' : batch.createdBy?.userEmail}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadBatchDetails(batch.id)}
                            >
                              დეტალები
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => restoreBatchBackup(batch.id)}
                              disabled={loading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              აღდგენა
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteBatchBackup(batch.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {batchBackups.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    ბაჩ ბექაპები არ მოიძებნა
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ინდივიდუალური ბექაპ ფაილები */}
            <Card>
              <CardHeader>
                <CardTitle>💾 ინდივიდუალური ბექაპ ფაილები</CardTitle>
                <CardDescription>
                  კონკრეტული ბაზების ცალკეული ბექაპ ფაილები
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ბაზა</TableHead>
                      <TableHead>ფაილის სახელი</TableHead>
                      <TableHead>მოცულობა</TableHead>
                      <TableHead>თარიღი</TableHead>
                      <TableHead>ტიპი</TableHead>
                      <TableHead>მოქმედებები</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.database}</TableCell>
                        <TableCell className="font-mono text-xs">{file.fileName}</TableCell>
                        <TableCell>{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>{formatDate(file.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={file.type === 'manual' ? 'default' : 'secondary'}>
                            {file.type === 'manual' ? 'ხელით' : 'ავტომატური'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
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
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {backupFiles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    ინდივიდუალური ბექაპ ფაილები არ მოიძებნა
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>        <TabsContent value="batch">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ბაჩ ბექაპები</CardTitle>
                  <CardDescription>
                    ყველა ბაზის ერთად დაბექაპება და აღდგენა
                  </CardDescription>
                </div>
                <Button 
                  onClick={createBatchBackup}
                  disabled={batchBackupInProgress || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {batchBackupInProgress ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      იქმნება...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      ყველა ბაზის ბექაპი
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {batchBackups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>ბაჩ ბექაპები არ არის</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batchBackups.map((batch) => (
                    <div key={batch.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Database className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">
                              ბაჩ ბექაპი - {new Date(batch.timestamp).toLocaleString('ka-GE')}
                            </span>
                          </div>
                          <Badge 
                            variant={batch.status === 'completed' ? 'default' : 
                                   batch.status === 'in-progress' ? 'secondary' : 'destructive'}
                          >
                            {batch.status === 'completed' ? 'დასრულებული' :
                             batch.status === 'in-progress' ? 'მიმდინარე' : 'ჩავარდნილი'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadBatchDetails(batch.id)}
                            disabled={loading}
                          >
                            <Search className="h-4 w-4 mr-1" />
                            დეტალები
                          </Button>
                          {batch.status === 'completed' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => restoreBatchBackup(batch.id)}
                                disabled={loading}
                                className="text-green-600 hover:text-green-700"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                ყველას აღდგენა
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteBatchBackup(batch.id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">ბაზების რაოდენობა:</span>
                          <div className="font-medium">{batch.databases.length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ბექაპების რაოდენობა:</span>
                          <div className="font-medium">{batch.backupCount}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ჯამური ზომა:</span>
                          <div className="font-medium">{batch.totalSize}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">შემქმნელი:</span>
                          <div className="font-medium">{batch.createdBy?.userEmail || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm text-muted-foreground mr-2">ბაზები:</span>
                        {batch.databases.slice(0, 5).map((db) => (
                          <Badge key={db} variant="secondary" className="text-xs">
                            {db}
                          </Badge>
                        ))}
                        {batch.databases.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{batch.databases.length - 5} სხვა
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>ბექაპ ფაილები</CardTitle>
              <CardDescription>
                არსებული ბექაპ ფაილები და აღდგენის ოპციები
              </CardDescription>            </CardHeader>
            <CardContent>
              <Table>
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

      {/* Batch Backup Details Dialog */}
      <Dialog open={isBatchDetailsDialogOpen} onOpenChange={setIsBatchDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ბაჩ ბექაპის დეტალები</DialogTitle>
            <DialogDescription>
              ბაჩ ბექაპში შემავალი ყველა ბაზისა და ფაილის დეტალური ინფორმაცია
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatchDetails && (
            <div className="space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">თარიღი:</span>
                  <div className="font-medium">{new Date(selectedBatchDetails.timestamp).toLocaleString('ka-GE')}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">სტატუსი:</span>
                  <div>
                    <Badge 
                      variant={selectedBatchDetails.status === 'completed' ? 'default' : 
                             selectedBatchDetails.status === 'in-progress' ? 'secondary' : 'destructive'}
                    >
                      {selectedBatchDetails.status === 'completed' ? 'დასრულებული' :
                       selectedBatchDetails.status === 'in-progress' ? 'მიმდინარე' : 'ჩავარდნილი'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ჯამური ზომა:</span>
                  <div className="font-medium">{selectedBatchDetails.totalSize}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">შემქმნელი:</span>
                  <div className="font-medium">{selectedBatchDetails.createdBy?.userEmail || 'N/A'}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => restoreBatchBackup(selectedBatchDetails.id)}
                  disabled={loading || selectedBatchDetails.status !== 'completed'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  ყველა ბაზის აღდგენა
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsBatchDetailsDialogOpen(false);
                    deleteBatchBackup(selectedBatchDetails.id);
                  }}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ბაჩ ბექაპის წაშლა
                </Button>
              </div>

              {/* Backup Files Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3">ბექაპ ფაილები</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ბაზის სახელი</TableHead>
                        <TableHead>ფაილის სახელი</TableHead>
                        <TableHead>ზომა</TableHead>
                        <TableHead>შექმნის თარიღი</TableHead>
                        <TableHead>მოქმედებები</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatchDetails.backupFiles.map((file) => (
                        <TableRow key={file.database}>
                          <TableCell className="font-medium">{file.database}</TableCell>
                          <TableCell>{file.fileName}</TableCell>
                          <TableCell>{file.size}</TableCell>
                          <TableCell>{new Date(file.createdAt).toLocaleString('ka-GE')}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreSingleFromBatch(selectedBatchDetails.id, file.database)}
                              disabled={loading}
                              className="text-green-600 hover:text-green-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              აღდგენა
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>      </Dialog>
    </AdminLayout>
  );
}
