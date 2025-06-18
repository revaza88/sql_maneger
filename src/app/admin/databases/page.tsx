/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/loading-spinner';
import { API_URL } from '@/lib/config';
import { toast } from 'sonner';
import { Trash2, Database, Download, Plus, Search, RefreshCw } from 'lucide-react';

interface DatabaseInfo {
  databaseName: string;
  userId: number;
  userEmail: string;
  size_mb: number;
  create_date: string | null;
  state_desc: string;
}

interface CreateDatabaseForm {
  databaseName: string;
  userId: string;
  collation?: string;
}

export default function AdminDatabasesPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDatabaseForm>({
    databaseName: '',
    userId: '',
    collation: ''
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Authorization check
  useEffect(() => {
    if (!token || !user || user.role?.toLowerCase() !== 'admin') {
      router.push('/admin/login');
      return;
    }
  }, [token, user, router]);
  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/admin/databases?page=${page}&limit=20&search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch databases');
      }

      const data = await response.json();
      setDatabases(data.data);
      setTotal(data.total);
    } catch (error) {
      toast.error('Failed to fetch databases');
      console.error('Error fetching databases:', error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const loadDatabases = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
          ...(searchTerm && { search: searchTerm })
        });

        const response = await fetch(`${API_URL}/admin/databases?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch databases');
        }        const data = await response.json();
        setDatabases(data.data || []);
        setTotal(data.total || 0);
      } catch (error) {
        toast.error('Failed to fetch databases');
        console.error('Error fetching databases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDatabases();
  }, [page, searchTerm, token]);

  const handleCreateDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.databaseName || !createForm.userId) {
      toast.error('Database name and user ID are required');
      return;
    }    try {
      setActionLoading('create');
      const response = await fetch(`${API_URL}/admin/databases`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          databaseName: createForm.databaseName,
          userId: parseInt(createForm.userId),
          collation: createForm.collation || undefined
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create database');
      }

      toast.success(data.message);
      setIsCreateDialogOpen(false);
      setCreateForm({ databaseName: '', userId: '', collation: '' });
      fetchDatabases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDatabase = async (databaseName: string) => {
    if (!confirm(`Are you sure you want to delete database "${databaseName}"? This action cannot be undone.`)) {
      return;
    }    try {
      setActionLoading(`delete-${databaseName}`);
      const response = await fetch(`${API_URL}/admin/databases/${encodeURIComponent(databaseName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete database');
      }

      toast.success(data.message);
      fetchDatabases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBackupDatabase = async (databaseName: string) => {    try {
      setActionLoading(`backup-${databaseName}`);
      const response = await fetch(`${API_URL}/admin/databases/${encodeURIComponent(databaseName)}/backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to backup database');
      }

      toast.success(`${data.message}\nBackup saved to: ${data.backupPath}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to backup database');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSize = (sizeInMb: number) => {
    if (sizeInMb < 1024) {
      return `${sizeInMb.toFixed(2)} MB`;
    }    return `${(sizeInMb / 1024).toFixed(2)} GB`;
  };

  // Show loading if user is not authenticated or not admin
  if (!token || !user || user.role?.toLowerCase() !== 'admin') {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Management</h1>
          <p className="text-muted-foreground">Manage all user databases across the system</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Database
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Database</DialogTitle>
              <DialogDescription>
                Create a new database for a specific user
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDatabase} className="space-y-4">
              <div>
                <Label htmlFor="databaseName">Database Name</Label>
                <Input
                  id="databaseName"
                  value={createForm.databaseName}
                  onChange={(e) => setCreateForm({ ...createForm, databaseName: e.target.value })}
                  placeholder="Enter database name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="number"
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div>
                <Label htmlFor="collation">Collation (Optional)</Label>
                <Input
                  id="collation"
                  value={createForm.collation}
                  onChange={(e) => setCreateForm({ ...createForm, collation: e.target.value })}
                  placeholder="e.g., SQL_Latin1_General_CP1_CI_AS"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={actionLoading === 'create'}>
                  {actionLoading === 'create' ? 'Creating...' : 'Create Database'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Databases</CardTitle>
              <CardDescription>
                Overview of all databases and their owners
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchDatabases} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search databases or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading databases...</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database Name</TableHead>
                    <TableHead>Owner Email</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databases.map((db) => (
                    <TableRow key={`${db.databaseName}-${db.userId}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Database className="mr-2 h-4 w-4" />
                          {db.databaseName}
                        </div>
                      </TableCell>
                      <TableCell>{db.userEmail}</TableCell>
                      <TableCell>{formatSize(db.size_mb)}</TableCell>
                      <TableCell>{formatDate(db.create_date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          db.state_desc === 'ONLINE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {db.state_desc}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBackupDatabase(db.databaseName)}
                            disabled={actionLoading === `backup-${db.databaseName}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDatabase(db.databaseName)}
                            disabled={actionLoading === `delete-${db.databaseName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {databases.length === 0 && (
                <div className="text-center p-8">
                  <Database className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No databases found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchTerm ? 'No databases match your search criteria.' : 'No databases have been created yet.'}
                  </p>
                </div>
              )}

              {databases.length > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {databases.length} of {total} databases
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={databases.length < 20}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
