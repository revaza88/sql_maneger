'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/auth-store';
import { api as backendApi } from '@/lib/api';
import { toast } from 'sonner';
import { Copy, Database, Server, User, Lock, Plus, Check, Loader2 } from 'lucide-react';

interface SQLServerCredentials {
  username: string;
  password: string;
  server: string;
  port: number;
}

export default function SQLServerPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [granting, setGranting] = useState(false);
  const [hasSQLServerUser, setHasSQLServerUser] = useState(false);
  const [credentials, setCredentials] = useState<SQLServerCredentials | null>(null);
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  const loadCredentials = async () => {
    try {
      const response = await backendApi.get('/sqlserver/credentials');
      
      if (response.status === 200) {
        const data = response.data;
        setCredentials(data);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      toast.error('Failed to load SQL Server credentials');
    }
  };

  const loadAvailableDatabases = async () => {
    try {
      const response = await backendApi.get('/sqlserver/databases');
      
      if (response.status === 200) {
        const data = response.data;
        setAvailableDatabases(data.databases || []);
      }
    } catch (error) {
      console.error('Error loading databases:', error);
      toast.error('Failed to load available databases');
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await backendApi.get('/sqlserver/check');
        
        if (response.status === 200) {
          const data = response.data;
          setHasSQLServerUser(data.hasSQLServerUser);
          
          if (data.hasSQLServerUser) {
            await loadCredentials();
          }
        }
      } catch (error) {
        console.error('Error checking SQL Server user:', error);
        toast.error('Failed to check SQL Server user status');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      checkUser();
      loadAvailableDatabases();
    }
  }, [token]);

  const createSQLServerUser = async () => {
    setCreating(true);
    try {
      const response = await backendApi.post('/sqlserver/create-user');

      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        setCredentials({
          username: data.username,
          password: data.password,
          server: '127.0.0.1',
          port: 1433
        });
        setHasSQLServerUser(true);
        toast.success('SQL Server user created successfully!');
      } else {
        toast.error(response.data?.message || 'Failed to create SQL Server user');
      }
    } catch (error: unknown) {
      console.error('Error creating SQL Server user:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to create SQL Server user';
      toast.error(errorMessage || 'Failed to create SQL Server user');
    } finally {
      setCreating(false);
    }
  };

  const grantDatabaseAccess = async () => {
    if (!selectedDatabase) {
      toast.error('Please select a database');
      return;
    }

    setGranting(true);
    try {
      const response = await backendApi.post('/sqlserver/grant-access', { 
        databaseName: selectedDatabase 
      });

      if (response.status === 200) {
        const data = response.data;
        toast.success(data.message);
        setSelectedDatabase('');
      } else {
        toast.error(response.data?.message || 'Failed to grant database access');
      }
    } catch (error: unknown) {
      console.error('Error granting database access:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Failed to grant database access';
      toast.error(errorMessage || 'Failed to grant database access');
    } finally {
      setGranting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Server className="h-6 w-6" />
        <h1 className="text-3xl font-bold">SQL Server Access</h1>
      </div>

      {!hasSQLServerUser ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Your SQL Server Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You don&apos;t have a SQL Server user account yet. Create one to access databases with your own credentials.
            </p>
            <Button 
              onClick={createSQLServerUser} 
              disabled={creating}
              className="flex items-center gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create SQL Server User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Your SQL Server Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {credentials && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Server</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={credentials.server} 
                        readOnly 
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credentials.server, 'Server')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Port</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={credentials.port.toString()} 
                        readOnly 
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credentials.port.toString(), 'Port')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={credentials.username} 
                        readOnly 
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credentials.username, 'Username')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={credentials.password} 
                        readOnly 
                        type="password"
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credentials.password, 'Password')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Connection Instructions:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use these credentials to connect to SQL Server from any SQL client</li>
                  <li>• You can only access databases that have been granted to your user</li>
                  <li>• Your access is isolated from other users</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Database Access Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Access Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Grant Access to Database</Label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">Select a database...</option>
                    {availableDatabases.map((db) => (
                      <option key={db} value={db}>
                        {db}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={grantDatabaseAccess}
                    disabled={granting || !selectedDatabase}
                    className="flex items-center gap-2"
                  >
                    {granting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Grant Access
                  </Button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Database Access:</h4>
                <p className="text-sm text-green-800">
                  Once you grant access to a database, you can connect to it using your SQL Server credentials above.
                  You will have full ownership permissions on any database you&apos;re granted access to.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
