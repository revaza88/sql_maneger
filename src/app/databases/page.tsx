'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Download, Upload, Database, Cloud, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { databaseApi } from '@/lib/api';

interface BackupFile {
  filename: string;
  name: string;
  size: number;
  uploadDate: string;
}

interface Database {
  name: string;
  size_mb: number;
  create_date: string;
  state_desc: string;
}

export default function DatabasesPage() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedBackups, setUploadedBackups] = useState<BackupFile[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isRestoreFromUploadOpen, setIsRestoreFromUploadOpen] = useState(false);
  const [selectedDatabaseForRestore, setSelectedDatabaseForRestore] = useState<string>('');
  const [isCreateDatabaseOpen, setIsCreateDatabaseOpen] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');

  const { data: databases, isLoading, isError } = useQuery<Database[]>({
    queryKey: ['databases'],
    queryFn: databaseApi.list
  });

  // Load uploaded backups
  const { data: uploadedBackupsData } = useQuery({
    queryKey: ['uploadedBackups'],
    queryFn: databaseApi.getUploadedBackups,
    enabled: isUploadDialogOpen || isRestoreFromUploadOpen
  });

  // Update uploaded backups when data changes
  useEffect(() => {
    if (uploadedBackupsData?.data) {
      setUploadedBackups(uploadedBackupsData.data);
    }
  }, [uploadedBackupsData]);

  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.bak')) {
      setSelectedFile(file);
    } else {
      toast.error('შეცდომა: მხოლოდ .bak ფაილების ატვირთვა შესაძლებელია');
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => databaseApi.uploadBackup(file, setUploadProgress),
    onMutate: () => {
      setIsUploading(true);
      setUploadProgress(0);
    },
    onSuccess: () => {
      toast.success('📤 ფაილი წარმატებით აიტვირთა!');
      setSelectedFile(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['uploadedBackups'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ფაილის ატვირთვისას: ' + message);
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  // Download backup mutation
  const downloadMutation = useMutation({
    mutationFn: databaseApi.downloadBackup,
    onSuccess: () => {
      toast.success('📥 ბექაპი წარმატებით ჩამოტვირთულია!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბექაპის ჩამოტვირთვისას: ' + message);
    }
  });

  // Restore from upload mutation
  const restoreFromUploadMutation = useMutation({
    mutationFn: ({ databaseName, filename }: { databaseName: string; filename: string }) =>
      databaseApi.restoreFromUpload(databaseName, filename),
    onSuccess: () => {
      toast.success('🔄 ბაზა წარმატებით აღდგა ატვირთული ფაილიდან!');
      setIsRestoreFromUploadOpen(false);
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბაზის აღდგენისას: ' + message);
    }
  });

  // Regular backup mutation
  const backupMutation = useMutation({
    mutationFn: databaseApi.backup,
    onSuccess: () => {
      toast.success('💾 ბექაპი წარმატებით შეიქმნა!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბექაპის შექმნისას: ' + message);
    }
  });

  // Regular restore mutation  
  const restoreMutation = useMutation({
    mutationFn: ({ name, backupPath }: { name: string; backupPath: string }) =>
      databaseApi.restore(name, backupPath),
    onSuccess: () => {
      toast.success('🔄 ბაზა წარმატებით აღდგა!');
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბაზის აღდგენისას: ' + message);
    }
  });

  // Delete database mutation
  const deleteMutation = useMutation({
    mutationFn: databaseApi.delete,
    onSuccess: () => {
      toast.success('🗑️ ბაზა წარმატებით წაიშალა!');
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბაზის წაშლისას: ' + message);
    }
  });

  // Create database mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => databaseApi.create(name),
    onSuccess: () => {
      toast.success('✅ ახალი ბაზა წარმატებით შეიქმნა!');
      setIsCreateDatabaseOpen(false);
      setNewDatabaseName('');
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('შეცდომა ბაზის შექმნისას: ' + message);
    }
  });

  // Handler functions
  const handleUploadBackup = () => {
    setIsUploadDialogOpen(true);
  };

  const handleDownloadBackup = (name: string) => {
    downloadMutation.mutate(name);
  };

  const handleRestoreFromUpload = (name: string) => {
    setSelectedDatabaseForRestore(name);
    setIsRestoreFromUploadOpen(true);
  };

  const handleFileUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleRestoreFromSelectedFile = (filename: string) => {
    if (selectedDatabaseForRestore) {
      restoreFromUploadMutation.mutate({
        databaseName: selectedDatabaseForRestore,
        filename
      });
    }
  };

  const handleBackup = (name: string) => {
    // For regular backup, we'll use a default server path
    backupMutation.mutate(name);
  };

  const handleRestore = (name: string) => {
    // For restore, we'll need to prompt for backup path
    const backupPath = prompt(`შეიყვანეთ ბექაპის ფაილის მისამართი ${name} ბაზისთვის:`);
    if (backupPath) {
      restoreMutation.mutate({ name, backupPath });
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`დარწმუნებული ხართ რომ გსურთ ${name} ბაზის წაშლა?`)) {
      deleteMutation.mutate(name);
    }
  };

  const handleCreateDatabase = () => {
    setIsCreateDatabaseOpen(true);
  };

  const handleCreateDatabaseSubmit = () => {
    if (newDatabaseName.trim()) {
      createMutation.mutate(newDatabaseName.trim());
    }
  };

  const safeDatabases = databases || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-muted-foreground text-xl">⏳ ბაზების ჩატვირთვა...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-500 text-xl">❌ შეცდომა ბაზების ჩატვირთვაში. სცადეთ ხელახლა.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ზედა ბარი ღილაკებით */}
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800">🗃️ Databases</h1>
        <div className="flex space-x-4">
          <Button 
            onClick={handleUploadBackup}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-xl font-bold shadow-xl border-4 border-blue-700 transform hover:scale-105 transition-all"
            size="lg"
          >
            <Cloud className="mr-3 h-6 w-6" />
            📤 UPLOAD BACKUP
          </Button>
          <Button 
            onClick={handleCreateDatabase}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-xl font-bold shadow-xl border-4 border-green-700 transform hover:scale-105 transition-all"
            size="lg"
          >
            <Plus className="mr-3 h-6 w-6" />
            ➕ CREATE DATABASE
          </Button>
        </div>
      </div>

      {/* ბაზების ცხრილი */}
      <Card className="border-4 border-gray-300 shadow-2xl">
        <Table className="text-lg">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-100 to-purple-100 border-b-4 border-gray-300">
              <TableHead className="font-bold text-xl text-gray-800 p-4">📋 Database Name</TableHead>
              <TableHead className="font-bold text-xl text-gray-800 p-4">📊 Size (MB)</TableHead>
              <TableHead className="font-bold text-xl text-gray-800 p-4">📅 Created</TableHead>
              <TableHead className="font-bold text-xl text-gray-800 p-4">⚡ Status</TableHead>
              <TableHead className="font-bold text-xl text-gray-800 text-center p-4 w-[400px]">🔧 ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeDatabases?.map((db: Database) => (
              <TableRow key={db.name} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border-b-2 border-gray-200">
                <TableCell className="font-bold text-xl p-4">{db.name}</TableCell>
                <TableCell className="text-lg p-4">{db.size_mb.toFixed(2)}</TableCell>
                <TableCell className="text-lg p-4">
                  {new Date(db.create_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="p-4">
                  <span className="bg-green-200 text-green-800 px-4 py-2 rounded-full text-lg font-bold border-2 border-green-400">
                    ✅ {db.state_desc}
                  </span>
                </TableCell>
                <TableCell className="p-4">
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBackup(db.name)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-2 border-blue-400 px-3 py-2 font-bold shadow-lg transform hover:scale-110 transition-all"
                      title="Create Backup"
                    >
                      <Download className="h-5 w-5 mr-1" />
                      💾
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadBackup(db.name)}
                      className="bg-green-100 hover:bg-green-200 text-green-800 border-4 border-green-500 px-4 py-2 font-black shadow-xl transform hover:scale-110 transition-all text-lg"
                      title="📥 Download Backup File"
                    >
                      <HardDrive className="h-5 w-5 mr-1" />
                      📥
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(db.name)}
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-2 border-yellow-400 px-3 py-2 font-bold shadow-lg transform hover:scale-110 transition-all"
                      title="Restore Database"
                    >
                      <Upload className="h-5 w-5 mr-1" />
                      🔄
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreFromUpload(db.name)}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-4 border-purple-500 px-4 py-2 font-black shadow-xl transform hover:scale-110 transition-all text-lg"
                      title="📤 Restore from Uploaded Backup"
                    >
                      <Cloud className="h-5 w-5 mr-1" />
                      📤
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(db.name)}
                      className="bg-red-100 hover:bg-red-200 text-red-800 border-2 border-red-400 px-3 py-2 font-bold shadow-lg transform hover:scale-110 transition-all"
                      title="Delete Database"
                    >
                      <Trash2 className="h-5 w-5 mr-1" />
                      🗑️
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ინფორმაციის ბოქსი */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 ხელმისაწვდომი ფუნქციები:</h2>
        <div className="grid grid-cols-2 gap-4 text-lg">
          <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-300">
            <strong>📤 Upload Backup:</strong> ბაზის ფაილების ატვირთვა კომპიუტერიდან
          </div>
          <div className="bg-green-100 p-4 rounded-lg border-2 border-green-300">
            <strong>📥 Download Backup:</strong> ბაზის ბექაპების ჩამოტვირთვა
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg border-2 border-yellow-300">
            <strong>🔄 Restore:</strong> ბაზის აღდგენა ფაილიდან
          </div>
          <div className="bg-purple-100 p-4 rounded-lg border-2 border-purple-300">
            <strong>📤 Restore from Upload:</strong> ატვირთული ფაილიდან აღდგენა
          </div>
        </div>
      </div>

      {/* Upload Backup Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">📤 Upload Backup File</DialogTitle>
            <DialogDescription>
              Select a .bak backup file to upload to the server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="backup-file" className="text-lg font-semibold">
                Select Backup File (.bak)
              </Label>
              <Input
                id="backup-file"
                type="file"
                accept=".bak"
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>
            
            {selectedFile && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="font-semibold">Selected file:</p>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleFileUpload}
                disabled={!selectedFile || isUploading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isUploading ? 'Uploading...' : '📤 Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore from Upload Dialog */}
      <Dialog open={isRestoreFromUploadOpen} onOpenChange={setIsRestoreFromUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              📤 Restore Database: {selectedDatabaseForRestore}
            </DialogTitle>
            <DialogDescription>
              Select an uploaded backup file to restore this database from
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {uploadedBackups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Cloud className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                <p>No uploaded backup files found</p>
                <p className="text-sm">Upload a backup file first using the &quot;📤 UPLOAD BACKUP&quot; button</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-lg font-semibold">Available Backup Files:</Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {uploadedBackups.map((backup, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{backup.filename}</p>
                        <p className="text-sm text-gray-600">
                          Size: {(backup.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <p className="text-sm text-gray-600">
                          Uploaded: {new Date(backup.uploadDate).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleRestoreFromSelectedFile(backup.filename)}
                        disabled={restoreFromUploadMutation.isPending}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        🔄 Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsRestoreFromUploadOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Database Dialog */}
      <Dialog open={isCreateDatabaseOpen} onOpenChange={setIsCreateDatabaseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">➕ Create New Database</DialogTitle>
            <DialogDescription>
              Enter a name for the new database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="database-name" className="text-lg font-semibold">
                Database Name
              </Label>
              <Input
                id="database-name"
                type="text"
                value={newDatabaseName}
                onChange={(e) => setNewDatabaseName(e.target.value)}
                placeholder="Enter database name..."
                className="mt-2"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDatabaseOpen(false);
                  setNewDatabaseName('');
                }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDatabaseSubmit}
                disabled={!newDatabaseName.trim() || createMutation.isPending}
                className="bg-green-500 hover:bg-green-600"
              >
                {createMutation.isPending ? 'Creating...' : '➕ Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
